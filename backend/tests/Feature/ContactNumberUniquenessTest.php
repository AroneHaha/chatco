<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Models\AdminProfile;
use App\Models\CommuterProfile;
use App\Models\User;
use App\Rules\UniqueContactNumber;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

/**
 * A commuter contact number belongs to one live account: sign-up (send-code
 * and register), on-site registration, admin edits and commuter profile edits
 * all refuse a number another live commuter holds. Rejected/deleted accounts
 * (soft-deleted users) release theirs.
 */
class ContactNumberUniquenessTest extends TestCase
{
    use RefreshDatabase;

    private const TAKEN = '09171112222';

    private int $seq = 0;

    protected function setUp(): void
    {
        parent::setUp();
        Mail::fake();
    }

    private function makeCommuter(string $contact, string $status = 'ACTIVE'): User
    {
        $this->seq++;
        $user = User::create([
            'email' => "commuter{$this->seq}@example.com",
            'password' => Hash::make('password123'),
            'role' => UserRole::COMMUTER,
        ]);
        CommuterProfile::create([
            'id' => $user->id,
            'first_name' => 'Jose',
            'surname' => 'Mendoza',
            'birthdate' => '1998-05-12',
            'gender' => 'Male',
            'email' => $user->email,
            'contact_number' => $contact,
            'commuter_type' => 'REGULAR',
            'username' => "commuter{$this->seq}",
            'language_preference' => 'English',
            'account_status' => $status,
            'verified_at' => $status === 'PENDING' ? null : now(),
        ]);

        return $user;
    }

    private function adminHeaders(): array
    {
        $admin = User::create([
            'email' => 'admin@example.com',
            'password' => Hash::make('password123'),
            'role' => UserRole::ADMIN,
        ]);
        AdminProfile::create(['id' => $admin->id, 'first_name' => 'System', 'last_name' => 'Admin']);

        return ['Authorization' => 'Bearer '.$admin->createToken('test')->plainTextToken];
    }

    private function commuterHeaders(User $commuter): array
    {
        return ['Authorization' => 'Bearer '.$commuter->createToken('test')->plainTextToken];
    }

    // ── Sign-up ──────────────────────────────────────────────────

    public function test_send_code_rejects_a_number_held_by_a_live_account(): void
    {
        $this->makeCommuter(self::TAKEN);

        $this->postJson('/api/v1/auth/register/send-code', ['email' => 'new@example.com', 'contact_number' => self::TAKEN])
            ->assertStatus(422)
            ->assertJsonPath('errors.contact_number.0', UniqueContactNumber::MESSAGE);

        Mail::assertNothingSent();
    }

    public function test_pending_applicant_still_holds_their_number(): void
    {
        $this->makeCommuter(self::TAKEN, 'PENDING');

        $this->postJson('/api/v1/auth/register/send-code', ['email' => 'new@example.com', 'contact_number' => self::TAKEN])
            ->assertStatus(422)
            ->assertJsonValidationErrors('contact_number');
    }

    public function test_number_of_a_deleted_or_rejected_account_is_free_again(): void
    {
        $this->makeCommuter(self::TAKEN)->delete();

        $this->postJson('/api/v1/auth/register/send-code', ['email' => 'new@example.com', 'contact_number' => self::TAKEN])
            ->assertOk();
    }

    public function test_register_rejects_a_taken_number(): void
    {
        $this->makeCommuter(self::TAKEN);

        $this->post('/api/v1/auth/register', [
            'first_name' => 'Maria',
            'surname' => 'Santos',
            'birthdate' => '1995-08-20',
            'gender' => 'Female',
            'email' => 'maria@example.com',
            'contact_number' => self::TAKEN,
            'username' => 'maria.santos',
            'password' => 'SecurePass123!',
            'password_confirmation' => 'SecurePass123!',
            'applied_type' => 'REGULAR',
            'terms_accepted' => true,
            'privacy_acknowledged' => true,
            'registration_confirmed' => true,
            'terms_version' => config('registration.terms_version'),
            'privacy_version' => config('registration.privacy_version'),
            'id_image' => UploadedFile::fake()->image('valid_id.jpg', 800, 600),
        ], ['Accept' => 'application/json'])
            ->assertStatus(422)
            ->assertJsonPath('errors.contact_number.0', UniqueContactNumber::MESSAGE);

        $this->assertDatabaseMissing('users', ['email' => 'maria@example.com']);
    }

    public function test_onsite_registration_rejects_a_taken_number(): void
    {
        $this->makeCommuter(self::TAKEN);

        $this->withHeaders($this->adminHeaders())
            ->post('/api/v1/admin/registrations', [
                'first_name' => 'Maria',
                'surname' => 'Santos',
                'birthdate' => '1995-08-20',
                'email' => 'maria@example.com',
                'contact_number' => self::TAKEN,
                'username' => 'maria.santos',
                'applied_type' => 'REGULAR',
                'id_image' => UploadedFile::fake()->image('valid_id.jpg', 800, 600),
            ], ['Accept' => 'application/json'])
            ->assertStatus(422)
            ->assertJsonValidationErrors('contact_number');
    }

    // ── Admin edit ───────────────────────────────────────────────

    public function test_admin_cannot_give_a_commuter_another_commuters_number(): void
    {
        $this->makeCommuter(self::TAKEN);
        $target = $this->makeCommuter('09173334444');

        $this->withHeaders($this->adminHeaders())
            ->putJson("/api/v1/admin/users/{$target->id}", ['contact_number' => self::TAKEN])
            ->assertStatus(422)
            ->assertJsonPath('errors.contact_number.0', UniqueContactNumber::MESSAGE);

        $this->assertDatabaseHas('commuter_profiles', ['id' => $target->id, 'contact_number' => '09173334444']);
    }

    public function test_admin_can_save_a_new_unique_number(): void
    {
        $target = $this->makeCommuter('09173334444');

        $this->withHeaders($this->adminHeaders())
            ->putJson("/api/v1/admin/users/{$target->id}", ['contact_number' => '09175556666'])
            ->assertOk();

        $this->assertDatabaseHas('commuter_profiles', ['id' => $target->id, 'contact_number' => '09175556666']);
    }

    public function test_admin_edit_does_not_trip_over_an_older_duplicate(): void
    {
        // Duplicates created before the rule existed: re-saving the same
        // number must not block unrelated edits on either account.
        $this->makeCommuter(self::TAKEN);
        $target = $this->makeCommuter(self::TAKEN);

        $this->withHeaders($this->adminHeaders())
            ->putJson("/api/v1/admin/users/{$target->id}", ['first_name' => 'Josefa', 'contact_number' => self::TAKEN])
            ->assertOk();
    }

    // ── Commuter self-edit ───────────────────────────────────────

    public function test_commuter_cannot_switch_to_another_commuters_number(): void
    {
        $this->makeCommuter(self::TAKEN);
        $commuter = $this->makeCommuter('09173334444');

        $this->withHeaders($this->commuterHeaders($commuter))
            ->putJson('/api/v1/commuter/profile', ['contact_number' => self::TAKEN])
            ->assertStatus(422)
            ->assertJsonPath('errors.contact_number.0', UniqueContactNumber::MESSAGE);
    }

    public function test_commuter_can_keep_their_own_number(): void
    {
        $commuter = $this->makeCommuter(self::TAKEN);

        $this->withHeaders($this->commuterHeaders($commuter))
            ->putJson('/api/v1/commuter/profile', ['contact_number' => self::TAKEN, 'language_preference' => 'English'])
            ->assertOk();
    }
}
