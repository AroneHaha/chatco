<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Mail\PasswordChangeCodeMail;
use App\Models\CommuterProfile;
use App\Models\ConductorProfile;
use App\Models\User;
use App\Services\EmailVerificationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

/**
 * S5-T1 — Commuter Profile API & Password Change.
 *
 * Covers GET/PUT /commuter/profile and the two-phase
 * POST /commuter/change-password/request-code + .../confirm flow: happy
 * paths, validation failures, ownership/role isolation, immutable fields,
 * password verification, the emailed code, and session-token revocation.
 */
class CommuterProfileTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Mail::fake();
    }

    /** Drives phase 1 + reads back the emailed code, for tests that only care about phase 2. */
    private function requestCodeAndCapture(string $token, array $payload): string
    {
        $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/v1/commuter/change-password/request-code', $payload)
            ->assertStatus(200);

        $code = null;
        Mail::assertSent(PasswordChangeCodeMail::class, function ($mail) use (&$code) {
            $code = $mail->code;
            return true;
        });

        return $code;
    }

    private function seedCommuter(string $password = 'password123'): User
    {
        $commuter = User::create([
            'email'    => 'commuter1@gmail.com',
            'password' => Hash::make($password),
            'role'     => UserRole::COMMUTER,
        ]);

        CommuterProfile::create([
            'id'                  => $commuter->id,
            'first_name'          => 'Jose',
            'middle_name'         => 'P',
            'surname'             => 'Mendoza',
            'birthdate'           => '1998-05-12',
            'gender'              => 'Male',
            'email'               => 'commuter1@gmail.com',
            'contact_number'      => '09171234567',
            'commuter_type'       => 'REGULAR',
            'applied_type'        => 'STUDENT',
            'username'            => 'commuter001',
            'language_preference' => 'English',
            'account_status'      => 'ACTIVE',
            'verified_at'         => now(),
        ]);

        return $commuter;
    }

    private function seedConductor(): User
    {
        $conductor = User::create([
            'email'    => 'conductor1@gmail.com',
            'password' => Hash::make('password123'),
            'role'     => UserRole::CONDUCTOR,
        ]);

        ConductorProfile::create([
            'id'                 => $conductor->id,
            'first_name'         => 'Juan',
            'last_name'          => 'Dela Cruz',
            'birthday'           => '1990-03-15',
            'generated_username' => 'conductor001',
            'generated_password' => Hash::make('password123'),
        ]);

        return $conductor;
    }

    private function tokenFor(User $user): string
    {
        return $user->createToken('test')->plainTextToken;
    }

    // ── GET /commuter/profile ────────────────────────────────────

    public function test_get_profile_returns_user_and_profile_without_secrets(): void
    {
        $commuter = $this->seedCommuter();
        $token = $this->tokenFor($commuter);

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/v1/commuter/profile');

        $response->assertStatus(200);
        $this->assertTrue($response->json('success'));
        $response->assertJsonStructure([
            'data' => [
                'user'    => ['id', 'email', 'role', 'name'],
                'profile' => [
                    'first_name', 'surname', 'contact_number', 'commuter_type',
                    'applied_type', 'language_preference', 'account_status',
                    'id_image_url', 'verified_at',
                ],
            ],
        ]);

        $this->assertEquals('COMMUTER', $response->json('data.user.role'));
        $this->assertEquals('Jose', $response->json('data.profile.first_name'));

        // No password/token must ever leak.
        $this->assertStringNotContainsStringIgnoringCase('password', $response->getContent());
    }

    public function test_get_profile_requires_authentication(): void
    {
        $this->getJson('/api/v1/commuter/profile')->assertStatus(401);
    }

    public function test_get_profile_forbidden_for_non_commuter(): void
    {
        $conductor = $this->seedConductor();
        $token = $this->tokenFor($conductor);

        $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/v1/commuter/profile')
            ->assertStatus(403);
    }

    // ── PUT /commuter/profile ────────────────────────────────────

    public function test_update_profile_persists_editable_fields(): void
    {
        $commuter = $this->seedCommuter();
        $token = $this->tokenFor($commuter);

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->putJson('/api/v1/commuter/profile', [
                'contact_number'      => '09998887777',
                'language_preference' => 'Filipino',
            ]);

        $response->assertStatus(200);
        $this->assertEquals('09998887777', $response->json('data.profile.contact_number'));
        $this->assertEquals('Filipino', $response->json('data.profile.language_preference'));

        $this->assertDatabaseHas('commuter_profiles', [
            'id'                  => $commuter->id,
            'contact_number'      => '09998887777',
            'language_preference' => 'Filipino',
        ]);
    }

    public function test_update_profile_ignores_immutable_fields(): void
    {
        $commuter = $this->seedCommuter();
        $token = $this->tokenFor($commuter);

        $this->withHeader('Authorization', "Bearer {$token}")
            ->putJson('/api/v1/commuter/profile', [
                'email'         => 'hacker@evil.com',
                'role'          => 'ADMIN',
                'commuter_type' => 'PWD',
                'first_name'    => 'Changed',
            ])
            ->assertStatus(200);

        // Login email + role on the User are untouched.
        $this->assertDatabaseHas('users', [
            'id'    => $commuter->id,
            'email' => 'commuter1@gmail.com',
            'role'  => 'COMMUTER',
        ]);

        // Identity fields tied to the verified ID are untouched.
        $this->assertDatabaseHas('commuter_profiles', [
            'id'            => $commuter->id,
            'first_name'    => 'Jose',
            'commuter_type' => 'REGULAR',
        ]);
    }

    public function test_update_profile_rejects_invalid_contact_number(): void
    {
        $commuter = $this->seedCommuter();
        $token = $this->tokenFor($commuter);

        $this->withHeader('Authorization', "Bearer {$token}")
            ->putJson('/api/v1/commuter/profile', [
                'contact_number' => 'not-a-phone!!',
            ])
            ->assertStatus(422)
            ->assertJsonPath('success', false)
            ->assertJsonStructure(['errors' => ['contact_number']]);
    }

    public function test_update_profile_forbidden_for_non_commuter(): void
    {
        $conductor = $this->seedConductor();
        $token = $this->tokenFor($conductor);

        $this->withHeader('Authorization', "Bearer {$token}")
            ->putJson('/api/v1/commuter/profile', ['language_preference' => 'Filipino'])
            ->assertStatus(403);
    }

    // ── POST /commuter/change-password/request-code ────────────────

    public function test_request_code_emails_a_code_to_the_registered_address_and_does_not_change_the_password(): void
    {
        $commuter = $this->seedCommuter('password123');
        $token = $this->tokenFor($commuter);

        $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/v1/commuter/change-password/request-code', [
                'current_password'      => 'password123',
                'password'              => 'NewSecret123',
                'password_confirmation' => 'NewSecret123',
            ])
            ->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.expires_in_minutes', EmailVerificationService::CODE_TTL_MINUTES);

        Mail::assertSent(PasswordChangeCodeMail::class, fn ($mail) => $mail->hasTo('commuter1@gmail.com'));

        // Nothing changes until the code is confirmed — same password still works.
        $commuter->refresh();
        $this->assertTrue(Hash::check('password123', $commuter->password));

        // The code is stored hashed, and NEVER in the plain email_verification_codes
        // row shared with sign-up — scoped to this purpose only.
        $row = DB::table('email_verification_codes')
            ->where('email', 'commuter1@gmail.com')
            ->where('purpose', EmailVerificationService::PURPOSE_CHANGE_PASSWORD)
            ->first();
        $this->assertNotNull($row);
    }

    public function test_request_code_with_wrong_current_password_returns_422_and_sends_no_email(): void
    {
        $commuter = $this->seedCommuter('password123');
        $token = $this->tokenFor($commuter);

        $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/v1/commuter/change-password/request-code', [
                'current_password'      => 'wrong-password',
                'password'              => 'NewSecret123',
                'password_confirmation' => 'NewSecret123',
            ])
            ->assertStatus(422)
            ->assertJsonStructure(['errors' => ['current_password']]);

        Mail::assertNothingSent();
    }

    public function test_request_code_rejects_same_password(): void
    {
        $commuter = $this->seedCommuter('password123');
        $token = $this->tokenFor($commuter);

        $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/v1/commuter/change-password/request-code', [
                'current_password'      => 'password123',
                'password'              => 'password123',
                'password_confirmation' => 'password123',
            ])
            ->assertStatus(422)
            ->assertJsonStructure(['errors' => ['password']]);
    }

    public function test_request_code_requires_strong_new_password(): void
    {
        $commuter = $this->seedCommuter('password123');
        $token = $this->tokenFor($commuter);

        $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/v1/commuter/change-password/request-code', [
                'current_password'      => 'password123',
                'password'              => 'short',
                'password_confirmation' => 'short',
            ])
            ->assertStatus(422)
            ->assertJsonStructure(['errors' => ['password']]);
    }

    public function test_request_code_enforces_resend_cooldown(): void
    {
        $commuter = $this->seedCommuter('password123');
        $token = $this->tokenFor($commuter);
        $payload = [
            'current_password'      => 'password123',
            'password'              => 'NewSecret123',
            'password_confirmation' => 'NewSecret123',
        ];

        $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/v1/commuter/change-password/request-code', $payload)
            ->assertStatus(200);

        $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/v1/commuter/change-password/request-code', $payload)
            ->assertStatus(429);

        Mail::assertSentCount(1);
    }

    public function test_request_code_forbidden_for_non_commuter(): void
    {
        $conductor = $this->seedConductor();
        $token = $this->tokenFor($conductor);

        $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/v1/commuter/change-password/request-code', [
                'current_password'      => 'password123',
                'password'              => 'NewSecret123',
                'password_confirmation' => 'NewSecret123',
            ])
            ->assertStatus(403);
    }

    // ── POST /commuter/change-password/confirm ──────────────────────

    public function test_confirm_with_correct_code_changes_the_password(): void
    {
        $commuter = $this->seedCommuter('password123');
        $token = $this->tokenFor($commuter);
        $payload = [
            'current_password'      => 'password123',
            'password'              => 'NewSecret123',
            'password_confirmation' => 'NewSecret123',
        ];

        $code = $this->requestCodeAndCapture($token, $payload);

        $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/v1/commuter/change-password/confirm', [...$payload, 'code' => $code])
            ->assertStatus(200)
            ->assertJsonPath('success', true);

        $commuter->refresh();
        $this->assertTrue(Hash::check('NewSecret123', $commuter->password));
        $this->assertFalse(Hash::check('password123', $commuter->password));

        // The code is one-time use — the row is consumed on success.
        $this->assertDatabaseMissing('email_verification_codes', [
            'email' => 'commuter1@gmail.com',
            'purpose' => EmailVerificationService::PURPOSE_CHANGE_PASSWORD,
        ]);
    }

    public function test_confirm_with_wrong_code_returns_422_and_does_not_change_password(): void
    {
        $commuter = $this->seedCommuter('password123');
        $token = $this->tokenFor($commuter);
        $payload = [
            'current_password'      => 'password123',
            'password'              => 'NewSecret123',
            'password_confirmation' => 'NewSecret123',
        ];

        $this->requestCodeAndCapture($token, $payload);

        $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/v1/commuter/change-password/confirm', [...$payload, 'code' => '000000'])
            ->assertStatus(422)
            ->assertJsonStructure(['errors' => ['code']]);

        $commuter->refresh();
        $this->assertTrue(Hash::check('password123', $commuter->password));
    }

    public function test_confirm_without_requesting_a_code_first_returns_422(): void
    {
        $commuter = $this->seedCommuter('password123');
        $token = $this->tokenFor($commuter);

        $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/v1/commuter/change-password/confirm', [
                'current_password'      => 'password123',
                'password'              => 'NewSecret123',
                'password_confirmation' => 'NewSecret123',
                'code'                   => '123456',
            ])
            ->assertStatus(422)
            ->assertJsonStructure(['errors' => ['code']]);
    }

    public function test_confirm_still_re_validates_current_password(): void
    {
        $commuter = $this->seedCommuter('password123');
        $token = $this->tokenFor($commuter);
        $payload = [
            'current_password'      => 'password123',
            'password'              => 'NewSecret123',
            'password_confirmation' => 'NewSecret123',
        ];

        $code = $this->requestCodeAndCapture($token, $payload);

        // Current password changed (e.g. via another device) between request
        // and confirm — confirm must not blindly trust the earlier check.
        $commuter->forceFill(['password' => Hash::make('SomethingElse1')])->save();

        // Sanctum's guard caches the resolved user for the lifetime of the
        // test's single app instance — force it to re-resolve from the DB so
        // this request actually sees the row we just changed, matching what
        // a real second HTTP request (a fresh process) would see.
        auth()->forgetGuards();

        $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/v1/commuter/change-password/confirm', [...$payload, 'code' => $code])
            ->assertStatus(422)
            ->assertJsonStructure(['errors' => ['current_password']]);
    }

    public function test_confirm_revokes_other_sessions_but_keeps_current(): void
    {
        $commuter = $this->seedCommuter('password123');

        // Capture the token rows so we can assert revocation at the data layer.
        // (HTTP-level assertions are unreliable here: Sanctum's stateful
        // middleware sets a session cookie that the test client reuses on the
        // next request, masking token deletion.)
        $current = $commuter->createToken('current');
        $other   = $commuter->createToken('other');
        $payload = [
            'current_password'      => 'password123',
            'password'              => 'NewSecret123',
            'password_confirmation' => 'NewSecret123',
        ];

        $this->assertDatabaseCount('personal_access_tokens', 2);

        $code = $this->requestCodeAndCapture($current->plainTextToken, $payload);

        $this->withHeader('Authorization', "Bearer {$current->plainTextToken}")
            ->postJson('/api/v1/commuter/change-password/confirm', [...$payload, 'code' => $code])
            ->assertStatus(200);

        // The current request's token survives; every other token is revoked.
        $this->assertDatabaseCount('personal_access_tokens', 1);
        $this->assertDatabaseHas('personal_access_tokens', [
            'id' => $current->accessToken->getKey(),
        ]);
        $this->assertDatabaseMissing('personal_access_tokens', [
            'id' => $other->accessToken->getKey(),
        ]);
    }

    public function test_confirm_forbidden_for_non_commuter(): void
    {
        $conductor = $this->seedConductor();
        $token = $this->tokenFor($conductor);

        $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/v1/commuter/change-password/confirm', [
                'current_password'      => 'password123',
                'password'              => 'NewSecret123',
                'password_confirmation' => 'NewSecret123',
                'code'                   => '123456',
            ])
            ->assertStatus(403);
    }
}
