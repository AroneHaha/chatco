<?php

namespace App\Services;

use App\Models\RegistrationRejection;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Validation\ValidationException;

/**
 * Enforces the re-registration safety net.
 *
 * Rejected commuters can register again with the same email/username (the old
 * account is soft-deleted and the identifiers freed). To stop someone from
 * endlessly resubmitting a bad ID, every rejection is logged against the
 * applicant's normalised identity (email OR contact number). Once the number
 * of rejections reaches config('registration.rejection_threshold'), a cooldown
 * of config('registration.cooldown_days') days is applied and further
 * registration attempts are blocked until it elapses.
 *
 * Matching on email OR contact number (not email alone) means an applicant
 * can't reset their strike count just by swapping in a fresh email address.
 */
class RegistrationGuard
{
    /**
     * Number of rejections at which a cooldown block is triggered.
     */
    public function threshold(): int
    {
        return max(1, (int) config('registration.rejection_threshold', 3));
    }

    /**
     * Cooldown length, in days, once the threshold is reached.
     */
    public function cooldownDays(): int
    {
        return max(1, (int) config('registration.cooldown_days', 3));
    }

    /**
     * How many times this identity (email OR contact number) has been rejected.
     */
    public function rejectionCountFor(?string $email, ?string $contact): int
    {
        return $this->identityQuery($email, $contact)->count();
    }

    /**
     * Complete rejection history for an applicant identity, newest first.
     */
    public function historyFor(?string $email, ?string $contact): Collection
    {
        return $this->identityQuery($email, $contact)
            ->orderByDesc('created_at')
            ->get([
                'reason',
                'attempt_number',
                'blocked_until',
                'created_at',
            ]);
    }

    /**
     * Batched version of historyFor() for a page of applicants at once —
     * avoids one `registration_rejections` query per row when rendering the
     * pending/rejected registrations list (see AdminService::listPending/
     * listRejectedRegistrations).
     *
     * @param  iterable<array{key: string, email: ?string, contact: ?string}>  $identities
     * @return array<string, Collection> keyed by the caller-supplied `key`,
     *         each value the same newest-first Collection historyFor() would
     *         return for that single identity.
     */
    public function historyForMany(iterable $identities): array
    {
        $identities = collect($identities)->values();

        $emails = $identities
            ->map(fn (array $identity) => RegistrationRejection::normalizeEmail($identity['email'] ?? null))
            ->filter()
            ->unique()
            ->values()
            ->all();

        $contacts = $identities
            ->map(fn (array $identity) => RegistrationRejection::normalizeContact($identity['contact'] ?? null))
            ->filter()
            ->unique()
            ->values()
            ->all();

        if (empty($emails) && empty($contacts)) {
            return $identities->mapWithKeys(fn (array $identity) => [$identity['key'] => collect()])->all();
        }

        // One query for the whole page instead of one per applicant.
        $rows = RegistrationRejection::query()
            ->where(function (Builder $q) use ($emails, $contacts) {
                $matched = false;

                if (! empty($emails)) {
                    $q->orWhereIn('email', $emails);
                    $matched = true;
                }

                if (! empty($contacts)) {
                    $q->orWhereIn('contact_number', $contacts);
                    $matched = true;
                }

                if (! $matched) {
                    $q->whereRaw('1 = 0');
                }
            })
            ->orderByDesc('created_at')
            ->get(['id', 'email', 'contact_number', 'reason', 'attempt_number', 'blocked_until', 'created_at']);

        $byEmail = $rows->groupBy('email');
        $byContact = $rows->groupBy('contact_number');

        return $identities->mapWithKeys(function (array $identity) use ($byEmail, $byContact) {
            $email = RegistrationRejection::normalizeEmail($identity['email'] ?? null);
            $contact = RegistrationRejection::normalizeContact($identity['contact'] ?? null);

            $matches = collect();
            if ($email !== null) {
                $matches = $matches->merge($byEmail->get($email, collect()));
            }
            if ($contact !== null) {
                $matches = $matches->merge($byContact->get($contact, collect()));
            }

            // Rows can appear in both maps (a rejection whose email matches
            // one applicant may also share a contact number with another) —
            // dedupe by primary key, then restore newest-first order since
            // merging the two maps doesn't preserve it.
            $history = $matches->unique('id')->sortByDesc('created_at')->values();

            return [$identity['key'] => $history];
        })->all();
    }

