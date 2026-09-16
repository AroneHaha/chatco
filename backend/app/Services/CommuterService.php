<?php

namespace App\Services;

use App\Models\CommuterProfile;
use App\Models\User;
use Laravel\Sanctum\PersonalAccessToken;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;
use App\Services\EmailVerificationService;

/**
 * Business logic for the commuter self-service profile (S5-T1).
 *
 * Keeps CommuterController thin: the controller only maps HTTP <-> service.
 * All persistence, hashing, token revocation and the response shape live here.
 *
 * Scope rule: every method operates on the *authenticated* User passed in by
 * the controller (auth()->user()). No method ever accepts a user id from the
 * request, so a commuter can only ever read/modify their own record.
 */
class CommuterService
{
    public function __construct(
        private EmailVerificationService $emailVerification
    ) {}

    /**
     * Columns fetched for the profile relation.
     *
     * `id` is required for the hasOne(id -> id) relation to hydrate.
     * `email` is intentionally omitted here — the canonical login email is
     * read from the User model. Sensitive/internal columns (deleted_at,
     * updated_at) are not selected ("fetch only what is rendered").
     *
     * @return array<int, string>
     */
    private function profileColumns(): array
    {
        return [
            'id',
            'first_name',
            'middle_name',
            'surname',
            'birthdate',
            'gender',
            'contact_number',
            'commuter_type',
            'applied_type',
            'username',
            'language_preference',
            'account_status',
            'id_image_url',
            'verified_at',
            'rejection_reason',
            'created_at',
        ];
    }

    /**
     * GET /commuter/profile — return the authenticated commuter's profile.
     *
     * Single eager-loaded query (no N+1); returns null when the COMMUTER user
     * has no profile row (data-integrity edge case) so the controller can map
     * it to a 404 in the project envelope.
     *
     * @return array<string, mixed>|null
     */
    public function getProfile(User $user): ?array
    {
        $user->loadMissing([
            'commuterProfile' => fn ($q) => $q->select($this->profileColumns()),
        ]);

        $profile = $user->commuterProfile;

        return $profile ? $this->present($user, $profile) : null;
    }

    /**
     * PUT /commuter/profile — update the editable profile fields.
     *
     * $data is the *validated* whitelist from UpdateProfileRequest
     * (contact_number, language_preference only). Identity fields tied to the
     * verified valid-ID (name, birthdate, gender, commuter_type) and the login
     * email are intentionally NOT updatable here and never reach this method.
     *
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>|null
     */
    public function updateProfile(User $user, array $data): ?array
    {
        $user->loadMissing('commuterProfile');

        $profile = $user->commuterProfile;

        if (! $profile) {
            return null;
        }

        $profile->fill($data);

        // Skip the write entirely when nothing actually changed.
        if ($profile->isDirty()) {
            $profile->save();
        }

        return $this->present($user->setRelation('commuterProfile', $profile), $profile);
    }

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
     * POST /commuter/change-password/request-code — phase 1.
     *
     * Validates the request, then emails a 6-digit code to the commuter's OWN
     * registered address (read from $user, never accepted from the request)
     * so completing a password change can't rest on the session alone — the
     * requester also has to prove they still control the account's inbox.
     * The password is NOT changed yet.
     *
     * @throws ValidationException on a bad current/new password
     * @throws \Throwable when the mail transport fails
     */
    public function requestPasswordChangeCode(User $user, string $currentPassword, string $newPassword): void
    {
        $this->assertPasswordChangeIsValid($user, $currentPassword, $newPassword);

        $this->emailVerification->sendCode($user->email, EmailVerificationService::PURPOSE_CHANGE_PASSWORD);
    }

    /**
     * POST /commuter/change-password/confirm — phase 2.
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
    public function confirmPasswordChange(User $user, string $currentPassword, string $newPassword, string $code): void
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

        // The User model casts 'password' => 'hashed', so assigning the plain
        // value re-hashes it on save. Never hash manually here (double-hash).
        $user->password = $newPassword;
        $user->save();

        $this->emailVerification->consume($user->email, EmailVerificationService::PURPOSE_CHANGE_PASSWORD);

        $this->revokeOtherTokens($user);
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

    /**
     * Build the stable API response shape for a commuter profile.
     *
     * Mirrors the { user, profile } envelope used by AuthController::user()
     * for frontend consistency. Never exposes password, tokens, or the
     * duplicate profile email column.
     *
     * @return array<string, mixed>
     */
    private function present(User $user, CommuterProfile $profile): array
    {
        return [
            'user' => [
                'id'    => $user->id,
                'email' => $user->email,
                'role'  => $user->role->value,
                'name'  => $user->getDisplayName(),
            ],
            'profile' => [
                'first_name'          => $profile->first_name,
                'middle_name'         => $profile->middle_name,
                'surname'             => $profile->surname,
                'birthdate'           => optional($profile->birthdate)->toDateString(),
                'gender'              => $profile->gender,
                'contact_number'      => $profile->contact_number,
                'commuter_type'       => $profile->commuter_type,
                'applied_type'        => $profile->applied_type,
                'username'            => $profile->username,
                'language_preference' => $profile->language_preference,
                'account_status'      => $profile->account_status,
                'id_image_url'        => $profile->id_image_url,
                'verified_at'         => optional($profile->verified_at)->toIso8601String(),
                'rejection_reason'    => $profile->rejection_reason,
                'created_at'          => optional($profile->created_at)->toIso8601String(),
            ],
        ];
    }
}
