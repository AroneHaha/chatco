<?php

namespace App\Services;

use App\Enums\ShiftStatus;
use App\Models\Setting;
use App\Models\ShiftLog;
use App\Models\Vehicle;
use App\Models\VehicleLocation;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * Clears the previous day's fleet state: ends shifts still open from an
 * earlier day and removes unit assignments dated before today.
 *
 * The scheduler can't be relied on (shared Hostinger cron doesn't run), so
 * runIfDue() is also called from admin login, the admin dashboard and
 * conductor login. The first call of the day does the work and stores the
 * date; every later call sees today's date and returns at once.
 *
 * Only previous-day data is touched: a shift started today, or a unit
 * assigned today (ShiftService::startShift stamps assignment_date), is never
 * cleared. Ending a shift goes through ShiftCloseoutService, so a shift with
 * cash owed keeps a PENDING, not-remitted remittance the conductor must
 * still settle.
 */
final class DailyAssignmentResetService
{
    public const LAST_RUN_KEY = 'daily_assignment_reset_date';

    private const LOCK_KEY = 'daily-assignment-reset';

    public function __construct(private ShiftCloseoutService $closeoutService) {}

    /** Run the reset once per Manila day; safe to call on every login. */
    public function runIfDue(): void
    {
        $today = now('Asia/Manila')->toDateString();
        if ($this->lastRunDate() === $today) {
            return;
        }

        // Non-blocking: a second login arriving mid-run skips instead of
        // waiting, and the reset itself re-checks every row it touches.
        Cache::lock(self::LOCK_KEY, 120)->get(function () use ($today): void {
            if ($this->lastRunDate() === $today) {
                return;
            }

            $result = $this->reset();

            // A failed closeout is retried by the next call instead of being
            // marked done for the day.
            if ($result['failed'] === 0) {
                Setting::query()->updateOrCreate(
                    ['key' => self::LAST_RUN_KEY],
                    ['value' => $today, 'category' => 'operations'],
                );
            }
        });
    }

    /**
     * End previous-day shifts and clear previous-day unit assignments.
     *
     * @return array{closed: int, cleared: int, failed: int}
     */
    public function reset(): array
    {
        $dayStart = now('Asia/Manila')->startOfDay();
        $closed = 0;
        $failed = 0;
        $cleared = 0;

        ShiftLog::query()
            ->where('status', ShiftStatus::ACTIVE->value)
            ->where('time_in', '<', $dayStart)
            ->orderBy('shift_id')
            ->chunkById(100, function ($shifts) use (&$closed, &$failed): void {
                foreach ($shifts as $shift) {
                    try {
                        $result = $this->closeoutService->close(
                            $shift->shift_id,
                            null,
                            ShiftCloseoutService::REASON_MIDNIGHT,
                        );
                        if ($result->status === ShiftStatus::ENDED) {
                            $closed++;
                        }
                    } catch (\Throwable $error) {
                        $failed++;
                        Log::error('Midnight shift closeout failed', [
                            'shift_id' => $shift->shift_id,
                            'exception' => $error::class,
                            'message' => $error->getMessage(),
                        ]);
                    }
                }
            }, 'shift_id', 'shift_id');

        Vehicle::query()
            ->whereNull('active_shift_id')
            ->where(function ($query) use ($dayStart): void {
                $query->whereNull('assignment_date')
                    ->orWhere('assignment_date', '<', $dayStart->toDateString());
            })
            ->orderBy('id')
            ->chunkById(100, function ($vehicles) use (&$cleared): void {
                foreach ($vehicles as $candidate) {
                    DB::transaction(function () use ($candidate, &$cleared): void {
                        $vehicle = Vehicle::query()->whereKey($candidate->id)->lockForUpdate()->first();
                        if (! $vehicle || $vehicle->active_shift_id !== null) {
                            return;
                        }

                        $today = now('Asia/Manila')->toDateString();
                        if ($vehicle->assignment_date?->toDateString() === $today) {
                            return;
                        }

                        $vehicle->update([
                            'driver_id' => null,
                            'conductor_id' => null,
                            'assignment_date' => null,
                            'assignment_approved_at' => null,
                        ]);
                        VehicleLocation::query()->where('vehicle_id', $vehicle->id)->delete();
                        $cleared++;
                    }, 3);
                }
            });

        return ['closed' => $closed, 'cleared' => $cleared, 'failed' => $failed];
    }

    private function lastRunDate(): ?string
    {
        return Setting::query()->where('key', self::LAST_RUN_KEY)->value('value');
    }
}
