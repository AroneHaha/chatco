<?php

namespace App\Services;

use App\Enums\ActivityLogCategory;
use App\Mail\EmailChangedMail;
use App\Models\User;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use Laravel\Sanctum\PersonalAccessToken;

class CommuterEmailChangeService
{
    public const MAX_CHANGES = 3;

    public const MAX_SENDS_PER_HOUR = 5;

    public const AUTHORIZATION_MINUTES = 15;

    private const REQUESTS = 'commuter_email_change_requests';

    private const LIMITS = 'commuter_email_change_limits';

    public function __construct(
        private EmailVerificationService $verification,
        private ActivityLogService $activityLog,
    ) {}

    // Serialize every operation on the account, including counters. Returning
    // expected errors (rather than throwing) commits failed-attempt budgets.
    private function locked(User $actor, callable $operation): array
    {
        return DB::transaction(function () use ($actor, $operation) {
            $user = User::whereKey($actor->id)->lockForUpdate()->first();
            if (! $user) {
                return $this->error('Your session has expired. Please sign in again.', 401);
            }
            if (! $user->commuterProfile) {
                return $this->error('Commuter profile not found.', 404);
            }
            DB::table(self::LIMITS)->insertOrIgnore(['user_id' => $user->id]);
            $limits = DB::table(self::LIMITS)->where('user_id', $user->id)->first();

            return $operation($user, $limits);
        });
    }

    public function state(User $actor, string $session): array
    {
        return $this->locked($actor, function ($user, $limits) use ($session) {
            $flow = $this->pending($user);
            if ($flow && ! hash_equals($flow->session_key, $session)) {
                return $this->error('An email change is already in progress in another session. Finish it there or wait for it to expire.', 409, 'other_session');
            }

            return $this->success($this->snapshot($user, $limits, $flow));
        });
    }

    public function start(User $actor, string $session): array
    {
        return $this->locked($actor, function ($user, $limits) use ($session) {
            $flow = $this->pending($user);
            if ($flow) {
                if (! hash_equals($flow->session_key, $session)) {
                    return $this->error('An email change is already in progress in another session. Finish it there or wait for it to expire.', 409, 'other_session');
                }

                return $this->success($this->snapshot($user, $limits, $flow));
            }
            if ($this->future($limits->blocked_until)) {
                return $this->wait('You have reached the email change limit. Try again after the 24-hour cooldown.', $limits->blocked_until, 'daily_limit');
            }
            if ($this->starts($user) >= self::MAX_CHANGES) {
                $until = now()->addDay();
                $this->updateLimits($user, ['blocked_until' => $until]);

                return $this->wait('You have reached the email change limit. Please wait 24 hours.', $until, 'daily_limit');
            }
            $id = (string) Str::uuid();
            DB::table(self::REQUESTS)->insert([
                'id' => $id, 'user_id' => $user->id, 'session_key' => $session,
                'credential_fingerprint' => hash('sha256', $user->password),
                'old_email' => $user->email, 'expires_at' => now()->addMinutes(30),
                'created_at' => now(), 'updated_at' => now(),
            ]);
            if ($this->starts($user) >= self::MAX_CHANGES) {
                $this->updateLimits($user, ['blocked_until' => now()->addDay()]);
            }

            return $this->success($this->freshSnapshot($user, $id));
        });
    }

    public function sendCode(User $actor, string $session, string $id, string $stage, ?string $email): array
    {
        return $this->locked($actor, function ($user, $limits) use ($session, $id, $stage, $email) {
            $flow = $this->flow($user, $session, $id);
            if (is_array($flow)) {
                return $flow;
            }
            if ($stage === 'old' && $flow->identity_verified_at) {
                return $this->error('Account ownership is already verified.', 409, 'wrong_step');
            }
            if ($stage === 'new' && ! $flow->identity_verified_at) {
                return $this->error('Verify account ownership before entering a new email.', 403, 'identity_required');
            }
            if ($flow->{"{$stage}_failures"} >= EmailVerificationService::MAX_ATTEMPTS) {
                return $this->error('Too many incorrect codes. Cancel this request and start again.', 429, 'code_locked', 'code');
            }
            $target = $stage === 'old' ? $user->email : Str::lower(trim($email ?? ''));
            if ($stage === 'new' && ($error = $this->checkEmail($user, $target))) {
                return $error;
            }

            $last = $limits->{"{$stage}_last_sent_at"};
            if ($last && Carbon::parse($last)->addSeconds(EmailVerificationService::RESEND_COOLDOWN_SECONDS)->isFuture()) {
                return $this->wait('Please wait before requesting another verification code.', Carbon::parse($last)->addSeconds(EmailVerificationService::RESEND_COOLDOWN_SECONDS), 'resend_cooldown');
            }
            $window = $limits->{"{$stage}_send_window_started_at"};
            $inWindow = $window && Carbon::parse($window)->addHour()->isFuture();
            $sends = $inWindow ? (int) $limits->{"{$stage}_sends"} : 0;
            if ($sends >= self::MAX_SENDS_PER_HOUR) {
                return $this->wait('Too many verification emails requested. Please try again later.', Carbon::parse($window)->addHour(), 'send_limit');
            }
            // Failed transport attempts also consume this budget; neither a
            // changed target nor a new flow can hammer the mail provider.
            $this->updateLimits($user, [
                "{$stage}_send_window_started_at" => $inWindow ? $window : now(),
                "{$stage}_sends" => $sends + 1, "{$stage}_last_sent_at" => now(),
            ]);
            try {
                $this->verification->sendCode($target, $this->purpose($flow, $stage), $stage);
            } catch (\Throwable $e) {
                Log::warning('Email-change code delivery failed', ['user_id' => $user->id, 'stage' => $stage, 'exception' => get_class($e)]);

                return $this->error('We could not send the code. Please wait a minute and try again.', 502, 'delivery_failed');
            }
            if ($stage === 'new') {
                if ($flow->new_email && $flow->new_email !== $target) {
                    $this->verification->consume($flow->new_email, $this->purpose($flow, 'new'));
                }
                $this->updateFlow($flow, ['new_email' => $target]);
            }

            return $this->success($this->freshSnapshot($user, $id), 'Verification code sent.');
        });
    }

