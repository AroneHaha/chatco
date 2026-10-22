<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Mail\EmailChangeCodeMail;
use App\Mail\EmailChangedMail;
use App\Models\CommuterProfile;
use App\Models\User;
use App\Services\EmailVerificationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Mail\PendingMail;
use Illuminate\Routing\Middleware\ThrottleRequests;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class CommuterEmailChangeTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    private string $token;

    protected function setUp(): void
    {
        parent::setUp();
        Mail::fake();
        // Exercise durable budgets independently of the additional per-minute limiter.
        $this->withoutMiddleware(ThrottleRequests::class);
        $this->user = User::create(['email' => 'old@gmail.com', 'password' => 'CurrentPass1!', 'role' => UserRole::COMMUTER]);
        CommuterProfile::create([
            'id' => $this->user->id, 'first_name' => 'Jose', 'surname' => 'Mendoza',
            'birthdate' => '1998-05-12', 'gender' => 'Male', 'email' => $this->user->email,
            'contact_number' => '09171234567', 'commuter_type' => 'REGULAR',
            'username' => 'commuter001', 'account_status' => 'ACTIVE', 'language_preference' => 'English',
        ]);
        $this->token = $this->user->createToken('test')->plainTextToken;
    }

    private function postAction(string $action, array $data = [], ?string $token = null)
    {
        $this->app['auth']->forgetGuards();

        return $this->withHeader('Authorization', 'Bearer '.($token ?? $this->token))
            ->postJson('/api/v1/commuter/change-email/'.$action, $data);
    }

    private function start(): string
    {
        return $this->postAction('start')->assertOk()->json('data.flow.id');
    }

    private function own(string $id): void
    {
        $this->postAction('verify-identity', ['request_id' => $id, 'method' => 'password', 'current_password' => 'CurrentPass1!'])->assertOk()->assertJsonPath('data.flow.step', 'email');
    }

    private function sentCode(string $stage): string
    {
        return Mail::sent(EmailChangeCodeMail::class, fn ($mail) => $mail->stage === $stage)->last()->code;
    }

    private function sendNew(string $id, string $email = 'new@gmail.com'): string
    {
        $this->postAction('send-code', ['request_id' => $id, 'stage' => 'new', 'email' => $email])->assertOk();

        return $this->sentCode('new');
    }

    private function wrongCode(string $stage): string
    {
        return $this->sentCode($stage) === '000000' ? '111111' : '000000';
    }

    public function test_password_path_updates_both_emails_only_after_new_code_and_is_idempotent(): void
    {
        $otherToken = $this->user->createToken('other');
        DB::table('password_reset_tokens')->insert(['email' => 'old@gmail.com', 'token' => Hash::make('123456'), 'created_at' => now()]);
        $id = $this->start();
        $this->own($id);
        $code = $this->sendNew($id, ' NEW@gmail.com ');
        $this->assertSame('old@gmail.com', $this->user->fresh()->email);
        $this->postAction('confirm', ['request_id' => $id, 'code' => $code])->assertOk()->assertJsonPath('data.email', 'new@gmail.com');
        $this->assertSame('new@gmail.com', $this->user->fresh()->email);
        $this->assertSame('new@gmail.com', $this->user->commuterProfile->fresh()->email);
        $this->assertDatabaseMissing('personal_access_tokens', ['id' => $otherToken->accessToken->id]);
        $this->assertDatabaseMissing('password_reset_tokens', ['email' => 'old@gmail.com']);
        $this->assertDatabaseMissing('email_verification_codes', ['purpose' => 'change_email_new:'.$id]);
        Mail::assertQueued(EmailChangedMail::class, fn ($mail) => $mail->hasTo('old@gmail.com'));
        $this->postAction('confirm', ['request_id' => $id, 'code' => $code])->assertOk();
        Mail::assertQueued(EmailChangedMail::class, 1);
    }

    public function test_old_email_code_is_an_alternative_to_password(): void
    {
        $id = $this->start();
        $this->postAction('send-code', ['request_id' => $id, 'stage' => 'old', 'email' => 'attacker@gmail.com'])->assertOk();
        Mail::assertSent(EmailChangeCodeMail::class, fn ($mail) => $mail->stage === 'old' && $mail->hasTo('old@gmail.com'));
        $this->postAction('verify-identity', ['request_id' => $id, 'method' => 'email', 'code' => $this->sentCode('old')])->assertOk();
        $code = $this->sendNew($id);
        $this->postAction('confirm', ['request_id' => $id, 'code' => $code])->assertOk();
    }

    public function test_cannot_skip_ownership_or_new_email_verification(): void
    {
        $id = $this->start();
        $this->postAction('send-code', ['request_id' => $id, 'stage' => 'new', 'email' => 'new@gmail.com'])->assertForbidden();
        $this->postAction('confirm', ['request_id' => $id, 'code' => '123456'])->assertForbidden();
        $this->own($id);
        $this->postAction('confirm', ['request_id' => $id, 'code' => '123456'])->assertForbidden();
        $this->assertSame('old@gmail.com', $this->user->fresh()->email);
    }

    public function test_incorrect_password_budget_survives_method_switches_and_sessions(): void
    {
        $id = $this->start();
        for ($i = 0; $i < 4; $i++) {
            $this->postAction('verify-identity', ['request_id' => $id, 'method' => 'password', 'current_password' => 'wrong'])->assertUnprocessable();
        }
        $this->postAction('verify-identity', ['request_id' => $id, 'method' => 'password', 'current_password' => 'wrong'])->assertStatus(429)->assertJsonPath('meta.reason', 'password_locked');
        $this->postAction('cancel', ['request_id' => $id])->assertOk();
        $this->token = $this->user->createToken('new-session')->plainTextToken;
        $id = $this->start();
        $this->postAction('verify-identity', ['request_id' => $id, 'method' => 'password', 'current_password' => 'CurrentPass1!'])->assertStatus(429);
        // A locked password option does not prohibit the independently verified inbox option.
        $this->postAction('send-code', ['request_id' => $id, 'stage' => 'old'])->assertOk();
        $this->postAction('verify-identity', ['request_id' => $id, 'method' => 'email', 'code' => $this->sentCode('old')])->assertOk();
    }

    public function test_password_lock_expires_after_fifteen_minutes(): void
    {
        $id = $this->start();
        for ($i = 0; $i < 5; $i++) {
            $this->postAction('verify-identity', ['request_id' => $id, 'method' => 'password', 'current_password' => 'wrong']);
        }
        $this->travel(15)->minutes();
        $this->own($id);
    }

    public function test_resend_cooldown_survives_cancelling_and_changing_sessions(): void
    {
        $id = $this->start();
        $this->postAction('send-code', ['request_id' => $id, 'stage' => 'old'])->assertOk();
        $this->postAction('send-code', ['request_id' => $id, 'stage' => 'old'])->assertStatus(429)->assertJsonPath('meta.reason', 'resend_cooldown');
        $this->postAction('cancel', ['request_id' => $id])->assertOk();
        $this->token = $this->user->createToken('new-session')->plainTextToken;
        $id = $this->start();
        $this->postAction('send-code', ['request_id' => $id, 'stage' => 'old'])->assertStatus(429);
        $this->travel(61)->seconds();
        $this->postAction('send-code', ['request_id' => $id, 'stage' => 'old'])->assertOk();
    }

    public function test_resending_does_not_reset_failed_code_budget(): void
    {
        $id = $this->start();
        $this->postAction('send-code', ['request_id' => $id, 'stage' => 'old'])->assertOk();
        for ($i = 0; $i < 3; $i++) {
            $this->postAction('verify-identity', ['request_id' => $id, 'method' => 'email', 'code' => $this->wrongCode('old')])->assertUnprocessable();
        }
        $this->travel(61)->seconds();
        $this->postAction('send-code', ['request_id' => $id, 'stage' => 'old'])->assertOk();
        $this->postAction('verify-identity', ['request_id' => $id, 'method' => 'email', 'code' => $this->wrongCode('old')])->assertUnprocessable();
        $this->postAction('verify-identity', ['request_id' => $id, 'method' => 'email', 'code' => $this->wrongCode('old')])->assertStatus(429)->assertJsonPath('meta.reason', 'code_locked');
        $this->travel(61)->seconds();
        $this->postAction('send-code', ['request_id' => $id, 'stage' => 'old'])->assertStatus(429);
    }

    public function test_hourly_send_cap_cannot_be_bypassed_by_resends(): void
    {
        $id = $this->start();
        for ($i = 0; $i < 5; $i++) {
            $this->postAction('send-code', ['request_id' => $id, 'stage' => 'old'])->assertOk();
            $this->travel(61)->seconds();
        }
        $this->postAction('send-code', ['request_id' => $id, 'stage' => 'old'])->assertStatus(429)->assertJsonPath('meta.reason', 'send_limit');
    }

    public function test_daily_limit_counts_cancelled_flows_and_third_flow_can_finish(): void
    {
        $this->travelTo(now()->startOfSecond());
        for ($i = 0; $i < 2; $i++) {
            $id = $this->start();
            $this->postAction('cancel', ['request_id' => $id])->assertOk();
        }
        $id = $this->start();
        $this->own($id);
        $this->postAction('confirm', ['request_id' => $id, 'code' => $this->sendNew($id)])->assertOk();
        $this->postAction('start')->assertStatus(429)->assertJsonPath('meta.retry_after', 86400);
        $this->travel(23)->hours();
        $this->postAction('start')->assertStatus(429);
        $this->travel(1)->hours();
        $this->postAction('start')->assertOk();
    }

    public function test_existing_flow_is_resumed_without_consuming_another_daily_attempt(): void
    {
        $id = $this->start();
        $this->postAction('start')->assertOk()->assertJsonPath('data.flow.id', $id)->assertJsonPath('data.attempts_left', 2);
        $this->app['auth']->forgetGuards();
        $this->withHeader('Authorization', 'Bearer '.$this->token)->getJson('/api/v1/commuter/change-email')->assertOk()->assertJsonPath('data.flow.id', $id);
    }

    public function test_other_session_cannot_use_ownership_proof_or_reset_daily_limit(): void
    {
        $id = $this->start();
        $other = $this->user->createToken('other')->plainTextToken;
        $this->postAction('verify-identity', ['request_id' => $id, 'method' => 'password', 'current_password' => 'CurrentPass1!'], $other)->assertNotFound();
        $this->postAction('start', [], $other)->assertStatus(409);
    }

    public function test_other_account_cannot_access_flow_or_share_new_address_codes(): void
    {
        $id = $this->start();
        $other = User::create(['email' => 'other@gmail.com', 'password' => 'CurrentPass1!', 'role' => UserRole::COMMUTER]);
        $profile = $this->user->commuterProfile->replicate();
        $profile->id = $other->id;
        $profile->email = $other->email;
        $profile->username = 'other-commuter';
        $profile->save();
        $otherToken = $other->createToken('other')->plainTextToken;
        $this->postAction('verify-identity', ['request_id' => $id, 'method' => 'password', 'current_password' => 'CurrentPass1!'], $otherToken)->assertNotFound();
        $this->own($id);
        $ownCode = $this->sendNew($id);
        $otherId = $this->postAction('start', [], $otherToken)->assertOk()->json('data.flow.id');
        $this->postAction('verify-identity', ['request_id' => $otherId, 'method' => 'password', 'current_password' => 'CurrentPass1!'], $otherToken)->assertOk();
        $this->postAction('send-code', ['request_id' => $otherId, 'stage' => 'new', 'email' => 'new@gmail.com'], $otherToken)->assertOk();
        $this->postAction('confirm', ['request_id' => $id, 'code' => $ownCode])->assertOk();
        $this->postAction('confirm', ['request_id' => $otherId, 'code' => $this->sentCode('new')], $otherToken)->assertUnprocessable();
    }

    public function test_duplicate_same_and_invalid_addresses_are_rejected(): void
    {
        User::create(['email' => 'taken@gmail.com', 'password' => 'Password1!', 'role' => UserRole::ADMIN]);
        $id = $this->start();
        $this->own($id);
        foreach (['taken@gmail.com', 'old@gmail.com', 'not-an-email'] as $email) {
            $this->postAction('send-code', ['request_id' => $id, 'stage' => 'new', 'email' => $email])->assertUnprocessable();
        }
        Mail::assertNothingSent();
    }

    public function test_duplicate_is_rechecked_at_confirmation(): void
    {
        $id = $this->start();
        $this->own($id);
        $code = $this->sendNew($id);
        User::create(['email' => 'new@gmail.com', 'password' => 'Password1!', 'role' => UserRole::ADMIN]);
        $this->postAction('confirm', ['request_id' => $id, 'code' => $code])->assertUnprocessable()->assertJsonPath('meta.reason', 'duplicate_email');
        $this->assertSame('old@gmail.com', $this->user->fresh()->email);
    }

    public function test_changed_target_invalidates_previous_code_without_resetting_budget(): void
    {
        $id = $this->start();
        $this->own($id);
        $previous = $this->sendNew($id);
        $this->postAction('confirm', ['request_id' => $id, 'code' => $this->wrongCode('new')])->assertUnprocessable();
        $this->travel(61)->seconds();
        $current = $this->sendNew($id, 'different@gmail.com');
        $this->assertDatabaseMissing('email_verification_codes', ['email' => 'new@gmail.com', 'purpose' => 'change_email_new:'.$id]);
        // Independently generated six-digit codes can coincidentally match.
        $this->postAction('confirm', ['request_id' => $id, 'code' => $previous === $current ? $this->wrongCode('new') : $previous])->assertUnprocessable();
        $this->assertDatabaseHas('commuter_email_change_requests', ['id' => $id, 'new_failures' => 2]);
    }

    public function test_expired_code_and_expired_ownership_do_not_change_email(): void
    {
        $id = $this->start();
        $this->postAction('send-code', ['request_id' => $id, 'stage' => 'old'])->assertOk();
        $code = $this->sentCode('old');
        $this->travel(16)->minutes();
        $this->postAction('verify-identity', ['request_id' => $id, 'method' => 'email', 'code' => $code])->assertUnprocessable()->assertJsonPath('meta.reason', 'code_expired');
        $this->own($id);
        $code = $this->sendNew($id);
        $this->travel(15)->minutes();
        $this->postAction('confirm', ['request_id' => $id, 'code' => $code])->assertStatus(410);
        $this->assertSame('old@gmail.com', $this->user->fresh()->email);
    }

    public function test_password_changed_elsewhere_invalidates_pending_proof(): void
    {
        $id = $this->start();
        $this->own($id);
        $code = $this->sendNew($id);
        $this->user->update(['password' => 'DifferentPassword1!']);
        $this->postAction('confirm', ['request_id' => $id, 'code' => $code])->assertStatus(410);
    }

    public function test_delivery_failure_does_not_advance_the_flow(): void
    {
        $id = $this->start();
        $this->own($id);
        $this->mock(EmailVerificationService::class, fn ($mock) => $mock->shouldReceive('sendCode')->once()->andThrow(new \RuntimeException('transport failed')));
        $this->postAction('send-code', ['request_id' => $id, 'stage' => 'new', 'email' => 'new@gmail.com'])->assertStatus(502);
        $this->assertDatabaseHas('commuter_email_change_requests', ['id' => $id, 'new_email' => null]);
        $this->assertSame('old@gmail.com', $this->user->fresh()->email);
    }

    public function test_new_code_attempt_limit_survives_resends_and_target_changes(): void
    {
        $id = $this->start();
        $this->own($id);
        $this->sendNew($id);
        for ($i = 0; $i < 3; $i++) {
            $this->postAction('confirm', ['request_id' => $id, 'code' => $this->wrongCode('new')])->assertUnprocessable();
        }
        $this->travel(61)->seconds();
        $this->sendNew($id, 'different@gmail.com');
        $this->postAction('confirm', ['request_id' => $id, 'code' => $this->wrongCode('new')])->assertUnprocessable();
        $this->postAction('confirm', ['request_id' => $id, 'code' => $this->wrongCode('new')])->assertStatus(429);
        $this->postAction('confirm', ['request_id' => $id, 'code' => $this->sentCode('new')])->assertStatus(429);
        $this->travel(61)->seconds();
        $this->postAction('send-code', ['request_id' => $id, 'stage' => 'new', 'email' => 'third@gmail.com'])->assertStatus(429);
        $this->assertSame('old@gmail.com', $this->user->fresh()->email);
    }

    public function test_failed_transport_restores_previous_code_and_keeps_account_cooldown(): void
    {
        $id = $this->start();
        $this->own($id);
        $previous = $this->sendNew($id);
        $this->travel(61)->seconds();
        $pending = \Mockery::mock(PendingMail::class);
        $pending->shouldReceive('send')->once()->andThrow(new \RuntimeException('transport failed'));
        Mail::shouldReceive('to')->once()->with('new@gmail.com')->andReturn($pending);
        $this->postAction('send-code', ['request_id' => $id, 'stage' => 'new', 'email' => 'new@gmail.com'])->assertStatus(502);
        $record = DB::table('email_verification_codes')->where('email', 'new@gmail.com')->where('purpose', 'change_email_new:'.$id)->first();
        $this->assertTrue(Hash::check($previous, $record->token));
        $this->assertDatabaseHas('commuter_email_change_limits', ['user_id' => $this->user->id, 'new_sends' => 2]);
        $this->app['auth']->forgetGuards();
        $this->withHeader('Authorization', 'Bearer '.$this->token)->getJson('/api/v1/commuter/change-email')->assertOk()->assertJsonPath('data.new_resend_in_seconds', 60);
    }

    public function test_notification_failure_does_not_roll_back_the_updated_email(): void
    {
        $id = $this->start();
        $this->own($id);
        $code = $this->sendNew($id);
        $pending = \Mockery::mock(PendingMail::class);
        $pending->shouldReceive('queue')->once()->andThrow(new \RuntimeException('queue unavailable'));
        Mail::shouldReceive('to')->once()->with('old@gmail.com')->andReturn($pending);
        $this->postAction('confirm', ['request_id' => $id, 'code' => $code])->assertOk();
        $this->assertSame('new@gmail.com', $this->user->fresh()->email);
        $this->assertDatabaseHas('commuter_email_change_requests', ['id' => $id, 'status' => 'completed']);
        $this->postAction('confirm', ['request_id' => $id, 'code' => $code])->assertOk();
    }

    public function test_duplicate_check_includes_soft_deleted_accounts(): void
    {
        $other = User::create(['email' => 'taken@gmail.com', 'password' => 'Password1!', 'role' => UserRole::ADMIN]);
        $other->delete();
        $id = $this->start();
        $this->own($id);
        $this->postAction('send-code', ['request_id' => $id, 'stage' => 'new', 'email' => 'TAKEN@gmail.com'])->assertUnprocessable()->assertJsonPath('meta.reason', 'duplicate_email');
    }

    public function test_per_minute_throttle_is_shared_across_actions_and_sessions(): void
    {
        Cache::flush();
        $this->withMiddleware(ThrottleRequests::class);
        $id = $this->start();
        for ($i = 0; $i < 5; $i++) {
            $this->postAction('start')->assertOk();
        }
        $other = $this->user->createToken('another-session')->plainTextToken;
        $this->postAction('cancel', ['request_id' => $id], $other)->assertStatus(429)->assertJsonPath('success', false);
    }

    public function test_email_templates_render_code_and_notification_content(): void
    {
        $old = (new EmailChangeCodeMail('123456', 15, 'old'))->render();
        $new = (new EmailChangeCodeMail('654321', 15, 'new'))->render();
        $notice = (new EmailChangedMail('new@gmail.com'))->render();
        $this->assertStringContainsString('Confirm it is you', $old);
        $this->assertStringContainsString('123456', $old);
        $this->assertStringContainsString('Verify your new email', $new);
        $this->assertStringContainsString('654321', $new);
        $this->assertStringContainsString('new@gmail.com', $notice);
    }

    public function test_unauthenticated_and_non_commuters_cannot_start(): void
    {
        $this->postAction('start', [], 'invalid-token')->assertUnauthorized();
        $admin = User::create(['email' => 'admin@gmail.com', 'password' => 'Password1!', 'role' => UserRole::ADMIN]);
        $this->postAction('start', [], $admin->createToken('admin')->plainTextToken)->assertForbidden();
    }
}
