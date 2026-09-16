<?php

namespace App\Services;

use App\Mail\EmailVerificationCodeMail;
use App\Mail\PasswordChangeCodeMail;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

/**
 * Owns the "prove you own this inbox" step for any email-gated action.
 *
 * Originally built for the sign-up flow: the applicant enters their email at
 * step 2 of the sign-up form, we mail a 6-digit code, and they type it back
 * at step 3. Only then does AuthService::register accept the account — so a
 * typo'd or someone else's address can never reach an admin's approval
 * queue, and the approval/rejection emails are guaranteed to land somewhere
 * the applicant can read.
 *
 * Now also backs the authenticated commuter change-password confirmation
 * (purpose PURPOSE_CHANGE_PASSWORD) — proving the requester still controls
 * the account's registered inbox, not just its session, before a password
 * takes effect.
 *
 * Every method takes a `purpose` so the same address can have an independent
 * pending code per purpose without one overwriting the other — see the
 * `purpose` column's migration docblock for why that matters.
 *
 * The verification row lives in email_verification_codes and outlives the
 * code itself: after a correct code, verified_at is stamped and the row stays
 * for VERIFIED_TTL_MINUTES so the caller has time to finish the flow. The row
 * is consumed once the purpose it was for is fulfilled.
 */
class EmailVerificationService
{
    /** Table holding one pending/verified code per (email, purpose) pair. */
    private const TABLE = 'email_verification_codes';

    /** Default purpose — sign-up email verification (pre-account). */
    public const PURPOSE_REGISTRATION = 'registration';

    /** Purpose — an already-authenticated commuter confirming a password change. */
    public const PURPOSE_CHANGE_PASSWORD = 'change_password';

    /** How long a freshly issued code stays usable, in minutes. */
    public const CODE_TTL_MINUTES = 15;

    /** Wrong guesses allowed before the code is burned. */
    public const MAX_ATTEMPTS = 5;

    /**
     * How long a successful verification stays good, in minutes. Generous
     * enough to finish the remaining form step, short enough that a verified
     * address can't be parked and reused days later.
     */
    public const VERIFIED_TTL_MINUTES = 60;

    /** Minimum gap between two code requests for the same address. */
    public const RESEND_COOLDOWN_SECONDS = 60;

    /**
     * Seconds the caller must still wait before another code may be sent.
     * Zero when they're free to request one.
     */
    public function secondsUntilResend(string $email, string $purpose = self::PURPOSE_REGISTRATION): int
    {
        $record = $this->find($email, $purpose);

        if (! $record || ! $record->created_at) {
            return 0;
        }

        $readyAt = Carbon::parse($record->created_at)->addSeconds(self::RESEND_COOLDOWN_SECONDS);

        return $readyAt->isFuture() ? (int) ceil(now()->diffInSeconds($readyAt, absolute: true)) : 0;
    }

    /**
     * Generate a code, store it hashed, and email it.
     *
     * Overwrites any pending code for this address and resets the attempt
     * counter — the newest code is always the only valid one.
     *
     * @throws \Throwable when the mail transport fails (the caller decides how
     *                    to surface it; the row is rolled back first so the
     *                    applicant isn't stuck behind a resend cooldown for a
     *                    code that never arrived).
     */
    public function sendCode(string $email, string $purpose = self::PURPOSE_REGISTRATION): void
    {
        $code = $this->generateCode();
        $previous = $this->find($email, $purpose);

        DB::table(self::TABLE)->updateOrInsert(
            ['email' => $email, 'purpose' => $purpose],
            [
                'token'       => Hash::make($code),
                'attempts'    => 0,
                'verified_at' => null,
                'created_at'  => now(),
            ]
        );

        $mailable = $purpose === self::PURPOSE_CHANGE_PASSWORD
            ? new PasswordChangeCodeMail($code, self::CODE_TTL_MINUTES)
            : new EmailVerificationCodeMail($code, self::CODE_TTL_MINUTES);

        try {
            Mail::to($email)->send($mailable);
        } catch (\Throwable $e) {
            // Undelivered code → undo the write. Leaving it would start a
            // resend cooldown against a code the applicant never received.
            if ($previous) {
                DB::table(self::TABLE)->where('email', $email)->where('purpose', $purpose)->update([
                    'token'       => $previous->token,
                    'attempts'    => $previous->attempts,
                    'verified_at' => $previous->verified_at,
                    'created_at'  => $previous->created_at,
                ]);
            } else {
                DB::table(self::TABLE)->where('email', $email)->where('purpose', $purpose)->delete();
            }

            throw $e;
        }
    }