    public function verifyIdentity(User $actor, string $session, string $id, string $method, ?string $password, ?string $code): array
    {
        return $this->locked($actor, function ($user, $limits) use ($session, $id, $method, $password, $code) {
            $flow = $this->flow($user, $session, $id);
            if (is_array($flow)) {
                return $flow;
            }
            if ($flow->identity_verified_at) {
                return $this->success($this->freshSnapshot($user, $id));
            }
            if ($method === 'password') {
                if ($this->future($limits->password_blocked_until)) {
                    return $this->wait('Too many incorrect passwords. Please try again later or verify using your current email.', $limits->password_blocked_until, 'password_locked');
                }
                if (! Hash::check($password ?? '', $user->password)) {
                    $window = $limits->password_window_started_at;
                    $inWindow = $window && Carbon::parse($window)->addMinutes(15)->isFuture();
                    $failures = ($inWindow ? (int) $limits->password_failures : 0) + 1;
                    $this->updateLimits($user, [
                        'password_window_started_at' => $inWindow ? $window : now(),
                        'password_failures' => $failures,
                        'password_blocked_until' => $failures >= 5 ? now()->addMinutes(15) : null,
                    ]);
                    if ($failures >= 5) {
                        return $this->wait('Too many incorrect passwords. Please wait 15 minutes or verify using your current email.', now()->addMinutes(15), 'password_locked');
                    }

                    return $this->error('Your current password is incorrect.', 422, 'wrong_password', 'current_password');
                }
                $this->updateLimits($user, ['password_failures' => 0, 'password_window_started_at' => null, 'password_blocked_until' => null]);
            } else {
                if ($error = $this->checkCode($flow, 'old', $flow->old_email, $code ?? '')) {
                    return $error;
                }
                $this->verification->consume($flow->old_email, $this->purpose($flow, 'old'));
            }
            $this->updateFlow($flow, [
                'identity_verified_at' => now(),
                'expires_at' => min(Carbon::parse($flow->expires_at), now()->addMinutes(self::AUTHORIZATION_MINUTES)),
            ]);

            return $this->success($this->freshSnapshot($user, $id), 'Account ownership verified.');
        });
    }

