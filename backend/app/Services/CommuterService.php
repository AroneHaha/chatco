<?php

namespace App\Services;

use App\Models\CommuterProfile;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Http\UploadedFile;

/**
 * Business logic for the commuter self-service profile (S5-T1).
 *
 * Keeps CommuterController thin: the controller only maps HTTP <-> service.
 * All persistence and the response shape live here; change-password lives in
 * PasswordChangeService (shared with admins).
 *
 * Scope rule: every method operates on the *authenticated* User passed in by
 * the controller (auth()->user()). No method ever accepts a user id from the
 * request, so a commuter can only ever read/modify their own record.
 */
class CommuterService
{
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
            'student_discount_expires_at',
            'applied_type',
            'username',
            'language_preference',
            'account_status',
            'id_image_url',
            'profile_image_url',
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

    /** Uploads are separate from profile edits: clients cannot supply another user's URL. */
    public function uploadProfilePhoto(User $user, UploadedFile $photo): ?array
    {
        if (! $user->commuterProfile()->exists()) {
            return null;
        }

        $media = app(MediaStorageService::class);
        try {
            $url = $media->storeProfileImage($photo, 'commuter', $user->id);
        } catch (\Throwable $error) {
            report($error);
            abort(502, 'The photo could not be stored. Please try again.');
        }

        try {
            $profile = DB::transaction(function () use ($user, $url, $media) {
                $profile = $user->commuterProfile()->lockForUpdate()->firstOrFail();
                $previous = $profile->profile_image_url;
                $profile->profile_image_url = $url;
                $profile->save();
                DB::afterCommit(fn () => $media->deletePublicUrl($previous));

                return $profile;
            });
        } catch (\Throwable $error) {
            $media->deletePublicUrl($url);
            throw $error;
        }

        return $this->present($user->setRelation('commuterProfile', $profile), $profile);
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
                'student_discount_eligible' => $profile->effectiveFareType() === 'STUDENT',
                'effective_fare_type' => $profile->effectiveFareType(),
                'applied_type'        => $profile->applied_type,
                'username'            => $profile->username,
                'language_preference' => $profile->language_preference,
                'account_status'      => $profile->account_status,
                'id_image_url'        => $profile->id_image_url,
                'profile_image_url'   => $profile->profile_image_url,
                'verified_at'         => optional($profile->verified_at)->toIso8601String(),
                'rejection_reason'    => $profile->rejection_reason,
                'created_at'          => optional($profile->created_at)->toIso8601String(),
            ],
        ];
    }
}
