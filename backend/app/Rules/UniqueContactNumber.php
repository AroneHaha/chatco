<?php

namespace App\Rules;

use App\Models\CommuterProfile;
use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

/**
 * A commuter contact number may belong to only one live account.
 *
 * "Live" mirrors the email rule in AuthService::register: the owning user is
 * not soft-deleted. Pending applicants hold their number (they're waiting on
 * review); rejected and deleted accounts don't, because their User row is
 * soft-deleted and whereHas('user') applies the SoftDeletes scope.
 *
 * Why not a DB unique index: rejected/deleted commuters keep their profile
 * row (and its contact_number) for the Rejected tab and the audit trail, so
 * an index would lock those numbers forever; and pre-existing duplicates
 * would make the index migration fail. commuter_profiles.contact_number is
 * indexed for this lookup instead.
 *
 * Numbers are compared as stored: PhilippineMobileNumber accepts only the
 * single 09XXXXXXXXX shape, so there is no formatting to normalize.
 */
class UniqueContactNumber implements ValidationRule
{
    public const MESSAGE = 'That contact number is already in use.';

    /**
     * @param  string|null  $ignoreProfileId  the commuter being edited (profile id = user id)
     */
    public function __construct(private readonly ?string $ignoreProfileId = null) {}

    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if (! is_string($value) || $value === '') {
            return;
        }

        if ($this->ignoreProfileId !== null) {
            // Re-saving the number the commuter already has is never a
            // conflict, even if an older duplicate exists from before this
            // rule — otherwise unrelated edits on those accounts would fail.
            $unchanged = CommuterProfile::whereKey($this->ignoreProfileId)
                ->where('contact_number', $value)
                ->exists();

            if ($unchanged) {
                return;
            }
        }

        $taken = CommuterProfile::query()
            ->where('contact_number', $value)
            ->when($this->ignoreProfileId !== null, fn ($query) => $query->whereKeyNot($this->ignoreProfileId))
            ->whereHas('user')
            ->exists();

        if ($taken) {
            $fail(self::MESSAGE);
        }
    }
}
