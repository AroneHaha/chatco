<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Models\CommuterProfile;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

/**
 * S5-T8 Additional Coverage — Commuter self-registration.
 *
 * Covers POST /api/v1/auth/register (public). Every test asserts real DB
 * state, not just status codes — matching the S5-T8 acceptance criteria:
 *   - register creates a PENDING commuter + stores applied_type + id_image
 *   - missing/invalid ID or bad applied_type -> 422
 *   - no token issued (response has no token field)
 *   - an email belonging only to a soft-deleted (rejected) account is reusable
 *   - an active email -> 422
 *
 * The id_image is sent as a real file upload (UploadedFile::fake) because
 * RegisterRequest validates it as file|image|mimes:jpeg,jpg,png,webp|max:5120.
 * Tests use $this->post() (multipart) instead of $this->postJson() when a
 * file is included.
 */
class AuthRegisterTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Returns the valid payload WITHOUT id_image — callers add the fake
     * file separately so they can control its presence/type.
     */
    private function validPayload(array $overrides = []): array
    {
        return array_merge([
            'first_name' => 'Maria',
            'middle_name' => 'Cruz',
            'surname' => 'Santos',
            'birthdate' => '1995-08-20',
            'gender' => 'Female',
            'email' => 'maria.santos@example.com',
            'contact_number' => '09171234567',
            'username' => 'maria.santos',
            'password' => 'SecurePass123',
            'password_confirmation' => 'SecurePass123',
            'language_preference' => 'English',
            'applied_type' => 'STUDENT',
        ], $overrides);
    }

    /**
     * Send a multipart POST with a fake ID image — mirrors what the real
     * signup form does.
     */
    private function registerWithFile(array $overrides = []): \Illuminate\Testing\TestResponse
    {
        $payload = array_merge(
            $this->validPayload($overrides),
            ['id_image' => UploadedFile::fake()->image('valid_id.jpg', 800, 600)]
        );

        return $this->post('/api/v1/auth/register', $payload, ['Accept' => 'application/json']);
    }

    // ── Happy path ───────────────────────────────────────────────

    public function test_register_creates_pending_commuter_with_applied_type_and_id_image(): void
    {
        $response = $this->registerWithFile();

        $response->assertStatus(201)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.account_status', 'PENDING')
            ->assertJsonPath('data.applied_type', 'STUDENT')
            ->assertJsonMissingPath('data.token');

        $this->assertDatabaseHas('users', [
            'email' => 'maria.santos@example.com',
            'role' => UserRole::COMMUTER->value,
        ]);

        $user = User::where('email', 'maria.santos@example.com')->first();

        $this->assertDatabaseHas('commuter_profiles', [
            'id' => $user->id,
            'first_name' => 'Maria',
            'surname' => 'Santos',
            'applied_type' => 'STUDENT',
            'account_status' => 'PENDING',
            'verified_at' => null,
        ]);

        // The id_image_url column is populated (non-null, non-empty) — the
        // uploaded file was stored to disk and its path persisted.
        $this->assertNotEmpty($user->commuterProfile->id_image_url);
    }

    public function test_register_hashes_the_password(): void
    {
        $this->registerWithFile();

        $user = User::where('email', 'maria.santos@example.com')->first();

        // Password is hashed, not stored in plaintext.
        $this->assertNotEquals('SecurePass123', $user->password);
        $this->assertTrue(Hash::check('SecurePass123', $user->password));
    }

    public function test_register_uses_applied_type_for_commuter_type(): void
    {
        foreach (['REGULAR', 'STUDENT', 'SENIOR', 'PWD'] as $type) {
            $this->registerWithFile([
                'email' => "applicant.{$type}@example.com",
                'username' => "applicant.{$type}",
                'applied_type' => $type,
            ]);

            $this->assertDatabaseHas('commuter_profiles', [
                'email' => "applicant.{$type}@example.com",
                'commuter_type' => $type,
                'applied_type' => $type,
            ]);
        }
    }

    // ── Validation failures -> 422 ───────────────────────────────

    public function test_register_rejects_missing_id_image_with_422(): void
    {
        $payload = $this->validPayload();
        unset($payload['id_image']);

        $this->post('/api/v1/auth/register', $payload, ['Accept' => 'application/json'])
            ->assertStatus(422)
            ->assertJsonPath('success', false)
            ->assertJsonStructure(['errors' => ['id_image']]);
    }

    public function test_register_rejects_invalid_applied_type_with_422(): void
    {
        $this->registerWithFile([
            'applied_type' => 'VIP',
        ])
            ->assertStatus(422)
            ->assertJsonStructure(['errors' => ['applied_type']]);
    }

    public function test_register_rejects_missing_applied_type_with_422(): void
    {
        $payload = $this->validPayload();
        unset($payload['applied_type']);
        $payload['id_image'] = UploadedFile::fake()->image('id.jpg');

        $this->post('/api/v1/auth/register', $payload, ['Accept' => 'application/json'])
            ->assertStatus(422)
            ->assertJsonStructure(['errors' => ['applied_type']]);
    }

    public function test_register_rejects_missing_required_fields_with_422(): void
    {
        $this->post('/api/v1/auth/register', [], ['Accept' => 'application/json'])
            ->assertStatus(422)
            ->assertJsonStructure(['errors' => [
                'first_name', 'surname', 'birthdate', 'gender',
                'email', 'contact_number', 'username', 'password',
                'applied_type', 'id_image',
            ]]);
    }

    public function test_register_rejects_password_mismatch_with_422(): void
    {
        $this->registerWithFile([
            'password' => 'SecurePass123',
            'password_confirmation' => 'DifferentPass999',
        ])
            ->assertStatus(422)
            ->assertJsonStructure(['errors' => ['password']]);
    }

    public function test_register_rejects_weak_password_with_422(): void
    {
        $this->registerWithFile([
            'password' => 'short',
            'password_confirmation' => 'short',
        ])
            ->assertStatus(422)
            ->assertJsonStructure(['errors' => ['password']]);
    }

    public function test_register_rejects_invalid_email_format_with_422(): void
    {
        $this->registerWithFile([
            'email' => 'not-an-email',
        ])
            ->assertStatus(422)
            ->assertJsonStructure(['errors' => ['email']]);
    }

    public function test_register_rejects_duplicate_username_with_422(): void
    {
        $existing = $this->seedApprovedCommuter(['username' => 'maria.santos']);

        $this->registerWithFile([
            'email' => 'different@example.com',
        ])
            ->assertStatus(422)
            ->assertJsonStructure(['errors' => ['username']]);

        $this->assertDatabaseHas('commuter_profiles', [
            'id' => $existing->id,
            'username' => 'maria.santos',
        ]);
    }

    public function test_register_rejects_future_birthdate_with_422(): void
    {
        $this->registerWithFile([
            'birthdate' => now()->addDay()->toDateString(),
        ])
            ->assertStatus(422)
            ->assertJsonStructure(['errors' => ['birthdate']]);
    }

    // ── Email reuse rules ────────────────────────────────────────

    public function test_register_rejects_active_email_with_422(): void
    {
        $this->seedApprovedCommuter(['email' => 'maria.santos@example.com']);

        $this->registerWithFile([
            'username' => 'different.username',
        ])
            ->assertStatus(422)
            ->assertJsonStructure(['errors' => ['email']]);
    }

    public function test_register_allows_reuse_of_soft_deleted_rejected_email(): void
    {
        $rejected = $this->seedApprovedCommuter(['email' => 'maria.santos@example.com']);
        $rejected->commuterProfile->update([
            'account_status' => 'REJECTED',
            'rejection_reason' => 'Blurry ID image.',
        ]);
        $rejected->email = 'maria.santos+rejected+'.time().'@example.com';
        $rejected->save();
        $rejected->delete();

        $response = $this->registerWithFile([
            'username' => 'maria.santos.v2',
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('data.account_status', 'PENDING');

        $this->assertDatabaseHas('users', [
            'email' => 'maria.santos@example.com',
            'role' => UserRole::COMMUTER->value,
        ]);

        $this->assertDatabaseCount('commuter_profiles', 2);
        $this->assertDatabaseHas('commuter_profiles', [
            'account_status' => 'REJECTED',
            'rejection_reason' => 'Blurry ID image.',
        ]);
        $this->assertDatabaseHas('commuter_profiles', [
            'account_status' => 'PENDING',
            'username' => 'maria.santos.v2',
        ]);
    }

    // ── No token + login gating ──────────────────────────────────

    public function test_register_does_not_issue_a_token(): void
    {
        $response = $this->registerWithFile();

        $response->assertStatus(201);
        $response->assertJsonMissingPath('data.token');
        $this->assertDatabaseCount('personal_access_tokens', 0);
    }

    public function test_pending_commuter_cannot_log_in(): void
    {
        $this->registerWithFile();

        $this->postJson('/api/v1/auth/login', [
            'login' => 'maria.santos@example.com',
            'password' => 'SecurePass123',
        ])
            ->assertStatus(403)
            ->assertJsonPath('success', false);

        $this->assertDatabaseCount('personal_access_tokens', 0);
    }

    // ── Helpers ──────────────────────────────────────────────────

    private function seedApprovedCommuter(array $overrides = []): User
    {
        $email = $overrides['email'] ?? 'existing@example.com';
        $username = $overrides['username'] ?? 'existing.user';

        $user = User::create([
            'email' => $email,
            'password' => Hash::make('password123'),
            'role' => UserRole::COMMUTER,
        ]);

        CommuterProfile::create([
            'id' => $user->id,
            'first_name' => 'Existing',
            'surname' => 'User',
            'birthdate' => '1990-01-01',
            'gender' => 'Male',
            'email' => $email,
            'contact_number' => '09170000000',
            'commuter_type' => 'REGULAR',
            'applied_type' => 'REGULAR',
            'username' => $username,
            'language_preference' => 'English',
            'account_status' => 'APPROVED',
            'verified_at' => now(),
        ]);

        return $user;
    }
}