    /**
     * The active cooldown block for this identity, if any — the most recent
     * rejection whose blocked_until is still in the future. Null when the
     * applicant is free to register.
     */
    public function activeBlockFor(?string $email, ?string $contact): ?RegistrationRejection
    {
        return $this->identityQuery($email, $contact)
            ->whereNotNull('blocked_until')
            ->where('blocked_until', '>', Carbon::now())
            ->orderByDesc('blocked_until')
            ->first();
    }

    /**
     * Throw a 422 with a friendly message if this identity is in cooldown.
     * Called before creating any new commuter account (self sign-up + admin
     * onsite registration).
     *
     * @throws ValidationException
     */
    public function assertNotBlocked(?string $email, ?string $contact): void
    {
        $block = $this->activeBlockFor($email, $contact);

        if (! $block) {
            return;
        }

        $until = $block->blocked_until;
        $retryDate = $until->timezone(config('app.timezone'))->format('M j, Y \a\t g:i A');

        throw ValidationException::withMessages([
            'email' => [
                "This registration has been rejected {$block->attempt_number} times. "
                . "For security, new registrations with this email or contact number are "
                . "temporarily paused until {$retryDate}. Please try again after that date, "
                . "or contact support if you believe this is a mistake.",
            ],
        ]);
    }

    /**
     * Record a rejection strike and apply a cooldown once the threshold is hit.
     *
     * Returns the created ledger row so callers can surface the attempt number
     * and any cooldown (e.g. in the rejection email).
     */
    public function recordRejection(
        ?string $email,
        ?string $contact,
        string $reason,
        ?string $rejectedUserId = null,
        ?string $rejectedByAdminId = null,
    ): RegistrationRejection {
        $normalizedEmail = RegistrationRejection::normalizeEmail($email);
        $normalizedContact = RegistrationRejection::normalizeContact($contact);

        // attempt_number is 1-based: prior strikes + this one.
        $attemptNumber = $this->rejectionCountFor($email, $contact) + 1;

        // At/after the threshold, block re-registration for the cooldown window.
        $blockedUntil = $attemptNumber >= $this->threshold()
            ? Carbon::now()->addDays($this->cooldownDays())
            : null;

        return RegistrationRejection::create([
            'email' => $normalizedEmail ?? '',
            'contact_number' => $normalizedContact,
            'rejected_user_id' => $rejectedUserId,
            'reason' => $reason,
            'attempt_number' => $attemptNumber,
            'blocked_until' => $blockedUntil,
            'rejected_by' => $rejectedByAdminId,
        ]);
    }

    /**
     * Base query matching rows for the given identity: same normalised email,
     * OR same normalised contact number. Contact is only matched when present,
     * so a null contact never collapses unrelated applicants together.
     */
    private function identityQuery(?string $email, ?string $contact): Builder
    {
        $normalizedEmail = RegistrationRejection::normalizeEmail($email);
        $normalizedContact = RegistrationRejection::normalizeContact($contact);

        return RegistrationRejection::query()->where(function (Builder $q) use ($normalizedEmail, $normalizedContact) {
            $matched = false;

            if ($normalizedEmail !== null) {
                $q->orWhere('email', $normalizedEmail);
                $matched = true;
            }

            if ($normalizedContact !== null) {
                $q->orWhere('contact_number', $normalizedContact);
                $matched = true;
            }

            // No usable identity → match nothing (never every row).
            if (! $matched) {
                $q->whereRaw('1 = 0');
            }
        });
    }
}
