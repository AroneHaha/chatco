<?php

namespace App\Services;

use App\Enums\ActivityLogCategory;
use App\Models\Announcement;
use App\Models\CommuterProfile;
use App\Models\DiscountApplication;
use App\Models\User;
use App\Support\MessageTemplates;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * PWD counterpart of StudentRenewalService. Students share one yearly window
 * set in Settings; a PWD's window comes from their own card instead: it opens
 * on the card's "Valid until" day and the discount lasts one more month, so a
 * card valid until March 15 keeps the discount through April 15. Proof storage
 * and the admin review are shared through DiscountApplicationService.
 *
 * PWD renewals keep cycle_year NULL (a card can last several years), so a
 * request belongs to the card it renews by date instead of by cycle.
 */
class PwdRenewalService
{
    public function __construct(private AnnouncementService $announcements, private ActivityLogService $activity, private DiscountApplicationService $applications) {}

    /** Renewal opens on the card's valid-until day, Philippine time. */
    public static function opensAt(Carbon $validUntil): Carbon
    {
        return Carbon::create($validUntil->year, $validUntil->month, $validUntil->day, 0, 0, 0, 'Asia/Manila');
    }

    /**
     * The moment the discount ends: the day after "valid until + one month".
     * No overflow, so a January 31 card runs through February 28 (or 29).
     */
    public static function cutoff(Carbon $validUntil): Carbon
    {
        return self::opensAt($validUntil)->addMonthNoOverflow()->addDay();
    }

    /** Heads-up notices start six days before renewal opens, like the students' notice on the 25th. */
    private static function noticeStartsAt(Carbon $validUntil): Carbon
    {
        return self::opensAt($validUntil)->subDays(6);
    }

    /**
     * Identifies one card's renewal for "Never remind me". A day number (about
     * 20,000) never equals the year a student's dismissal stores.
     */
    private static function cycleKey(Carbon $validUntil): int
    {
        return intdiv(Carbon::parse($validUntil->toDateString(), 'UTC')->timestamp, 86400);
    }

    private static function lastDay(Carbon $validUntil): Carbon
    {
        return self::cutoff($validUntil)->subDay();
    }

    private static function periodLabel(Carbon $validUntil): string
    {
        $from = self::opensAt($validUntil);
        $to = self::lastDay($validUntil);

        return ($from->year === $to->year ? $from->format('M j') : $from->format('M j, Y')).' – '.$to->format('M j, Y');
    }

    /** A current PWD with a card date, or a former PWD whose discount lapsed. */
    public static function isPwdAccount(CommuterProfile $profile): bool
    {
        return $profile->pwd_valid_until !== null
            && ($profile->commuter_type === 'PWD' || ($profile->commuter_type === 'REGULAR' && $profile->applied_type === 'PWD'));
    }

    public function isForRenewal(CommuterProfile $profile): bool
    {
        if ($profile->commuter_type !== 'PWD' || ! $profile->pwd_valid_until || ! in_array($profile->account_status, ['ACTIVE', 'APPROVED'], true)) {
            return false;
        }

        // Approval moves the card date forward, which ends this on its own.
        return $profile->effectiveFareType() !== 'PWD' || now('Asia/Manila')->gte(self::noticeStartsAt($profile->pwd_valid_until));
    }

    public function assertEligible(CommuterProfile $profile): void
    {
        if ($profile->user?->activeSuspension || ! in_array($profile->account_status, ['ACTIVE', 'APPROVED'], true) || ! self::isPwdAccount($profile)) {
            abort(403, 'PWD renewal is available only to approved PWD accounts and former PWD commuters whose discount expired.');
        }
    }

