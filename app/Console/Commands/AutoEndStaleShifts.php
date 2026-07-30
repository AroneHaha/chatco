<?php

namespace App\Console\Commands;

use App\Enums\ShiftStatus;
use App\Models\Driver;
use App\Models\Remittance;
use App\Models\Setting;
use App\Models\ShiftLog;
use App\Models\Vehicle;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * Artisan command: php artisan shifts:auto-end-stale
 *
 * Auto-ends active shifts that have exceeded the `max_shift_hours` limit
 * from the settings table (default 12 hours). This prevents conductors
 * from keeping a shift open indefinitely (e.g. forgot to remit).
 *
 * The command creates a remittance record with the system-tracked totals
 * (same as endShiftViaRemittance) + flips the shift to ENDED + clears the
 * vehicle assignment. The conductor will see the shift in their remittance
 * history as "Auto-Ended".
 *
 * Scheduled to run hourly via routes/console.php:
 *   Schedule::command('shifts:auto-end-stale')->hourly()
 *
 * Production deployment requires the Laravel scheduler:
 *   php artisan schedule:work   (dev)
 *   php artisan schedule:run    (production, via system cron: * * * * *)
 */
class AutoEndStaleShifts extends Command
{
    protected $signature = 'shifts:auto-end-stale';
    protected $description = 'Auto-end active shifts that exceed the max_shift_hours limit from settings';

    public function handle(): int
    {
        $maxHours = (int) (Setting::where('key', 'max_shift_hours')->value('value') ?? 12);

        if ($maxHours <= 0) {
            $this->info("max_shift_hours is {$maxHours} — enforcement disabled.");
            return self::SUCCESS;
        }

        // Find active shifts older than maxHours.
        $cutoff = now()->subHours($maxHours);

        $staleShifts = ShiftLog::where('status', 'ACTIVE')
            ->where('time_in', '<', $cutoff)
            ->limit(50) // Process in batches to avoid memory issues
            ->get();

        if ($staleShifts->isEmpty()) {
            $this->info("No stale shifts found (limit: {$maxHours}h).");
            return self::SUCCESS;
        }

        $this->info("Found {$staleShifts->count()} stale shift(s) to auto-end.");

        $ended = 0;
        foreach ($staleShifts as $shift) {
            try {
                $this->autoEndShift($shift);
                $ended++;
                $this->line("  ✓ Auto-ended shift {$shift->shift_id} (started {$shift->time_in})");
            } catch (\Exception $e) {
                $this->error("  ✗ Failed to auto-end shift {$shift->shift_id}: {$e->getMessage()}");
                Log::error('Auto-end stale shift failed', [
                    'shift_id' => $shift->shift_id,
                    'error' => $e->getMessage(),
                ]);
            }
        }

        $this->info("Auto-ended {$ended} shift(s).");
        return self::SUCCESS;
    }

    /**
     * End a stale shift: compute totals from the DB, create a remittance
     * record, flip the shift to ENDED, clear the vehicle assignment.
     */
    private function autoEndShift(ShiftLog $shift): void
    {
        // Compute totals from the DB (same as ShiftService::endShiftViaRemittance).
        $cashTotal = (float) DB::table('transactions')
            ->where('shift_id', $shift->shift_id)
            ->where('payment_method', 'CASH')
            ->where('status', 'PAID')
            ->sum('final_amount');

        $gcashTotal = (float) DB::table('transactions')
            ->where('shift_id', $shift->shift_id)
            ->where('payment_method', 'GCASH')
            ->where('status', 'PAID')
            ->sum('final_amount');

        $totalPassengers = (int) DB::table('transactions')
            ->where('shift_id', $shift->shift_id)
            ->where('status', 'PAID')
            ->count();

        $shortage = 0; // No shortage for auto-ended shifts (no cash declared).

        // The remittance's business date is the day the shift STARTED (matching
        // the midnight reset + how ENDED shifts are recorded), not the hour it
        // happened to be auto-closed — a shift that ran past midnight must not
        // land on the wrong day's totals. time_in is NOT NULL on shift_logs, so
        // the now() fallback is just defensive.
        $date = optional($shift->time_in)->toDateString() ?? now()->toDateString();
        $timeOut = now();

        DB::transaction(function () use ($shift, $cashTotal, $gcashTotal, $totalPassengers, $shortage, $date, $timeOut) {
            // Create the remittance record. Every NOT-NULL column on the
            // remittances table must be supplied — conductor_name, driver_name,
            // unit_number, vehicle_id, driver_id and time_in have no DB default,
            // and omitting them was throwing a 1364 error that rolled the whole
            // close-out back and left the shift stuck ACTIVE. These all come from
            // the shift row (also NOT NULL there), so they are always present.
            //
            // Idempotency: shift_id is the PRIMARY KEY of remittances, so a
            // second create() for the same shift would throw a duplicate-key
            // error and roll back the close-out. Only insert when none exists.
            if (! Remittance::where('shift_id', $shift->shift_id)->exists()) {
                Remittance::create([
                    'shift_id'          => $shift->shift_id,
                    'conductor_id'      => $shift->conductor_id,
                    'driver_id'         => $shift->driver_id,
                    'vehicle_id'        => $shift->vehicle_id,
                    'date'              => $date,
                    'conductor_name'    => $shift->conductor_name,
                    'driver_name'       => $shift->driver_name,
                    'unit_number'       => $shift->unit_number,
                    'total_passengers'  => $totalPassengers,
                    'time_in'           => $shift->time_in,
                    'time_out'          => $timeOut,
                    'total_collected'   => $cashTotal,
                    'remitted_amount'   => $cashTotal,
                    'shortage'          => $shortage,
                    'cash_total'        => $cashTotal,
                    'gcash_total'       => $gcashTotal,
                    'remittance_status' => $shortage > 0 ? 'SHORTAGE' : 'COMPLETE',
                ]);
            }

            // Flip the shift to ENDED.
            $shift->update([
                'status'    => ShiftStatus::ENDED->value,
                'is_active' => false,
                'time_out'  => $timeOut,
            ]);

            // Clear the vehicle assignment.
            Vehicle::where('active_shift_id', $shift->shift_id)->update([
                'active_shift_id' => null,
                'driver_id'       => null,
                'conductor_id'    => null,
            ]);

            // Clear the driver's active_shift_id if applicable.
            if ($shift->driver_id) {
                Driver::where('id', $shift->driver_id)
                    ->where('active_shift_id', $shift->shift_id)
                    ->update(['active_shift_id' => null]);
            }
        });

        Log::info('Shift auto-ended (exceeded max_shift_hours)', [
            'shift_id' => $shift->shift_id,
            'conductor_id' => $shift->conductor_id,
            'time_in' => $shift->time_in?->toDateTimeString(),
        ]);
    }
}