    public function confirm(User $actor, string $session, string $id, string $code): array
    {
        $notify = null;
        try {
            $result = $this->locked($actor, function ($user) use ($actor, $session, $id, $code, &$notify) {
                $flow = $this->flow($user, $session, $id, true);
                if (is_array($flow)) {
                    return $flow;
                }
                // A retried response after a network timeout is idempotent.
                if ($flow->status === 'completed') {
                    if ($user->email !== $flow->new_email) {
                        return $this->error('This request has already been completed.', 409, 'spent');
                    }

                    return $this->success(['email' => $user->email], 'Email updated successfully.');
                }
                if (! $flow->identity_verified_at || ! $flow->new_email) {
                    return $this->error('Complete account and new-email verification first.', 403, 'identity_required');
                }
                if ($error = $this->checkEmail($user, $flow->new_email)) {
                    return $error;
                }
                if ($error = $this->checkCode($flow, 'new', $flow->new_email, $code)) {
                    return $error;
                }

                $user->email = $flow->new_email;
                $user->remember_token = Str::random(60);
                $user->save();
                $user->commuterProfile->update(['email' => $flow->new_email]);
                DB::table('password_reset_tokens')->whereIn('email', [$flow->old_email, $flow->new_email])->delete();
                $this->verification->consume($flow->old_email, EmailVerificationService::PURPOSE_CHANGE_PASSWORD);
                $this->consume($flow);
                $this->updateFlow($flow, ['status' => 'completed']);
                $current = $actor->currentAccessToken();
                $tokens = $user->tokens();
                if ($current instanceof PersonalAccessToken) {
                    $tokens->whereKeyNot($current->getKey());
                }
                $tokens->delete();
                $notify = [$flow->old_email, $flow->new_email];

                return $this->success(['email' => $user->email], 'Email updated successfully.');
            });
        } catch (UniqueConstraintViolationException $e) {
            return $this->error('This email is already in use. Choose another address.', 422, 'duplicate_email', 'email');
        }
        if ($notify) {
            $this->activityLog->record(
                ActivityLogCategory::MEMBER,
                'Changed their sign-in email; signed out of other devices',
                $actor,
                [['field' => 'Email', 'from' => $notify[0], 'to' => $notify[1]]],
            );
        }
        // Notification delivery cannot roll back or misreport a committed change.
        if ($notify) {
            try {
                Mail::to($notify[0])->queue(new EmailChangedMail($notify[1]));
            } catch (\Throwable $e) {
                Log::warning('Email-change notification delivery failed', ['user_id' => $actor->id, 'exception' => get_class($e)]);
            }
        }

        return $result;
    }

    public function cancel(User $actor, string $session, string $id): array
    {
        return $this->locked($actor, function ($user) use ($session, $id) {
            $flow = DB::table(self::REQUESTS)->where('id', $id)->where('user_id', $user->id)->where('session_key', $session)->first();
            if (! $flow) {
                return $this->error('Email change request not found.', 404, 'missing');
            }
            if ($flow->status === 'pending') {
                $this->consume($flow);
                $this->updateFlow($flow, ['status' => 'cancelled']);
            }

            return $this->success(null, 'Email change cancelled.');
        });
    }

    private function flow(User $user, string $session, string $id, bool $allowCompleted = false): object|array
    {
        $flow = DB::table(self::REQUESTS)->where('id', $id)->where('user_id', $user->id)->where('session_key', $session)->first();
        if (! $flow) {
            return $this->error('Email change request not found. Start again.', 404, 'missing');
        }
        if ($allowCompleted && $flow->status === 'completed') {
            return $flow;
        }
        if ($flow->status !== 'pending') {
            return $this->error('This email change request is no longer active. Start again.', 410, 'expired');
        }
        if ($this->stale($user, $flow)) {
            $this->consume($flow);
            $this->updateFlow($flow, ['status' => 'expired']);

            return $this->error('Your verification has expired or your account details changed. Start again.', 410, 'expired');
        }

        return $flow;
    }

    private function pending(User $user): ?object
    {
        $flow = DB::table(self::REQUESTS)->where('user_id', $user->id)->where('status', 'pending')->first();
        if ($flow && $this->stale($user, $flow)) {
            $this->consume($flow);
            $this->updateFlow($flow, ['status' => 'expired']);

            return null;
        }

        return $flow;
    }

    private function stale(User $user, object $flow): bool
    {
        return Carbon::parse($flow->expires_at)->lte(now()) || $user->email !== $flow->old_email
            || ! hash_equals($flow->credential_fingerprint, hash('sha256', $user->password));
    }

    private function checkCode(object $flow, string $stage, string $email, string $code): ?array
    {
        $failures = (int) $flow->{"{$stage}_failures"};
        if ($failures >= EmailVerificationService::MAX_ATTEMPTS) {
            return $this->error('Too many incorrect codes. Cancel this request and start again.', 429, 'code_locked', 'code');
        }
        [$status, $message] = $this->verification->verifyCode($email, $code, $this->purpose($flow, $stage));
        if ($status === 'valid') {
            return null;
        }
        if ($status !== 'expired') {
            $failures++;
            $this->updateFlow($flow, ["{$stage}_failures" => $failures]);
            if ($failures >= EmailVerificationService::MAX_ATTEMPTS) {
                $this->verification->consume($email, $this->purpose($flow, $stage));

                return $this->error('Too many incorrect codes. Cancel this request and start again.', 429, 'code_locked', 'code');
            }
            $message = 'That code is incorrect. You have '.(EmailVerificationService::MAX_ATTEMPTS - $failures).' attempts left.';
        }

        return $this->error($message, 422, $status === 'expired' ? 'code_expired' : 'wrong_code', 'code');
    }

