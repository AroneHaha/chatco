<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Models\Announcement;
use App\Models\CommuterProfile;
use App\Models\DiscountApplication;
use App\Models\User;
use App\Services\PwdRenewalService;
use App\Services\StudentRenewalService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * PWD renewal: the discount lasts one month past the card's "Valid until"
 * date, the renewal window is that month, and everything else follows the
 * student renewal rules.
 */
class PwdRenewalTest extends TestCase
{
    use RefreshDatabase;

    private const URL = '/api/v1/commuter/pwd-renewal';

    protected function setUp(): void
    {
        parent::setUp();
        config(['registration.student_renewal_first_year' => 2027, 'registration.student_renewal_month' => 9]);
        Storage::fake('public');
        Storage::fake('r2_private');
        $this->at('2027-03-10 12:00:00');
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    private function at(string $time): void
    {
        Carbon::setTestNow(Carbon::parse($time, 'Asia/Manila'));
    }

    private function pwd(?string $validUntil = '2027-03-15', string $type = 'PWD'): User
    {
        $user = User::create(['email' => Str::uuid().'@test.com', 'password' => 'Password1!', 'role' => UserRole::COMMUTER]);
        CommuterProfile::create([
            'id' => $user->id, 'first_name' => 'Liza', 'surname' => 'Manalastas', 'birthdate' => '1991-08-04',
            'gender' => 'Female', 'email' => $user->email, 'contact_number' => '0917'.random_int(1000000, 9999999),
            'commuter_type' => $type, 'applied_type' => $type, 'username' => (string) Str::uuid(),
            'language_preference' => 'English', 'account_status' => 'APPROVED', 'verified_at' => now(),
            'pwd_valid_until' => $validUntil, 'id_image_url' => 'original-id.jpg',
        ]);

        return $user;
    }

    private function profile(User $user): CommuterProfile
    {
        return CommuterProfile::findOrFail($user->id);
    }

    private function submit(User $user, string $validUntil = '2030-03-15'): DiscountApplication
    {
        Sanctum::actingAs($user->fresh());
        $this->post(self::URL, ['valid_until' => $validUntil, 'document' => UploadedFile::fake()->image('pwd-id.jpg')], ['Accept' => 'application/json'])
            ->assertCreated()->assertJsonPath('data.status', 'PENDING');

        return DiscountApplication::where('commuter_id', $user->id)->where('request_type', 'RENEWAL')->latest('submitted_at')->firstOrFail();
    }

    private function review(DiscountApplication $application, string $decision, ?string $reason = null)
    {
        $admin = User::create(['email' => Str::uuid().'@test.com', 'password' => 'Password1!', 'role' => UserRole::ADMIN]);
        Sanctum::actingAs($admin);

        return $this->postJson('/api/v1/admin/discount-applications/'.$application->id.'/review', compact('decision', 'reason') + ['revision' => $application->fresh()->revision]);
    }

    private function state(User $user)
    {
        Sanctum::actingAs($user->fresh());

        return $this->getJson(self::URL)->assertOk();
    }

    public function test_discount_lasts_one_month_past_the_card_date_and_legacy_cards_never_lapse(): void
    {
        $pwd = $this->pwd('2027-03-15');
        $legacy = $this->pwd(null);
        $endOfMonth = $this->pwd('2027-01-31');

        $this->at('2027-04-15 23:59:00');
        $this->assertSame('PWD', $this->profile($pwd)->effectiveFareType());
        $this->at('2027-04-16 00:00:00');
        $this->assertSame('REGULAR', $this->profile($pwd)->effectiveFareType());
        $this->assertSame('PWD', $this->profile($legacy)->effectiveFareType());

        // No overflow: a January 31 card runs through February 28.
        $this->at('2027-02-28 23:59:00');
        $this->assertSame('PWD', $this->profile($endOfMonth)->effectiveFareType());
        $this->at('2027-03-01 00:00:00');
        $this->assertSame('REGULAR', $this->profile($endOfMonth)->effectiveFareType());

        // Legacy PWD accounts have nothing to renew.
        Sanctum::actingAs($legacy);
        $this->getJson(self::URL)->assertForbidden();
    }

    public function test_notice_starts_six_days_before_and_submission_opens_on_the_card_date(): void
    {
        $pwd = $this->pwd('2027-03-15');

        $this->at('2027-03-08 23:00:00');
        $this->state($pwd)->assertJsonPath('data.notice_active', false)->assertJsonPath('data.can_submit', false);

        $this->at('2027-03-09 08:00:00');
        $this->state($pwd)->assertJsonPath('data.notice_active', true)->assertJsonPath('data.can_submit', false)
            ->assertJsonPath('data.reminder_due', true)
            ->assertJsonPath('data.kind', 'PWD')
            ->assertJsonPath('data.valid_until', '2027-03-15')
            ->assertJsonPath('data.renewal_period', 'Mar 15 – Apr 15, 2027')
            ->assertJsonPath('data.deadline', Carbon::parse('2027-04-16 00:00:00', 'Asia/Manila')->toIso8601String());
        $this->post(self::URL, ['valid_until' => '2030-03-15', 'document' => UploadedFile::fake()->image('id.jpg')], ['Accept' => 'application/json'])
            ->assertStatus(409);

        $this->at('2027-03-15 00:00:00');
        $this->state($pwd)->assertJsonPath('data.can_submit', true)->assertJsonPath('data.status', 'NOT_RENEWED');
    }

    public function test_new_card_date_must_be_later_and_approval_moves_the_discount_to_it(): void
    {
        $pwd = $this->pwd('2027-03-15');
        User::create(['email' => Str::uuid().'@test.com', 'password' => 'Password1!', 'role' => UserRole::ADMIN]);
        $this->at('2027-03-20 10:00:00');
        Sanctum::actingAs($pwd);

        $this->post(self::URL, ['valid_until' => '2027-03-15', 'document' => UploadedFile::fake()->image('id.jpg')], ['Accept' => 'application/json'])
            ->assertStatus(422)->assertJsonValidationErrors('valid_until');
        $this->post(self::URL, ['valid_until' => '2030-03-15'], ['Accept' => 'application/json'])
            ->assertStatus(422)->assertJsonValidationErrors('document');

        $application = $this->submit($pwd);
        $this->assertSame('2030-03-15', $application->valid_until->toDateString());
        $this->assertNull($application->cycle_year);
        $this->assertTrue(Announcement::where('type', 'PWD_RENEWAL_NEW')->where('reference_id', $application->id)->exists());

        // A second submission while one is pending is refused.
        $this->post(self::URL, ['valid_until' => '2031-03-15', 'document' => UploadedFile::fake()->image('id.jpg')], ['Accept' => 'application/json'])
            ->assertStatus(409);

        $this->review($application, 'APPROVED')->assertOk();
        $profile = $this->profile($pwd);
        $this->assertSame('PWD', $profile->commuter_type);
        $this->assertSame('2030-03-15', $profile->pwd_valid_until->toDateString());
        $this->assertTrue(Announcement::where('user_id', $pwd->id)->where('type', 'PWD_RENEWAL_DONE')->where('title', 'PWD ID renewed')->exists());

        $this->state($pwd)->assertJsonPath('data.status', 'APPROVED')->assertJsonPath('data.notice_active', false)
            ->assertJsonPath('data.can_submit', false)->assertJsonPath('data.application.valid_until', '2030-03-15');

        // The new card gets a fresh window of its own.
        $this->at('2030-03-15 09:00:00');
        $this->state($pwd)->assertJsonPath('data.status', 'NOT_RENEWED')->assertJsonPath('data.can_submit', true)
            ->assertJsonPath('data.application', null);

        // PWD accounts are not students.
        $this->getJson('/api/v1/commuter/student-renewal')->assertForbidden();
    }

    public function test_correction_is_resubmitted_in_place_within_seven_days(): void
    {
        $pwd = $this->pwd('2027-03-15');
        $this->at('2027-03-20 10:00:00');
        $application = $this->submit($pwd);
        $this->review($application, 'NEEDS_CORRECTION', 'The date on the card cannot be read.')->assertOk();
        $this->assertTrue(Announcement::where('user_id', $pwd->id)->where('title', 'PWD renewal needs correction')->exists());

        $this->state($pwd)->assertJsonPath('data.status', 'NEEDS_CORRECTION')->assertJsonPath('data.can_submit', true)
            ->assertJsonPath('data.application.reason', 'The date on the card cannot be read.');

        $this->at('2027-03-25 10:00:00');
        $corrected = $this->submit($pwd, '2030-03-16');
        $this->assertSame($application->id, $corrected->id);
        $this->assertSame(2, $corrected->revision);
        $this->assertSame('2030-03-16', $corrected->valid_until->toDateString());
        $this->assertSame('2030-03-15', Carbon::parse($corrected->submission_history[0]['valid_until'])->toDateString());
        // A timely correction keeps the original submission time.
        $this->assertTrue($corrected->first_submitted_at->equalTo($application->first_submitted_at));
    }

    public function test_unrenewed_card_moves_to_regular_after_the_grace_month_and_can_renew_later(): void
    {
        $pwd = $this->pwd('2027-03-15');
        $student = $this->pwd(null, 'STUDENT');
        $this->profile($student)->update(['student_discount_expires_at' => '2027-10-01 00:00:00', 'pwd_valid_until' => null]);

        $this->at('2027-04-15 23:00:00');
        $this->assertSame([], app(PwdRenewalService::class)->process());
        $this->assertSame('PWD', $this->profile($pwd)->commuter_type);

        $this->at('2027-04-16 00:30:00');
        $this->assertSame([], app(PwdRenewalService::class)->process());
        $profile = $this->profile($pwd);
        $this->assertSame('REGULAR', $profile->commuter_type);
        $this->assertSame('PWD', $profile->applied_type);
        $this->assertTrue(Announcement::where('user_id', $pwd->id)->where('type', 'PWD_RENEWAL_DONE')->where('title', 'PWD discount expired')->exists());
        $this->assertSame('STUDENT', $this->profile($student)->commuter_type);

        // Running again changes nothing.
        app(PwdRenewalService::class)->process();
        $this->assertSame(1, Announcement::where('user_id', $pwd->id)->where('title', 'PWD discount expired')->count());

        // A former PWD can still renew; approval restores the discount.
        $this->state($pwd)->assertJsonPath('data.can_submit', true)->assertJsonPath('data.discount_eligible', false)
            ->assertJsonPath('data.can_switch_to_regular', false);
        $this->review($this->submit($pwd), 'APPROVED')->assertOk();
        $this->assertSame('PWD', $this->profile($pwd)->effectiveFareType());
    }

    public function test_on_time_submission_keeps_pwd_type_but_regular_fare_applies_until_approval(): void
    {
        $pwd = $this->pwd('2027-03-15');
        $this->at('2027-04-10 09:00:00');
        $application = $this->submit($pwd);

        $this->at('2027-04-16 00:30:00');
        app(PwdRenewalService::class)->process();
        $profile = $this->profile($pwd);
        $this->assertSame('PWD', $profile->commuter_type);
        $this->assertSame('REGULAR', $profile->effectiveFareType());

        $this->review($application, 'APPROVED')->assertOk();
        $this->assertSame('PWD', $this->profile($pwd)->effectiveFareType());
    }

    public function test_lapsed_correction_expires_and_the_account_becomes_regular(): void
    {
        $pwd = $this->pwd('2027-03-15');
        $this->at('2027-04-14 09:00:00');
        $application = $this->submit($pwd);
        $this->review($application, 'NEEDS_CORRECTION', 'Blurry photo.')->assertOk();

        // Still inside the seven-day correction window: protected.
        $this->at('2027-04-17 09:00:00');
        app(PwdRenewalService::class)->process();
        $this->assertSame('PWD', $this->profile($pwd)->commuter_type);

        $this->at('2027-04-22 09:00:00');
        app(PwdRenewalService::class)->process();
        $this->assertSame('EXPIRED', $application->fresh()->status);
        $this->assertSame('REGULAR', $this->profile($pwd)->commuter_type);
    }

    public function test_rejection_moves_to_regular_and_switching_to_regular_ends_eligibility(): void
    {
        $pwd = $this->pwd('2027-03-15');
        $this->at('2027-03-20 10:00:00');
        $this->review($this->submit($pwd), 'REJECTED', 'Not a PWD ID.')->assertOk();
        $profile = $this->profile($pwd);
        $this->assertSame(['REGULAR', 'PWD'], [$profile->commuter_type, $profile->applied_type]);
        $this->state($pwd)->assertJsonPath('data.status', 'REJECTED')->assertJsonPath('data.can_submit', true);

        $other = $this->pwd('2027-03-15');
        $pending = $this->submit($other);
        $this->postJson(self::URL.'/regular', ['confirmed' => true])->assertOk()->assertJsonPath('data.status', 'CANCELLED');
        $this->assertSame('CANCELLED', $pending->fresh()->status);
        $this->assertSame(['REGULAR', 'REGULAR'], [$this->profile($other)->commuter_type, $this->profile($other)->applied_type]);
        Sanctum::actingAs($other->fresh());
        $this->getJson(self::URL)->assertForbidden();
    }

    public function test_reminders_follow_each_card_without_duplicates_and_stop_after_submission(): void
    {
        $pwd = $this->pwd('2027-03-15');
        $later = $this->pwd('2027-06-01');
        $this->pwd(null);
        $count = fn (User $user) => Announcement::where('user_id', $user->id)->where('type', 'PWD_RENEWAL')->count();

        $this->at('2027-03-08 09:00:00');
        app(PwdRenewalService::class)->process();
        $this->assertSame(0, $count($pwd));

        $this->at('2027-03-09 09:00:00');
        app(PwdRenewalService::class)->process();
        app(PwdRenewalService::class)->process();
        $this->assertSame(1, $count($pwd));
        $this->assertTrue(Announcement::where('user_id', $pwd->id)->where('title', 'Renew your PWD ID by April 15')->exists());

        $this->at('2027-03-13 09:00:00');
        app(PwdRenewalService::class)->process();
        $this->assertSame(2, $count($pwd));

        // Read and deleted notices still count toward the slot.
        Announcement::where('user_id', $pwd->id)->delete();
        app(PwdRenewalService::class)->process();
        $this->assertSame(0, $count($pwd));
        $this->assertSame(2, Announcement::withTrashed()->where('user_id', $pwd->id)->where('type', 'PWD_RENEWAL')->count());

        $this->at('2027-03-16 09:00:00');
        $this->submit($pwd);
        $this->at('2027-03-22 09:00:00');
        app(PwdRenewalService::class)->process();
        $this->assertSame(2, Announcement::withTrashed()->where('user_id', $pwd->id)->where('type', 'PWD_RENEWAL')->count());
        $this->assertSame(0, $count($later));
    }

    public function test_reminder_pop_up_can_be_snoozed_or_dismissed_for_this_card(): void
    {
        $pwd = $this->pwd('2027-03-15');
        $this->at('2027-03-16 09:00:00');
        $this->state($pwd)->assertJsonPath('data.reminder_due', true);

        $this->postJson(self::URL.'/reminder', ['action' => 'snooze'])->assertOk()->assertJsonPath('data.reminder_due', false);
        $this->at('2027-03-17 10:00:00');
        $this->state($pwd)->assertJsonPath('data.reminder_due', true);

        $this->postJson(self::URL.'/reminder', ['action' => 'dismiss'])->assertOk()->assertJsonPath('data.reminder_due', false);
        $this->at('2027-03-30 10:00:00');
        $this->state($pwd)->assertJsonPath('data.reminder_due', false)->assertJsonPath('data.notice_active', true);
    }

    public function test_student_renewal_ignores_pwd_renewals_and_admin_queue_shows_card_dates(): void
    {
        $pwd = $this->pwd('2027-03-15');
        $this->at('2027-03-20 10:00:00');
        $application = $this->submit($pwd);

        $this->assertFalse(app(StudentRenewalService::class)->isForRenewal($this->profile($pwd)));
        $this->assertTrue(app(PwdRenewalService::class)->isForRenewal($this->profile($pwd)));
        $this->assertSame([], app(StudentRenewalService::class)->process());
        $this->assertSame('PENDING', $application->fresh()->status);

        $admin = User::create(['email' => Str::uuid().'@test.com', 'password' => 'Password1!', 'role' => UserRole::ADMIN]);
        Sanctum::actingAs($admin);
        $this->getJson('/api/v1/admin/discount-applications?request_type=RENEWAL&requested_type=PWD&id='.$application->id)->assertOk()
            ->assertJsonPath('data.data.0.valid_until', '2030-03-15')
            ->assertJsonPath('data.data.0.commuter.pwd_valid_until', '2027-03-15');
    }

    public function test_regular_commuter_applying_for_pwd_gives_the_card_date_applied_on_approval(): void
    {
        $regular = $this->pwd(null, 'REGULAR');
        Sanctum::actingAs($regular);
        $url = '/api/v1/commuter/discount-applications';
        $this->post($url, ['requested_type' => 'PWD', 'document' => UploadedFile::fake()->image('pwd.jpg')], ['Accept' => 'application/json'])
            ->assertStatus(422)->assertJsonValidationErrors('valid_until');
        $this->post($url, ['requested_type' => 'PWD', 'valid_until' => '2027-03-01', 'document' => UploadedFile::fake()->image('pwd.jpg')], ['Accept' => 'application/json'])
            ->assertStatus(422)->assertJsonValidationErrors('valid_until');
        $this->post($url, ['requested_type' => 'PWD', 'valid_until' => '2029-12-31', 'document' => UploadedFile::fake()->image('pwd.jpg')], ['Accept' => 'application/json'])
            ->assertCreated()->assertJsonPath('data.application.valid_until', '2029-12-31');

        $this->review(DiscountApplication::where('commuter_id', $regular->id)->firstOrFail(), 'APPROVED')->assertOk();
        $profile = $this->profile($regular);
        $this->assertSame(['PWD', '2029-12-31'], [$profile->commuter_type, $profile->pwd_valid_until->toDateString()]);
    }

    public function test_sign_up_and_onsite_registration_store_the_card_date(): void
    {
        $email = 'liza.pwd@example.com';
        DB::table('email_verification_codes')->insert(['email' => $email, 'token' => Hash::make('000000'), 'attempts' => 0, 'verified_at' => now(), 'created_at' => now()]);
        $payload = [
            'first_name' => 'Liza', 'surname' => 'Manalastas', 'birthdate' => '1991-08-04', 'gender' => 'Female',
            'email' => $email, 'contact_number' => '09178881234', 'username' => 'liza.pwd',
            'password' => 'SecurePass123!', 'password_confirmation' => 'SecurePass123!', 'applied_type' => 'PWD',
            'terms_accepted' => true, 'privacy_acknowledged' => true, 'registration_confirmed' => true,
            'terms_version' => config('registration.terms_version'), 'privacy_version' => config('registration.privacy_version'),
            'id_image' => UploadedFile::fake()->image('pwd.jpg'),
        ];
        $this->post('/api/v1/auth/register', $payload, ['Accept' => 'application/json'])->assertStatus(422)->assertJsonValidationErrors('valid_until');
        $this->post('/api/v1/auth/register', ['valid_until' => '2027-01-01', 'id_image' => UploadedFile::fake()->image('pwd.jpg')] + $payload, ['Accept' => 'application/json'])
            ->assertStatus(422)->assertJsonValidationErrors('valid_until');
        $this->post('/api/v1/auth/register', ['valid_until' => '2029-08-04', 'id_image' => UploadedFile::fake()->image('pwd.jpg')] + $payload, ['Accept' => 'application/json'])
            ->assertCreated();
        $this->assertSame('2029-08-04', CommuterProfile::where('email', $email)->firstOrFail()->pwd_valid_until->toDateString());

        $admin = User::create(['email' => Str::uuid().'@test.com', 'password' => 'Password1!', 'role' => UserRole::ADMIN]);
        $this->actingAs($admin)->getJson('/api/v1/admin/registrations')->assertOk()
            ->assertJsonPath('data.data.0.pwd_valid_until', '2029-08-04');

        $this->actingAs($admin)->post('/api/v1/admin/registrations', [
            'first_name' => 'Onsite', 'surname' => 'Pwd', 'birthdate' => '1980-01-01', 'gender' => 'Male',
            'email' => 'onsite.pwd@example.com', 'contact_number' => '09175554321', 'username' => 'onsite.pwd',
            'applied_type' => 'PWD', 'valid_until' => '2028-05-20', 'id_image' => UploadedFile::fake()->image('id.jpg', 800, 600),
        ], ['Accept' => 'application/json'])->assertCreated();
        $this->assertSame('2028-05-20', CommuterProfile::where('username', 'onsite.pwd')->firstOrFail()->pwd_valid_until->toDateString());
    }
}
