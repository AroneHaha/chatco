<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;
use Laravel\Sanctum\PersonalAccessToken;

/**
 * Two-step change-password for the signed-in account (commuter, admin):
 * verify the current password, email a 6-digit code to the account's own
 * address, then rotate the password and revoke the other sessions.
 *
 * Role-agnostic: every method works on the authenticated User handed in by
 * PasswordChangeController and never accepts a user id from the request.
 * Moved out of CommuterService unchanged when admins got the same flow.
 */
class PasswordChangeService
{
    public function __construct(
        private EmailVerificationService $emailVerification
    ) {}

    /**
     * Shared validation for both phases of change-password: current password
     * correct, new password actually different. Does NOT touch the record —
     * phase 1 only needs to know the request is legitimate before emailing a
     * code; phase 2 re-runs this because it's the request that takes effect.
     *
     * - Wrong current password               -> 422 (current_password)
     * - New password equals current password -> 422 (password)
     *
     * @throws ValidationException
     */
    private function assertPasswordChangeIsValid(User $user, string $currentPassword, string $newPassword): void
    {
        if (! Hash::check($currentPassword, $user->password)) {
            throw ValidationException::withMessages([
                'current_password' => ['The provided current password is incorrect.'],
            ]);
        }

        if (Hash::check($newPassword, $user->password)) {
            throw ValidationException::withMessages([
                'password' => ['The new password must be different from your current password.'],
            ]);
        }
    }

    /**
     * POST .../change-password/request-code — phase 1.
     *
     * Validates the request, then emails a 6-digit code to the account's OWN
     * registered address (read from $user, never accepted from the request)
     * so completing a password change can't rest on the session alone — the
     * requester also has to prove they still control the account's inbox.
     * The password is NOT changed yet.
     *
     * @throws ValidationException on a bad current/new password
     * @throws \Throwable when the mail transport fails
     */
    public function requestCode(User $user, string $currentPassword, string $newPassword): void
    {
        $this->assertPasswordChangeIsValid($user, $currentPassword, $newPassword);

        $this->emailVerification->sendCode($user->email, EmailVerificationService::PURPOSE_CHANGE_PASSWORD);
    }

    /**
     * POST .../change-password/confirm — phase 2.
     *
     * Re-validates current/new password (policy or the account could have
     * changed since phase 1 — this is the request that actually takes
     * effect) and the emailed code, then rotates the password exactly as the
     * old single-step flow did: re-hashed via the User 'hashed' cast, and all
     * OTHER access tokens revoked so any other logged-in session is
     * invalidated while the caller's current session stays valid.
     *
     * @throws ValidationException on a bad current/new password or code
     */
    public function confirm(User $user, string $currentPassword, string $newPassword, string $code): void
    {
        $this->assertPasswordChangeIsValid($user, $currentPassword, $newPassword);

        [$status, $message] = $this->emailVerification->verifyCode(
            $user->email,
            $code,
            EmailVerificationService::PURPOSE_CHANGE_PASSWORD
        );

        if ($status !== 'valid') {
            throw ValidationException::withMessages(['code' => [$message]]);
        }

        // Burn the code, rotate the password and end the other sessions as one
        // unit: a failure part-way can't leave a changed password with the old
        // sessions still signed in. verifyCode() stays outside the transaction
        // so a wrong guess is still counted when it throws.
        DB::transaction(function () use ($user, $newPassword) {
            // Single use under concurrency: only the request that actually
            // deletes the code may change the password.
            if (! $this->emailVerification->consume($user->email, EmailVerificationService::PURPOSE_CHANGE_PASSWORD)) {
                throw ValidationException::withMessages([
                    'code' => ['That code has already been used. Please request a new one.'],
                ]);
            }

            // The User model casts 'password' => 'hashed', so assigning the
            // plain value re-hashes it on save. Never hash manually (double-hash).
            $user->password = $newPassword;
            $user->save();

            $this->revokeOtherTokens($user);
        });
    }

    /**
     * Revoke every personal access token EXCEPT the one used by the current
     * request, so a password change logs the user out everywhere else while
     * keeping the active session alive. For cookie-based SPA sessions
     * (TransientToken) there is no current token id, so all tokens are cleared.
     */
    private function revokeOtherTokens(User $user): void
    {
        $current = $user->currentAccessToken();

        $query = $user->tokens();

        if ($current instanceof PersonalAccessToken) {
            $query->whereKeyNot($current->getKey());
        }

        $query->delete();
    }
}
