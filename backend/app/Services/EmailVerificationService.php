<?php

namespace App\Services;

use App\Mail\EmailVerificationCodeMail;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

/**
 * Owns the "prove you own this inbox" step of commuter sign-up.
 *
 * The applicant enters their email at step 2 of the sign-up form, we mail a
 * 6-digit code, and they type it back at step 3. Only then does
 * AuthService::register accept the account — so a typo'd or someone else's
 * address can never reach an admin's approval queue, and the approval /
 * rejection emails are guaranteed to land somewhere the applicant can read.
 *
 * The verification row lives in email_verification_codes and outlives the
 * code itself: after a correct code, verified_at is stamped and the row stays
 * for VERIFIED_TTL_MINUTES so the applicant has time to finish the form. The
 * row is consumed when the account is created.
 */
class EmailVerificationService
{
    /** Table holding one pending/verified code per email address. */
    private const TABLE = 'email_verification_codes';

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
    public function secondsUntilResend(string $email): int
    {
        $record = $this->find($email);

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
    public function sendCode(string $email): void
    {
        $code = $this->generateCode();
        $previous = $this->find($email);

        DB::table(self::TABLE)->updateOrInsert(
            ['email' => $email],
            [
                'token'       => Hash::make($code),
                'attempts'    => 0,
                'verified_at' => null,
                'created_at'  => now(),
            ]
        );

        try {
            Mail::to($email)->send(
                new EmailVerificationCodeMail($code, self::CODE_TTL_MINUTES)
            );
        } catch (\Throwable $e) {
            // Undelivered code → undo the write. Leaving it would start a
            // resend cooldown against a code the applicant never received.
            if ($previous) {
                DB::table(self::TABLE)->where('email', $email)->update([
                    'token'       => $previous->token,
                    'attempts'    => $previous->attempts,
                    'verified_at' => $previous->verified_at,
                    'created_at'  => $previous->created_at,
                ]);
            } else {
                DB::table(self::TABLE)->where('email', $email)->delete();
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
    public function verifyCode(string $email, string $code): array
    {
        $record = $this->find($email);

        // One message for "wrong" and "never requested" so the endpoint can't
        // be used to work out which addresses have a code pending.
        $invalid = 'That code is incorrect or has expired. Please request a new one.';

        if (! $record) {
            return ['invalid', $invalid];
        }

        if (Carbon::parse($record->created_at)->addMinutes(self::CODE_TTL_MINUTES)->isPast()) {
            DB::table(self::TABLE)->where('email', $email)->delete();

            return ['expired', $invalid];
        }

        if (! Hash::check($code, $record->token)) {
            $attempts = (int) $record->attempts + 1;

            if ($attempts >= self::MAX_ATTEMPTS) {
                DB::table(self::TABLE)->where('email', $email)->delete();

                return ['locked', 'Too many incorrect attempts. Please request a new code.'];
            }

            DB::table(self::TABLE)->where('email', $email)->update(['attempts' => $attempts]);

            $remaining = self::MAX_ATTEMPTS - $attempts;

            return ['invalid', "That code is incorrect. You have {$remaining} " . Str::plural('attempt', $remaining) . ' left before you need a new code.'];
        }

        DB::table(self::TABLE)->where('email', $email)->update(['verified_at' => now()]);

        return ['valid', 'Email verified.'];
    }

    /** Whether this address has a verification that is still inside its window. */
    public function isVerified(string $email): bool
    {
        $record = $this->find($email);

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
    public function assertVerified(string $email): void
    {
        if ($this->isVerified($email)) {
            return;
        }

        throw ValidationException::withMessages([
            'email' => ['Please verify this email address before creating your account. Request a new code and enter it to continue.'],
        ]);
    }

    /** Burn the verification once the account it was for exists. */
    public function consume(string $email): void
    {
        DB::table(self::TABLE)->where('email', $email)->delete();
    }

    private function find(string $email): ?object
    {
        return DB::table(self::TABLE)->where('email', $email)->first();
    }

    /** A cryptographically-random, zero-padded 6-digit code (000000–999999). */
    private function generateCode(): string
    {
        return str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);
    }
}
