<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Mail\PasswordChangeCodeMail;
use App\Models\AdminProfile;
use App\Models\User;
use App\Services\EmailVerificationService;
use App\Services\PasswordChangeService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

/**
 * Settings > Profile & Security: the signed-in admin changes their own
 * password through POST /admin/account/change-password/request-code +
 * .../confirm — the same two-step emailed-code flow commuters use
 * (PasswordChangeController / PasswordChangeService, covered in depth by
 * CommuterProfileTest). These tests pin the admin wiring: it works for an
 * admin, it acts only on the caller's own account, and other roles can't
 * reach it.
 */
class AdminAccountPasswordTest extends TestCase
{
    use RefreshDatabase;

    private const REQUEST_CODE = '/api/v1/admin/account/change-password/request-code';
    private const CONFIRM = '/api/v1/admin/account/change-password/confirm';

    private array $payload = [
        'current_password'      => 'password123',
        'password'              => 'NewSecret@123',
        'password_confirmation' => 'NewSecret@123',
    ];

    protected function setUp(): void
    {
        parent::setUp();
        Mail::fake();
    }

    private function seedAdmin(string $email = 'admin@chatco.test'): User
    {
        $admin = User::create([
            'email'    => $email,
            'password' => Hash::make('password123'),
            'role'     => UserRole::ADMIN,
        ]);

        AdminProfile::create(['id' => $admin->id, 'first_name' => 'Marites', 'last_name' => 'Dizon']);

        return $admin;
    }

    private function tokenFor(User $user): string
    {
        return $user->createToken('test')->plainTextToken;
    }

    /** Drives phase 1 and reads back the emailed code. */
    private function requestCodeAndCapture(string $token): string
    {
        $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson(self::REQUEST_CODE, $this->payload)
            ->assertStatus(200)
            ->assertJsonPath('data.expires_in_minutes', EmailVerificationService::CODE_TTL_MINUTES);

        $code = null;
        Mail::assertSent(PasswordChangeCodeMail::class, function ($mail) use (&$code) {
            $code = $mail->code;
            return true;
        });

        return $code;
    }

    public function test_admin_changes_own_password_with_the_emailed_code(): void
    {
        $admin = $this->seedAdmin();
        $token = $this->tokenFor($admin);

        $code = $this->requestCodeAndCapture($token);
        Mail::assertSent(PasswordChangeCodeMail::class, fn ($mail) => $mail->hasTo('admin@chatco.test'));

        // Nothing changes until the code is confirmed.
        $this->assertTrue(Hash::check('password123', $admin->fresh()->password));

        $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson(self::CONFIRM, [...$this->payload, 'code' => $code])
            ->assertStatus(200)
            ->assertJsonPath('success', true);

        $this->assertTrue(Hash::check('NewSecret@123', $admin->fresh()->password));
    }

    public function test_wrong_current_password_returns_422_and_sends_no_email(): void
    {
        $admin = $this->seedAdmin();

        $this->withHeader('Authorization', 'Bearer ' . $this->tokenFor($admin))
            ->postJson(self::REQUEST_CODE, [...$this->payload, 'current_password' => 'wrong-password'])
            ->assertStatus(422)
            ->assertJsonStructure(['errors' => ['current_password']]);

        Mail::assertNothingSent();
    }

    public function test_wrong_code_returns_422_and_keeps_the_password(): void
    {
        $admin = $this->seedAdmin();
        $token = $this->tokenFor($admin);
        $this->requestCodeAndCapture($token);

        $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson(self::CONFIRM, [...$this->payload, 'code' => '000000'])
            ->assertStatus(422)
            ->assertJsonStructure(['errors' => ['code']]);

        $this->assertTrue(Hash::check('password123', $admin->fresh()->password));
    }

    public function test_confirm_signs_out_every_session_of_the_admin_only(): void
    {
        $admin = $this->seedAdmin();
        $otherAdmin = $this->seedAdmin('second.admin@chatco.test');
        $token = $this->tokenFor($admin);
        $this->tokenFor($admin); // another device
        $this->tokenFor($otherAdmin);

        $code = $this->requestCodeAndCapture($token);

        $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson(self::CONFIRM, [...$this->payload, 'code' => $code])
            ->assertStatus(200);

        // Admins sign in again with the new password, so the current
        // session is revoked too; another admin's sessions are untouched.
        $this->assertSame(0, $admin->tokens()->count());
        $this->assertSame(1, $otherAdmin->tokens()->count());
        $this->assertTrue(Hash::check('password123', $otherAdmin->fresh()->password));
    }

    public function test_non_admins_cannot_use_the_admin_route(): void
    {
        $commuter = User::create([
            'email'    => 'rider@chatco.test',
            'password' => Hash::make('password123'),
            'role'     => UserRole::COMMUTER,
        ]);

        $this->withHeader('Authorization', 'Bearer ' . $this->tokenFor($commuter))
            ->postJson(self::REQUEST_CODE, $this->payload)
            ->assertStatus(403);

        Mail::assertNothingSent();
    }

    public function test_password_guessing_is_capped_at_six_requests_a_minute(): void
    {
        $admin = $this->seedAdmin();
        $token = $this->tokenFor($admin);
        $wrong = [...$this->payload, 'current_password' => 'wrong-password'];

        for ($i = 0; $i < 6; $i++) {
            $this->withHeader('Authorization', "Bearer {$token}")
                ->postJson(self::REQUEST_CODE, $wrong)
                ->assertStatus(422);
        }

        $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson(self::REQUEST_CODE, $wrong)
            ->assertStatus(429);
    }

    public function test_a_code_already_used_by_a_parallel_request_changes_nothing(): void
    {
        $admin = $this->seedAdmin();

        // verifyCode() passes, but another request burned the code first:
        // consume() reports nothing deleted. Nothing may change.
        $verification = $this->mock(EmailVerificationService::class);
        $verification->shouldReceive('verifyCode')->andReturn(['valid', 'Email verified.']);
        $verification->shouldReceive('consume')->andReturn(false);

        try {
            app(PasswordChangeService::class)->confirm($admin, 'password123', 'NewSecret@123', '123456');
            $this->fail('Expected the reused code to be refused.');
        } catch (ValidationException $e) {
            $this->assertArrayHasKey('code', $e->errors());
        }

        $this->assertTrue(Hash::check('password123', $admin->fresh()->password));
    }

    public function test_guests_are_rejected(): void
    {
        $this->postJson(self::REQUEST_CODE, $this->payload)->assertStatus(401);
    }
}