    private function checkEmail(User $user, string $email): ?array
    {
        if (Str::lower($user->email) === $email) {
            return $this->error('Enter a different email from your current address.', 422, 'same_email', 'email');
        }
        if (User::withTrashed()->whereRaw('LOWER(email) = ?', [$email])->whereKeyNot($user->id)->exists()) {
            return $this->error('This email is already in use. Choose another address.', 422, 'duplicate_email', 'email');
        }

        return null;
    }

    private function starts(User $user): int
    {
        return DB::table(self::REQUESTS)->where('user_id', $user->id)->where('created_at', '>', now()->subDay())->count();
    }

    private function purpose(object $flow, string $stage): string
    {
        return "change_email_{$stage}:{$flow->id}";
    }

    private function consume(object $flow): void
    {
        $this->verification->consume($flow->old_email, $this->purpose($flow, 'old'));
        if ($flow->new_email) {
            $this->verification->consume($flow->new_email, $this->purpose($flow, 'new'));
        }
    }

    private function updateFlow(object $flow, array $data): void
    {
        DB::table(self::REQUESTS)->where('id', $flow->id)->update([...$data, 'updated_at' => now()]);
    }

    private function updateLimits(User $user, array $data): void
    {
        DB::table(self::LIMITS)->where('user_id', $user->id)->update($data);
    }

    private function future(?string $date): bool
    {
        return $date && Carbon::parse($date)->isFuture();
    }

    private function freshSnapshot(User $user, string $id): array
    {
        return $this->snapshot($user, DB::table(self::LIMITS)->where('user_id', $user->id)->first(), DB::table(self::REQUESTS)->where('id', $id)->first());
    }

    private function snapshot(User $user, object $limits, ?object $flow): array
    {
        $payload = null;
        if ($flow) {
            $payload = [
                'id' => $flow->id, 'step' => ! $flow->identity_verified_at ? 'identity' : ($flow->new_email ? 'verify' : 'email'),
                'current_email' => $flow->old_email, 'new_email' => $flow->new_email,
                'expires_at' => Carbon::parse($flow->expires_at)->toIso8601String(),
                'old_attempts_left' => max(0, EmailVerificationService::MAX_ATTEMPTS - $flow->old_failures),
                'new_attempts_left' => max(0, EmailVerificationService::MAX_ATTEMPTS - $flow->new_failures),
            ];
            foreach (['old', 'new'] as $stage) {
                $address = $stage === 'old' ? $flow->old_email : $flow->new_email;
                $row = $address ? DB::table('email_verification_codes')->where('email', $address)->where('purpose', $this->purpose($flow, $stage))->first() : null;
                $payload["{$stage}_code_sent"] = (bool) $row;
                $payload["{$stage}_code_expires_at"] = $row ? min(Carbon::parse($row->created_at)->addMinutes(EmailVerificationService::CODE_TTL_MINUTES), Carbon::parse($flow->expires_at))->toIso8601String() : null;
            }
        }
        $result = ['flow' => $payload, 'attempts_left' => max(0, self::MAX_CHANGES - $this->starts($user)),
            'blocked_until' => $this->future($limits->blocked_until) ? Carbon::parse($limits->blocked_until)->toIso8601String() : null,
            'server_now' => now()->toIso8601String(),
            'password_retry_after' => $this->seconds($limits->password_blocked_until),
        ];
        foreach (['old', 'new'] as $stage) {
            $until = $limits->{"{$stage}_last_sent_at"} ? Carbon::parse($limits->{"{$stage}_last_sent_at"})->addSeconds(60) : null;
            $window = $limits->{"{$stage}_send_window_started_at"};
            if ($window && $limits->{"{$stage}_sends"} >= self::MAX_SENDS_PER_HOUR && Carbon::parse($window)->addHour()->isFuture()) {
                $until = Carbon::parse($window)->addHour();
            }
            $result["{$stage}_resend_in_seconds"] = $this->seconds($until);
        }

        return $result;
    }

    private function seconds(string|Carbon|null $date): int
    {
        return $date && Carbon::parse($date)->isFuture() ? (int) ceil(now()->diffInSeconds(Carbon::parse($date), absolute: true)) : 0;
    }

    private function success(mixed $data, string $message = 'Email change state retrieved.'): array
    {
        return ['status' => 200, 'success' => true, 'data' => $data, 'message' => $message, 'errors' => null, 'meta' => null];
    }

    private function error(string $message, int $status, string $reason = 'error', ?string $field = null): array
    {
        return ['status' => $status, 'success' => false, 'data' => null, 'message' => $message, 'errors' => $field ? [$field => [$message]] : null, 'meta' => ['reason' => $reason]];
    }

    private function wait(string $message, string|Carbon $until, string $reason): array
    {
        $result = $this->error($message, 429, $reason);
        $result['meta']['retry_after'] = $this->seconds($until);
        $result['meta']['retry_at'] = Carbon::parse($until)->toIso8601String();

        return $result;
    }
}
