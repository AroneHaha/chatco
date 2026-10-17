<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Mail\OnsiteAccountCreatedMail;
use App\Mail\PasswordResetCodeMail;
use App\Models\AdminProfile;
use App\Models\CommuterProfile;
use App\Models\User;
use App\Rules\StrongPassword;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;
use Tests\TestCase;

/**
 * Onsite-created commuters start with a system-generated default password and
 * must replace it before any role-specific API responds. Covers:
 *   - the admin onsite store() creates an APPROVED, flagged account and emails
 *     the default password (never returned in the response)
 *   - login reports must_change_password and still issues a token
 *   - EnsurePasswordChanged blocks every route except set-new-password and logout
 *   - set-new-password validates policy, rejects the default password, revokes
 *     every session, and the flag gates a second attempt
 *   - accounts that are not flagged are unaffected
 *   - an email-code password reset also satisfies the first-time change
 */
class FirstTimePasswordSetupTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = User::create([
            'email' => 'admin@chatco.test',
            'password' => Hash::make('password123'),
            'role' => UserRole::ADMIN,
        ]);
        AdminProfile::create(['id' => $this->admin->id, 'first_name' => 'Site', 'last_name' => 'Admin']);
    }

    // ── Onsite creation ─────────────────────────────────────

    public function test_onsite_store_creates_an_approved_flagged_account_and_emails_the_default_password(): void
    {
        Storage::fake('public');
        Mail::fake();

        $response = $this->actingAs($this->admin)->post('/api/v1/admin/registrations', $this->onsitePayload(), ['Accept' => 'application/json']);

        $response->assertStatus(201)
            ->assertJsonPath('data.account_status', 'APPROVED')
            ->assertJsonPath('data.must_change_password', true)
            ->assertJsonPath('data.email_sent', true)
            ->assertJsonMissingPath('data.password');

        $user = User::where('email', 'onsite.first@example.com')->firstOrFail();
        $this->assertTrue($user->must_change_password);
        $this->assertSame('APPROVED', $user->commuterProfile->account_status);
        $this->assertNotNull($user->commuterProfile->verified_at);

        Mail::assertSent(OnsiteAccountCreatedMail::class, function (OnsiteAccountCreatedMail $mail) use ($user) {
            // The mailed password is the one the account was created with,
            // and it satisfies the same policy as a user-chosen password.
            return $mail->hasTo($user->email)
                && Hash::check($mail->defaultPassword, $user->password)
                && Validator::make(['p' => $mail->defaultPassword], ['p' => [new StrongPassword]])->passes();
        });
    }

    public function test_onsite_store_still_creates_the_account_when_the_email_cannot_be_sent(): void
    {
        Storage::fake('public');
        Mail::shouldReceive('to')->andThrow(new \RuntimeException('SMTP down'));

        $this->actingAs($this->admin)->post('/api/v1/admin/registrations', $this->onsitePayload(), ['Accept' => 'application/json'])
            ->assertStatus(201)
            ->assertJsonPath('data.email_sent', false);

        $this->assertDatabaseHas('users', ['email' => 'onsite.first@example.com', 'must_change_password' => true]);
    }

    // ── Login ───────────────────────────────────────────────

    public function test_login_with_the_default_password_reports_the_pending_change_and_issues_a_token(): void
    {
        $user = $this->seedFlaggedCommuter('Default123!');

        $this->postJson('/api/v1/auth/login', ['login' => $user->email, 'password' => 'Default123!'])
            ->assertStatus(200)
            ->assertJsonPath('data.must_change_password', true)
            ->assertJsonMissingPath('data.password')
            ->assertJsonStructure(['data' => ['token']]);
    }

    public function test_login_by_username_reports_the_pending_change(): void
    {
        $this->seedFlaggedCommuter('Default123!', 'flagged.name');

        $this->postJson('/api/v1/auth/login', ['login' => 'flagged.name', 'password' => 'Default123!'])
            ->assertStatus(200)
            ->assertJsonPath('data.must_change_password', true);
    }

    // ── Backend gate ────────────────────────────────────────

    public function test_flagged_token_is_blocked_from_role_endpoints_and_the_user_route(): void
    {
        $this->seedFlaggedCommuter('Default123!');
        $token = $this->loginToken('flagged@example.com', 'Default123!');

        $this->asToken($token)->getJson('/api/v1/commuter/profile')
            ->assertStatus(403)
            ->assertJsonPath('code', 'PASSWORD_CHANGE_REQUIRED');

        $this->asToken($token)->getJson('/api/v1/user')
            ->assertStatus(403)
            ->assertJsonPath('code', 'PASSWORD_CHANGE_REQUIRED');

        $this->asToken($token)->getJson('/api/v1/commuter/trips')
            ->assertStatus(403);
    }

    public function test_flagged_token_can_sign_out(): void
    {
        $this->seedFlaggedCommuter('Default123!');
        $token = $this->loginToken('flagged@example.com', 'Default123!');

        $this->asToken($token)->postJson('/api/v1/auth/logout')->assertStatus(200);
        $this->assertSame(0, $this->tokenCount('flagged@example.com'));
    }

    public function test_unflagged_commuter_is_not_affected(): void
    {
        $user = $this->seedCommuter('ready@example.com', 'ready.user', 'SecretPass123', mustChange: false);

        $this->postJson('/api/v1/auth/login', ['login' => $user->email, 'password' => 'SecretPass123'])
            ->assertStatus(200)
            ->assertJsonPath('data.must_change_password', false);

        $token = $this->loginToken($user->email, 'SecretPass123');
        $this->asToken($token)->getJson('/api/v1/commuter/profile')->assertStatus(200);
    }

    // ── Set New Password ────────────────────────────────────

    public function test_set_new_password_rejects_a_mismatched_confirmation(): void
    {
        $this->seedFlaggedCommuter('Default123!');
        $token = $this->loginToken('flagged@example.com', 'Default123!');

        $this->asToken($token)->postJson('/api/v1/auth/set-new-password', [
            'password' => 'MyNewPass1!',
            'password_confirmation' => 'Different1!',
        ])->assertStatus(422)->assertJsonValidationErrors(['password']);

        $this->assertTrue($this->flagFor('flagged@example.com'));
    }

    public function test_set_new_password_enforces_the_password_policy(): void
    {
        $this->seedFlaggedCommuter('Default123!');
        $token = $this->loginToken('flagged@example.com', 'Default123!');

        $this->asToken($token)->postJson('/api/v1/auth/set-new-password', [
            'password' => 'weakpass',
            'password_confirmation' => 'weakpass',
        ])->assertStatus(422)->assertJsonValidationErrors(['password']);

        $this->assertTrue($this->flagFor('flagged@example.com'));
    }

    public function test_set_new_password_rejects_reusing_the_default_password(): void
    {
        $this->seedFlaggedCommuter('Default123!');
        $token = $this->loginToken('flagged@example.com', 'Default123!');

        $this->asToken($token)->postJson('/api/v1/auth/set-new-password', [
            'password' => 'Default123!',
            'password_confirmation' => 'Default123!',
        ])->assertStatus(422)->assertJsonValidationErrors(['password']);

        $this->assertTrue($this->flagFor('flagged@example.com'));
    }

    public function test_set_new_password_activates_the_account_and_revokes_every_session(): void
    {
        $this->seedFlaggedCommuter('Default123!', 'flagged.name', 'flagged@example.com');
        $setupToken = $this->loginToken('flagged@example.com', 'Default123!');
        // A second session on another device. Created directly: a plain login
        // without device_type revokes every existing token.
        User::where('email', 'flagged@example.com')->firstOrFail()->createToken('auth-token:MOBILE');

        $this->asToken($setupToken)->postJson('/api/v1/auth/set-new-password', [
            'password' => 'MyNewPass1!',
            'password_confirmation' => 'MyNewPass1!',
        ])->assertStatus(200);

        $this->assertFalse($this->flagFor('flagged@example.com'));
        $this->assertSame(0, $this->tokenCount('flagged@example.com'));

        // The setup token no longer works, even on the endpoint that issued it.
        $this->asToken($setupToken)->getJson('/api/v1/commuter/profile')->assertStatus(401);

        // The old default password is gone; the new one signs in with full access.
        $this->postJson('/api/v1/auth/login', ['login' => 'flagged@example.com', 'password' => 'Default123!'])
            ->assertStatus(401);

        $response = $this->postJson('/api/v1/auth/login', ['login' => 'flagged@example.com', 'password' => 'MyNewPass1!'])
            ->assertStatus(200)
            ->assertJsonPath('data.must_change_password', false);

        $this->asToken($response->json('data.token'))->getJson('/api/v1/commuter/profile')->assertStatus(200);
    }

    public function test_set_new_password_cannot_run_twice(): void
    {
        $this->seedFlaggedCommuter('Default123!', 'flagged.name', 'flagged@example.com');
        $token = $this->loginToken('flagged@example.com', 'Default123!');

        $this->asToken($token)->postJson('/api/v1/auth/set-new-password', [
            'password' => 'MyNewPass1!',
            'password_confirmation' => 'MyNewPass1!',
        ])->assertStatus(200);

        // Same token, already revoked, so the request is unauthenticated.
        $this->asToken($token)->postJson('/api/v1/auth/set-new-password', [
            'password' => 'AnotherPass2!',
            'password_confirmation' => 'AnotherPass2!',
        ])->assertStatus(401);

        // A fresh session for an activated account is refused by the setup endpoint.
        $fresh = $this->loginToken('flagged@example.com', 'MyNewPass1!');
        $this->asToken($fresh)->postJson('/api/v1/auth/set-new-password', [
            'password' => 'AnotherPass2!',
            'password_confirmation' => 'AnotherPass2!',
        ])->assertStatus(422)->assertJsonValidationErrors(['password']);

        $this->assertTrue(Hash::check('MyNewPass1!', User::where('email', 'flagged@example.com')->firstOrFail()->password));
    }

    public function test_an_email_code_password_reset_also_clears_the_pending_change(): void
    {
        $this->seedFlaggedCommuter('Default123!', 'flagged.name', 'flagged@example.com');
        Mail::fake();

        $this->postJson('/api/v1/auth/forgot-password', ['email' => 'flagged@example.com'])->assertStatus(200);
        Mail::assertSent(PasswordResetCodeMail::class);
        $code = Mail::sent(PasswordResetCodeMail::class)->first()->code;

        $this->postJson('/api/v1/auth/reset-password', [
            'email' => 'flagged@example.com',
            'code' => $code,
            'password' => 'ResetPass3!',
            'password_confirmation' => 'ResetPass3!',
        ])->assertStatus(200);

        $this->assertFalse($this->flagFor('flagged@example.com'));
    }

    // ── Helpers ─────────────────────────────────────────────

    /**
     * Authenticate the next requests as $token. Forgets the cached auth guards
     * first: the test client reuses one app instance across requests, so an
     * earlier request's resolved user would otherwise outlive its token, which
     * a real HTTP request never does.
     */
    private function asToken(string $token): static
    {
        $this->app['auth']->forgetGuards();

        return $this->withToken($token);
    }

    private function onsitePayload(): array
    {
        return [
            'first_name' => 'Onsite',
            'surname' => 'Commuter',
            'birthdate' => '1995-01-01',
            'email' => 'onsite.first@example.com',
            'contact_number' => '09171112224',
            'username' => 'onsite.first',
            'applied_type' => 'REGULAR',
            'id_image' => UploadedFile::fake()->image('id.jpg', 800, 600),
        ];
    }

    private function seedFlaggedCommuter(string $password, string $username = 'flagged.user', string $email = 'flagged@example.com'): User
    {
        return $this->seedCommuter($email, $username, $password, mustChange: true);
    }

    private function seedCommuter(string $email, string $username, string $password, bool $mustChange): User
    {
        $user = User::create([
            'email' => $email,
            'password' => Hash::make($password),
            'role' => UserRole::COMMUTER,
        ]);
        // Not mass-assignable on purpose (see User::$fillable), so set directly.
        $user->must_change_password = $mustChange;
        $user->save();

        CommuterProfile::create([
            'id' => $user->id,
            'first_name' => 'Flagged',
            'surname' => 'Commuter',
            'birthdate' => '1995-05-05',
            'gender' => 'Female',
            'email' => $email,
            'contact_number' => '09171234567',
            'commuter_type' => 'REGULAR',
            'applied_type' => 'REGULAR',
            'username' => $username,
            'language_preference' => 'English',
            'account_status' => 'APPROVED',
            'id_image_url' => 'ids/commuters/'.$user->id.'/sample',
            'verified_at' => now(),
            'rejection_reason' => null,
        ]);

        return $user;
    }

    private function loginToken(string $login, string $password): string
    {
        return $this->postJson('/api/v1/auth/login', ['login' => $login, 'password' => $password])
            ->assertStatus(200)
            ->json('data.token');
    }

    private function flagFor(string $email): bool
    {
        return (bool) User::where('email', $email)->firstOrFail()->must_change_password;
    }

    private function tokenCount(string $email): int
    {
        return User::where('email', $email)->firstOrFail()->tokens()->count();
    }
}
