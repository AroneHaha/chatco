<?php

namespace App\Services;

use App\Enums\ActivityLogCategory;
use App\Models\Announcement;
use App\Models\CommuterProfile;
use App\Models\DiscountApplication;
use App\Models\User;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class StudentRenewalService
{
    // Renewal proof must never use the registration upload's public fallback.
    private const DOCUMENT_DISK = 'r2_private';

    public function __construct(private AnnouncementService $announcements, private ActivityLogService $activity) {}

    public function cycleYear(): int
    {
        $date = now('Asia/Manila');

        return max((int) config('registration.student_renewal_first_year', 2027), $date->year - ($date->month < (int) config('registration.student_renewal_month', 9) - 1 ? 1 : 0));
    }

    public function cutoff(int $year): Carbon
    {
        return Carbon::create($year, (int) config('registration.student_renewal_month', 9) + 1, 1, 0, 0, 0, 'Asia/Manila');
    }

    private function noticeStartsAt(int $year): Carbon
    {
        return $this->cutoff($year)->subMonths(2)->day(25);
    }

    private function periodLabel(int $year): string
    {
        $lastDay = $this->cutoff($year)->subDay();

        return $lastDay->format('F').' 1-'.$lastDay->format('j, Y');
    }

    public function isForRenewal(CommuterProfile $profile): bool
    {
        if ($profile->commuter_type !== 'STUDENT' || ! in_array($profile->account_status, ['ACTIVE', 'APPROVED'], true)) {
            return false;
        }

        $year = $this->cycleYear();

        // Overdue students remain due across rollover, even before the next notice period.
        return $profile->effectiveFareType() !== 'STUDENT'
            || (now('Asia/Manila')->gte($this->noticeStartsAt($year))
                && ! $profile->student_discount_expires_at?->gt($this->cutoff($year)));
    }

    private function assertEligible(CommuterProfile $profile): void
    {
        if (! in_array($profile->account_status, ['ACTIVE', 'APPROVED'], true)
            || ! ($profile->commuter_type === 'STUDENT' || ($profile->commuter_type === 'REGULAR' && $profile->applied_type === 'STUDENT' && $profile->student_discount_expires_at))) {
            abort(403, 'Student renewal is available only to approved student accounts and former students whose discount expired.');
        }
    }

    public function state(User $user): array
    {
        $profile = $user->commuterProfile;
        abort_unless($profile, 404, 'Commuter profile not found.');
        $year = $this->cycleYear();
        $outstanding = $profile->discountApplications()->outstanding()->orderBy('cycle_year')->first();
        $application = $outstanding ?? $profile->discountApplications()->where('cycle_year', $year)->first();
        // An unresolved request keeps its cycle and correction window after rollover.
        $year = $outstanding?->cycle_year ?? $year;
        $cutoff = $this->cutoff($year);
        $renewed = ! $outstanding && $profile->commuter_type === 'STUDENT' && $profile->student_discount_expires_at?->gt($cutoff);
        $canApply = in_array($profile->account_status, ['ACTIVE', 'APPROVED'], true)
            && ($profile->commuter_type === 'STUDENT' || ($profile->commuter_type === 'REGULAR' && $profile->applied_type === 'STUDENT' && $profile->student_discount_expires_at))
            && now('Asia/Manila')->gte($cutoff->copy()->subMonth()) && ! $renewed
            && ! in_array($application?->status, ['PENDING', 'APPROVED', 'CANCELLED'], true);
        $noticeActive = ! $renewed && ($profile->commuter_type === 'STUDENT' || $canApply)
            && now('Asia/Manila')->gte($this->noticeStartsAt($year));

        return [
            'cycle_year' => $year,
            'deadline' => $cutoff->toIso8601String(),
            'opens_at' => $cutoff->copy()->subMonth()->toIso8601String(),
            'renewal_period' => $this->periodLabel($year),
            'commuter_type' => $profile->commuter_type,
            'discount_eligible' => $profile->effectiveFareType() === 'STUDENT',
            'discount_expires_at' => $profile->student_discount_expires_at?->toIso8601String(),
            'status' => $application && $profile->commuter_type === 'REGULAR' && $profile->applied_type === 'REGULAR'
                ? 'CANCELLED' : ($renewed ? 'APPROVED' : ($application?->status ?? 'NOT_RENEWED')),
            'can_submit' => $canApply,
            'notice_active' => $noticeActive,
            // Drives the pop-up reminder: only students with something left to
            // do, and only until they snooze it or silence it for this cycle.
            'reminder_due' => $noticeActive && $profile->commuter_type === 'STUDENT'
                && in_array($profile->account_status, ['ACTIVE', 'APPROVED'], true)
                && $application?->status !== 'PENDING'
                && $profile->renewal_reminder_dismissed_cycle !== $year
                && ! $profile->renewal_reminder_snoozed_until?->isFuture(),
            'can_switch_to_regular' => $profile->commuter_type === 'STUDENT',
            'application' => $application ? $this->present($application) : null,
        ];
    }

    public function setReminder(User $user, string $action): array
    {
        $profile = $user->commuterProfile;
        abort_unless($profile, 404, 'Commuter profile not found.');
        $this->assertEligible($profile);
        // Either choice is a single idempotent write to the commuter's own row.
        $profile->update($action === 'dismiss'
            ? ['renewal_reminder_dismissed_cycle' => $this->state($user)['cycle_year']]
            : ['renewal_reminder_snoozed_until' => now()->addDay()]);

        return $this->state($user);
    }

    public function submit(User $user, array $data): array
    {
        $profile = $user->commuterProfile;
        abort_unless($profile, 404, 'Commuter profile not found.');
        $this->assertEligible($profile);
        $state = $this->state($user);
        abort_unless($state['can_submit'], 409, 'Renewal is not open or this cycle already has an active application.');
        $year = $state['cycle_year'];
        // Upload outside the lock; only a completed upload accepted by the server counts toward the deadline.
        $disk = self::DOCUMENT_DISK;
        $path = $data['document']->store('ids/commuters/'.$profile->id.'/renewals', ['disk' => $disk, 'visibility' => 'private']);
        if (! $path) {
            abort(502, 'The document could not be stored. Please try again.');
        }
        try {
            DB::transaction(function () use ($user, $profile, $path, $data, $year) {
                $locked = CommuterProfile::whereKey($profile->id)->lockForUpdate()->firstOrFail();
                $user->setRelation('commuterProfile', $locked);
                $this->assertEligible($locked);
                $state = $this->state($user);
                abort_unless($state['can_submit'] && $state['cycle_year'] === $year, 409, 'This renewal has already been submitted or processed, or its submission window has changed.');
                $application = DiscountApplication::firstOrNew(['commuter_id' => $locked->id, 'cycle_year' => $year]);
                // Preserve earlier documents for review history; never overwrite the initial registration ID.
                if ($application->exists) {
                    $history = $application->submission_history ?? [];
                    $history[] = $application->only(['revision', 'document_path', 'document_mime', 'school_name', 'education_level', 'grade_level', 'school_year', 'enrollment_term', 'submitted_at', 'reviewed_at', 'reviewed_by', 'status', 'reason']);
                    $application->submission_history = $history;
                    $this->activity->record(ActivityLogCategory::MEMBER, "Renewal {$application->id} resubmitted; previous status {$application->status}, reason: {$application->reason}", $user);
                }
                $retainTimelySubmission = $application->status === 'NEEDS_CORRECTION' && $application->correction_due_at?->isFuture();
                $application->fill([
                    'status' => 'PENDING', 'request_type' => 'RENEWAL', 'document_path' => $path,
                    'revision' => $application->exists ? $application->revision + 1 : 1,
                    'document_mime' => $data['document']->getMimeType(),
                    'school_name' => $data['school_name'], 'education_level' => $data['education_level'],
                    'grade_level' => $data['grade_level'] ?? null,
                    'school_year' => $data['school_year'], 'enrollment_term' => ($data['enrollment_term'] ?? null) ?: null,
                    'submitted_at' => now(),
                    'first_submitted_at' => $retainTimelySubmission ? $application->first_submitted_at : now(),
                    'reviewed_by' => null, 'reviewed_at' => null, 'reason' => null, 'correction_due_at' => null,
                ])->save();
                $this->announcements->notifyAdmins('STUDENT_RENEWAL_NEW', 'Student renewal awaiting review', $locked->first_name.' '.$locked->surname.' submitted enrollment proof.', $application->id);
            }, 3);
        } catch (\Throwable $error) {
            Storage::disk($disk)->delete($path);
            throw $error;
        }

        return $this->state($user->fresh());
    }

    public function switchToRegular(User $user): array
    {
        DB::transaction(function () use ($user) {
            $profile = CommuterProfile::whereKey($user->id)->lockForUpdate()->firstOrFail();
            $this->assertEligible($profile);
            $profile->update(['commuter_type' => 'REGULAR', 'applied_type' => 'REGULAR', 'student_discount_expires_at' => null]);
            DiscountApplication::where('commuter_id', $profile->id)->whereIn('status', ['PENDING', 'NEEDS_CORRECTION'])->update(['status' => 'CANCELLED', 'updated_at' => now()]);
            $this->activity->record(ActivityLogCategory::MEMBER, 'Student voluntarily switched to Regular: '.$profile->id, $user);
        }, 3);

        return $this->state($user->fresh());
    }

    public function list(array $filters)
    {
        // Table pages never show the proof; only the single-application fetch
        // behind the review dialog gets a signed document link.
        $withDocument = isset($filters['id']);
        $columns = ['id', 'commuter_id', 'request_type', 'cycle_year', 'revision', 'status', 'school_name', 'education_level', 'grade_level', 'school_year', 'enrollment_term', 'reason', 'reviewed_by', 'document_mime', 'submitted_at', 'first_submitted_at', 'reviewed_at', 'correction_due_at'];

        return DiscountApplication::select($withDocument ? [...$columns, 'document_path'] : $columns)
            ->with(['commuter:id,first_name,middle_name,surname,birthdate,gender,contact_number,username,commuter_type', 'commuter.user:id,email'])
            ->whereHas('commuter.user')
            ->when($filters['status'] ?? null, fn ($q, $status) => $q->where('status', $status))
            ->when($filters['id'] ?? null, fn ($q, $id) => $q->whereKey($id))
            ->when($filters['search'] ?? null, function ($q, $search) {
                $q->whereHas('commuter', fn ($profile) => $profile->where(fn ($p) => $p->where('first_name', 'like', "%{$search}%")->orWhere('surname', 'like', "%{$search}%")->orWhere('email', 'like', "%{$search}%")));
            })
            ->orderBy('submitted_at')->orderBy('id')->paginate($filters['per_page'] ?? 10)
            ->through(fn ($application) => $this->present($application, true, $withDocument));
    }

    public function review(User $admin, string $id, array $data): array
    {
        return DB::transaction(function () use ($admin, $id, $data) {
            $candidate = DiscountApplication::findOrFail($id);
            // All transitions lock the profile first, then the application.
            $profile = CommuterProfile::whereKey($candidate->commuter_id)->lockForUpdate()->firstOrFail();
            $application = DiscountApplication::whereKey($id)->lockForUpdate()->firstOrFail();
            abort_unless($application->status === 'PENDING', 409, 'This application has already been processed.');
            abort_unless($application->revision === (int) $data['revision'], 409, 'The enrollment proof has changed. Reopen the application before reviewing it.');
            $this->assertEligible($profile);
            $decision = $data['decision'];
            $application->fill([
                'status' => $decision, 'reviewed_by' => $admin->id, 'reviewed_at' => now(),
                'reason' => $data['reason'] ?? null,
                'correction_due_at' => $decision === 'NEEDS_CORRECTION' ? now()->addDays(7) : null,
            ])->save();
            if ($decision === 'APPROVED') {
                $profile->update(['commuter_type' => 'STUDENT', 'applied_type' => 'STUDENT', 'student_discount_expires_at' => $this->cutoff($application->cycle_year + 1)]);
            } elseif ($decision === 'REJECTED') {
                $profile->update(['commuter_type' => 'REGULAR', 'applied_type' => 'STUDENT']);
            }
            $message = match ($decision) {
                'APPROVED' => 'Your student status has been renewed. Your student discount is available.',
                'NEEDS_CORRECTION' => 'Please submit corrected enrollment proof within seven days. '.$application->reason,
                default => 'Your student renewal was not approved. Your commuter type is now Regular. '.$application->reason,
            };
            $this->announcements->notifyUser($profile->id, 'STUDENT_RENEWAL_DONE', 'Student renewal update', $message, $application->id);
            $this->activity->record(ActivityLogCategory::MEMBER, "Renewal {$id}: {$decision}. ".($application->reason ?? ''), $admin);

            return $this->present($application, true);
        }, 3);
    }

    public function present(DiscountApplication $application, bool $admin = false, bool $withDocument = true): array
    {
        $result = $application->only(['id', 'request_type', 'cycle_year', 'revision', 'status', 'school_name', 'education_level', 'grade_level', 'school_year', 'enrollment_term', 'reason', 'reviewed_by', 'document_mime']);
        foreach (['submitted_at', 'first_submitted_at', 'reviewed_at', 'correction_due_at'] as $field) {
            $result[$field] = $application->$field?->toIso8601String();
        }
        if ($admin) {
            $profile = $application->commuter;
            $result['commuter'] = $profile->only(['id', 'first_name', 'middle_name', 'surname', 'birthdate', 'gender', 'contact_number', 'username', 'commuter_type']);
            $result['commuter']['email'] = $profile->user->email;
            if ($withDocument) {
                $result['document_url'] = Storage::disk(self::DOCUMENT_DISK)->temporaryUrl($application->document_path, now()->addMinutes(10));
            }
        }

        return $result;
    }

    private function processAccount(string $id, string $phase, \Closure $work, array &$failures): void
    {
        try {
            DB::transaction($work, 3);
        } catch (\Throwable $error) {
            $failure = ['commuter_id' => $id, 'phase' => $phase];
            $failures[] = $failure;
            Log::error('Student renewal processing failed; retry required.', $failure + ['exception' => $error]);
        }
    }

    public function process(): array
    {
        $failures = [];
        $year = $this->cycleYear();
        $cutoff = $this->cutoff($year);
        CommuterProfile::where('commuter_type', 'STUDENT')->whereHas('user')
            ->where(fn ($q) => $q->whereNull('student_discount_expires_at')->orWhere('student_discount_expires_at', '<=', now()))
            ->select('id')->chunkById(100, function ($profiles) use (&$failures) {
                foreach ($profiles as $candidate) {
                    $this->processAccount($candidate->id, 'expiration', function () use ($candidate) {
                        $profile = CommuterProfile::whereKey($candidate->id)->lockForUpdate()->firstOrFail();
                        if ($profile->commuter_type !== 'STUDENT' || $profile->effectiveFareType() === 'STUDENT') {
                            return;
                        }
                        $applications = $profile->discountApplications()->whereIn('status', ['PENDING', 'NEEDS_CORRECTION'])
                            ->select(['id', 'cycle_year', 'status', 'first_submitted_at', 'correction_due_at'])->orderBy('cycle_year')->lockForUpdate()->get();
                        $protected = false;
                        foreach ($applications as $application) {
                            if ($application->status === 'NEEDS_CORRECTION' && ! $application->correction_due_at?->isFuture()) {
                                $application->update(['status' => 'EXPIRED']);

                                continue;
                            }
                            $protected = $protected || $application->first_submitted_at->lt($this->cutoff($application->cycle_year));
                        }
                        if ($protected) {
                            return;
                        }
                        $profile->update(['commuter_type' => 'REGULAR', 'applied_type' => 'STUDENT']);
                        $this->activity->record(ActivityLogCategory::MEMBER, 'Student renewal expired; converted to Regular: '.$profile->id);
                        $this->announcements->notifyUser($profile->id, 'STUDENT_RENEWAL_DONE', 'Student discount expired', 'Your student renewal deadline has passed. Your account remains available as a Regular commuter. Submit current enrollment proof to apply again.', $profile->id);
                    }, $failures);
                }
            });

        $notice = $this->noticeStartsAt($year);
        $dates = [$notice, $notice->copy()->day(29), $notice->copy()->endOfMonth()->startOfDay()];
        foreach ([1, 8, 15, 22, 29] as $day) {
            $dates[] = $cutoff->copy()->subMonth()->day($day);
        }
        $slot = collect($dates)->last(fn ($date) => $date->lte(now('Asia/Manila')));
        if (! $slot || now('Asia/Manila')->gte($cutoff)) {
            return $failures;
        }
        CommuterProfile::where('commuter_type', 'STUDENT')->whereIn('account_status', ['ACTIVE', 'APPROVED'])->whereHas('user')
            ->where(fn ($q) => $q->whereNull('student_discount_expires_at')->orWhere('student_discount_expires_at', '<=', $cutoff))
            ->whereDoesntHave('discountApplications', fn ($q) => $q->outstanding())
            ->whereDoesntHave('discountApplications', fn ($q) => $q->where('cycle_year', $year)->where('status', 'APPROVED'))
            ->whereNotExists(function ($q) use ($slot) {
                // A reminder's user_id and reference_id are both the commuter's id; only user_id is indexed.
                $q->selectRaw('1')->from('announcements')->whereColumn('announcements.user_id', 'commuter_profiles.id')
                    ->where('type', 'STUDENT_RENEWAL')->where('created_at', '>=', $slot);
            })
            ->select('id')->chunkById(100, function ($profiles) use ($slot, $year, &$failures) {
                foreach ($profiles as $candidate) {
                    $this->processAccount($candidate->id, 'reminder', function () use ($candidate, $slot, $year) {
                        $profile = CommuterProfile::whereKey($candidate->id)->lockForUpdate()->firstOrFail();
                        if ($profile->commuter_type !== 'STUDENT' || $profile->student_discount_expires_at?->gt($this->cutoff($year))
                            || $profile->discountApplications()->outstanding()->exists()
                            || $profile->discountApplications()->where('cycle_year', $year)->where('status', 'APPROVED')->exists()) {
                            return;
                        }
                        if (Announcement::withTrashed()->where('user_id', $profile->id)->where('type', 'STUDENT_RENEWAL')->where('created_at', '>=', $slot)->exists()) {
                            return;
                        }
                        $period = $this->periodLabel($year);
                        $deadline = $this->cutoff($year)->format('F j');
                        $this->announcements->notifyUser($profile->id, 'STUDENT_RENEWAL', 'Annual student renewal', "Renew your student status {$period}. Submit a school ID showing the current school year or valid enrollment proof. Your discount continues throughout the renewal period. Without a submission by {$deadline}, your commuter type becomes Regular. Open Student Renewal to submit proof or choose No Longer a Student.", $profile->id);
                    }, $failures);
                }
            });

        return $failures;
    }
}