    public function state(User $user): array
    {
        $profile = $user->commuterProfile;
        abort_unless($profile, 404, 'Commuter profile not found.');
        $validUntil = $profile->pwd_valid_until;
        abort_unless($validUntil, 403, 'PWD renewal is available only to PWD accounts with a card date.');
        $notice = self::noticeStartsAt($validUntil);
        $renewals = fn () => $profile->discountApplications()->select(DiscountApplication::SUMMARY_COLUMNS)
            ->where('request_type', 'RENEWAL')->where('requested_type', 'PWD');
        $outstanding = $renewals()->outstanding()->orderBy('submitted_at')->first();
        $latest = $outstanding ? null : $renewals()->latest('submitted_at')->latest('id')->first();
        // The approval that set this card's date belongs to the previous card.
        $setThisDate = $latest?->status === 'APPROVED' && $latest->valid_until?->isSameDay($validUntil);
        $renewed = $setThisDate && now('Asia/Manila')->lt($notice);
        $current = $latest && ! $setThisDate && $latest->submitted_at->gte($notice) ? $latest : null;
        $application = $outstanding ?? $current ?? ($renewed ? $latest : null);
        $active = in_array($profile->account_status, ['ACTIVE', 'APPROVED'], true);
        $canApply = $active && self::isPwdAccount($profile)
            && now('Asia/Manila')->gte(self::opensAt($validUntil)) && ! $renewed
            && ! $profile->discountApplications()->where('request_type', 'APPLICATION')->outstanding()->exists()
            && ! in_array($application?->status, ['PENDING', 'APPROVED', 'CANCELLED'], true);
        $noticeActive = ! $renewed && ($profile->commuter_type === 'PWD' || $canApply) && now('Asia/Manila')->gte($notice);
        $cycle = self::cycleKey($validUntil);

        return [
            'kind' => 'PWD',
            'cycle_year' => $cycle,
            'valid_until' => $validUntil->toDateString(),
            'deadline' => self::cutoff($validUntil)->toIso8601String(),
            'opens_at' => self::opensAt($validUntil)->toIso8601String(),
            'renewal_period' => self::periodLabel($validUntil),
            'commuter_type' => $profile->commuter_type,
            'discount_eligible' => $profile->effectiveFareType() === 'PWD',
            'discount_expires_at' => self::cutoff($validUntil)->toIso8601String(),
            'status' => $profile->commuter_type === 'REGULAR' && $profile->applied_type === 'REGULAR'
                ? 'CANCELLED' : ($renewed ? 'APPROVED' : ($application?->status ?? 'NOT_RENEWED')),
            'can_submit' => $canApply,
            'notice_active' => $noticeActive,
            'reminder_due' => $noticeActive && $profile->commuter_type === 'PWD' && $active
                && $application?->status !== 'PENDING'
                && $profile->renewal_reminder_dismissed_cycle !== $cycle
                && ! $profile->renewal_reminder_snoozed_until?->isFuture(),
            'can_switch_to_regular' => $profile->commuter_type === 'PWD',
            'application' => $application ? $this->applications->present($application) : null,
        ];
    }

    public function setReminder(User $user, string $action): array
    {
        $profile = $user->commuterProfile;
        abort_unless($profile, 404, 'Commuter profile not found.');
        $this->assertEligible($profile);
        $profile->update($action === 'dismiss'
            ? ['renewal_reminder_dismissed_cycle' => self::cycleKey($profile->pwd_valid_until)]
            : ['renewal_reminder_snoozed_until' => now()->addDay()]);

        return $this->state($user);
    }