    /**
     * Check a submitted code and, when it matches, stamp the address verified.
     *
     * Returns a [status, message] pair where status is one of:
     *   'valid'   — code matched; verified_at is now set
     *   'invalid' — no pending code, or wrong code (the attempt is counted)
     *   'expired' — the code passed its TTL
     *   'locked'  — too many wrong guesses; the code has been burned
     *
     * @return array{0: string, 1: string}
     */
    public function verifyCode(string $email, string $code, string $purpose = self::PURPOSE_REGISTRATION): array
    {
        $record = $this->find($email, $purpose);

        // One message for "wrong" and "never requested" so the endpoint can't
        // be used to work out which addresses have a code pending.
        $invalid = 'That code is incorrect or has expired. Please request a new one.';

        if (! $record) {
            return ['invalid', $invalid];
        }

        if (Carbon::parse($record->created_at)->addMinutes(self::CODE_TTL_MINUTES)->isPast()) {
            DB::table(self::TABLE)->where('email', $email)->where('purpose', $purpose)->delete();

            return ['expired', $invalid];
        }

        if (! Hash::check($code, $record->token)) {
            $attempts = (int) $record->attempts + 1;

            if ($attempts >= self::MAX_ATTEMPTS) {
                DB::table(self::TABLE)->where('email', $email)->where('purpose', $purpose)->delete();

                return ['locked', 'Too many incorrect attempts. Please request a new code.'];
            }

            DB::table(self::TABLE)->where('email', $email)->where('purpose', $purpose)->update(['attempts' => $attempts]);

            $remaining = self::MAX_ATTEMPTS - $attempts;

            return ['invalid', "That code is incorrect. You have {$remaining} " . Str::plural('attempt', $remaining) . ' left before you need a new code.'];
        }

        DB::table(self::TABLE)->where('email', $email)->where('purpose', $purpose)->update(['verified_at' => now()]);

        return ['valid', 'Email verified.'];
    }

    /** Whether this address has a verification that is still inside its window. */
    public function isVerified(string $email, string $purpose = self::PURPOSE_REGISTRATION): bool
    {
        $record = $this->find($email, $purpose);

        if (! $record || ! $record->verified_at) {
            return false;
        }

        return Carbon::parse($record->verified_at)
            ->addMinutes(self::VERIFIED_TTL_MINUTES)
            ->isFuture();
    }

    /**
     * Gate account creation on a live verification.
     *
     * Thrown as a validation error on the `email` key so the sign-up form can
     * point the applicant back at the step that owns it.
     *
     * @throws ValidationException
     */
    public function assertVerified(string $email, string $purpose = self::PURPOSE_REGISTRATION): void
    {
        if ($this->isVerified($email, $purpose)) {
            return;
        }

        throw ValidationException::withMessages([
            'email' => ['Please verify this email address before creating your account. Request a new code and enter it to continue.'],
        ]);
    }

    /** Burn the verification once the action it was for is fulfilled. */
    public function consume(string $email, string $purpose = self::PURPOSE_REGISTRATION): void
    {
        DB::table(self::TABLE)->where('email', $email)->where('purpose', $purpose)->delete();
    }

    private function find(string $email, string $purpose = self::PURPOSE_REGISTRATION): ?object
    {
        return DB::table(self::TABLE)->where('email', $email)->where('purpose', $purpose)->first();
    }

    /** A cryptographically-random, zero-padded 6-digit code (000000–999999). */
    private function generateCode(): string
    {
        return str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);
    }
}