    public function submit(User $user, array $data): array
    {
        $profile = $user->commuterProfile;
        abort_unless($profile, 404, 'Commuter profile not found.');
        $this->assertEligible($profile);
        $state = $this->state($user);
        abort_unless($state['can_submit'], 409, 'Renewal is not open or this card already has an active renewal.');
        // Upload outside the lock; only a completed upload accepted by the server counts toward the deadline.
        $path = $this->applications->storeDocument($profile, $data['document'], 'renewals');
        try {
            DB::transaction(function () use ($user, $profile, $path, $data, $state) {
                $locked = CommuterProfile::whereKey($profile->id)->lockForUpdate()->firstOrFail();
                $user->setRelation('commuterProfile', $locked);
                $this->assertEligible($locked);
                $fresh = $this->state($user);
                abort_unless($fresh['can_submit'] && $fresh['valid_until'] === $state['valid_until'], 409, 'This renewal has already been submitted or processed, or your card date has changed.');
                // A correction, rejection or lapsed correction for this card is resubmitted in place, keeping its history.
                $previous = $fresh['application'] ? DiscountApplication::whereKey($fresh['application']['id'])->lockForUpdate()->first() : null;
                $application = $previous ?? new DiscountApplication([
                    'commuter_id' => $locked->id, 'request_type' => 'RENEWAL', 'requested_type' => 'PWD', 'cycle_year' => null,
                ]);
                $this->applications->saveSubmission($application, $data, $path, $user);
                $name = $locked->first_name.' '.$locked->surname;
                $this->announcements->notifyAdmins('PWD_RENEWAL_NEW', 'PWD renewal submitted: '.$name, $name.' submitted a renewed PWD ID.', $application->id);
            }, 3);
        } catch (\Throwable $error) {
            $this->applications->deleteDocument($path);
            throw $error;
        }

        return $this->state($user->fresh());
    }

    public function switchToRegular(User $user): array
    {
        DB::transaction(function () use ($user) {
            $profile = CommuterProfile::whereKey($user->id)->lockForUpdate()->firstOrFail();
            $this->assertEligible($profile);
            // The card date stays for this response's state; applied_type REGULAR
            // already ends PWD renewal eligibility.
            $profile->update(['commuter_type' => 'REGULAR', 'applied_type' => 'REGULAR']);
            DiscountApplication::where('commuter_id', $profile->id)->where('request_type', 'RENEWAL')->where('requested_type', 'PWD')
                ->whereIn('status', ['PENDING', 'NEEDS_CORRECTION'])->update(['status' => 'CANCELLED', 'updated_at' => now()]);
            $this->activity->record(
                ActivityLogCategory::MEMBER,
                'Switched from PWD to Regular fare',
                $user,
                [['field' => 'Commuter type', 'from' => 'PWD', 'to' => 'Regular']],
            );
        }, 3);

        return $this->state($user->fresh());
    }

    private function processAccount(string $id, string $phase, \Closure $work, array &$failures): void
    {
        try {
            DB::transaction($work, 3);
        } catch (\Throwable $error) {
            $failure = ['commuter_id' => $id, 'phase' => $phase];
            $failures[] = $failure;
            Log::error('PWD renewal processing failed; retry required.', $failure + ['exception' => $error]);
        }
    }

    /** Daily: expire lapsed PWD discounts, then send reminders that are due. */
    public function process(): array
    {
        $failures = [];
        $today = now('Asia/Manila')->startOfDay();
        $expiredTemplate = MessageTemplates::get('pwd_renewal_expired_template');
        $reminderTemplate = MessageTemplates::get('pwd_renewal_reminder_template');

        // Cards dated before last month's same day; effectiveFareType() below is the exact check.
        CommuterProfile::where('commuter_type', 'PWD')->whereNotNull('pwd_valid_until')
            ->where('pwd_valid_until', '<', $today->copy()->subMonthNoOverflow()->toDateString())->whereHas('user')
            ->select('id')->chunkById(100, function ($profiles) use (&$failures, $expiredTemplate) {
                foreach ($profiles as $candidate) {
                    $this->processAccount($candidate->id, 'expiration', function () use ($candidate, $expiredTemplate) {
                        $profile = CommuterProfile::whereKey($candidate->id)->lockForUpdate()->firstOrFail();
                        if ($profile->commuter_type !== 'PWD' || $profile->effectiveFareType() === 'PWD') {
                            return;
                        }
                        $applications = $profile->discountApplications()->where('request_type', 'RENEWAL')->where('requested_type', 'PWD')
                            ->whereIn('status', ['PENDING', 'NEEDS_CORRECTION'])
                            ->select(['id', 'status', 'first_submitted_at', 'correction_due_at'])->lockForUpdate()->get();
                        $protected = false;
                        foreach ($applications as $application) {
                            if ($application->status === 'NEEDS_CORRECTION' && ! $application->correction_due_at?->isFuture()) {
                                $application->update(['status' => 'EXPIRED']);

                                continue;
                            }
                            // Sent before the deadline: stays PWD while reviewed (Regular fares apply meanwhile).
                            $protected = $protected || $application->first_submitted_at->lt(self::cutoff($profile->pwd_valid_until));
                        }
                        if ($protected) {
                            return;
                        }
                        $profile->update(['commuter_type' => 'REGULAR', 'applied_type' => 'PWD']);
                        $this->activity->record(
                            ActivityLogCategory::MEMBER,
                            "PWD discount of {$profile->first_name} {$profile->surname} expired without renewal; moved to Regular fare",
                            null,
                            [['field' => 'Commuter type', 'from' => 'PWD', 'to' => 'Regular']],
                        );
                        $this->announcements->notifyUser($profile->id, 'PWD_RENEWAL_DONE', 'PWD discount expired', MessageTemplates::render($expiredTemplate, [
                            'name' => trim($profile->first_name.' '.$profile->surname),
                        ]), $profile->id);
                    }, $failures);
                }
            });

        // Notices run from six days before the card date until a month after it.
        CommuterProfile::where('commuter_type', 'PWD')->whereIn('account_status', ['ACTIVE', 'APPROVED'])->whereHas('user')
            ->where('pwd_valid_until', '>=', $today->copy()->subMonthNoOverflow()->subDay()->toDateString())
            ->where('pwd_valid_until', '<', $today->copy()->addDays(7)->toDateString())
            ->whereDoesntHave('discountApplications', fn ($q) => $q->where('request_type', 'RENEWAL')->where('requested_type', 'PWD')->outstanding())
            ->select(['id', 'pwd_valid_until'])->chunkById(100, function ($profiles) use (&$failures, $reminderTemplate) {
                foreach ($profiles as $candidate) {
                    $slot = self::reminderSlot($candidate->pwd_valid_until);
                    if (! $slot) {
                        continue;
                    }
                    $this->processAccount($candidate->id, 'reminder', function () use ($candidate, $slot, $reminderTemplate) {
                        $profile = CommuterProfile::whereKey($candidate->id)->lockForUpdate()->firstOrFail();
                        if ($profile->commuter_type !== 'PWD' || ! $profile->pwd_valid_until?->isSameDay($candidate->pwd_valid_until)
                            || $profile->discountApplications()->where('request_type', 'RENEWAL')->where('requested_type', 'PWD')->outstanding()->exists()
                            || Announcement::withTrashed()->where('user_id', $profile->id)->where('type', 'PWD_RENEWAL')->where('created_at', '>=', $slot)->exists()) {
                            return;
                        }
                        $deadline = self::lastDay($profile->pwd_valid_until)->format('F j');
                        $this->announcements->notifyUser($profile->id, 'PWD_RENEWAL', "Renew your PWD ID by {$deadline}", MessageTemplates::render($reminderTemplate, [
                            'name' => trim($profile->first_name.' '.$profile->surname),
                            'period' => self::periodLabel($profile->pwd_valid_until),
                            'deadline' => $deadline,
                        ]), $profile->id);
                    }, $failures);
                }
            });

        return $failures;
    }

    /**
     * The latest notice date already reached for this card, or null outside its
     * notice run. Same rhythm as students: three heads-up notices the week before
     * renewal opens, then weekly while it is open.
     */
    private static function reminderSlot(Carbon $validUntil): ?Carbon
    {
        $opens = self::opensAt($validUntil);
        if (now('Asia/Manila')->gte(self::cutoff($validUntil))) {
            return null;
        }
        $dates = [$opens->copy()->subDays(6), $opens->copy()->subDays(2), $opens->copy()->subDay()];
        foreach ([0, 7, 14, 21, 28] as $days) {
            $dates[] = $opens->copy()->addDays($days);
        }

        return collect($dates)->last(fn ($date) => $date->lte(now('Asia/Manila')));
    }
}
