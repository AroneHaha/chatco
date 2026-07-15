<?php

namespace App\Console\Commands;

use App\Models\Setting;
use App\Models\ShiftLog;
use App\Services\ShiftService;
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

        DB::transaction(function () use ($shift, $cashTotal, $gcashTotal, $totalPassengers, $shortage) {
            // Create a remittance record.
            \App\Models\Remittance::create([
                'shift_id'           => $shift->shift_id,
                'conductor_id'       => $shift->conductor_id,
                'date'               => now()->toDateString(),
                'total_collected'    => $cashTotal,
                'remitted_amount'    => $cashTotal,
                'shortage'           => $shortage,
                'cash_total'         => $cashTotal,
                'gcash_total'        => $gcashTotal,
                'total_passengers'   => $totalPassengers,
                'remittance_status'  => $shortage > 0 ? 'SHORTAGE' : 'COMPLETE',
            ]);

            // Flip the shift to ENDED.
            $shift->update([
                'status'   => 'ENDED',
                'is_active' => false,
                'time_out'  => now(),
            ]);

            // Clear the vehicle assignment.
            \App\Models\Vehicle::where('active_shift_id', $shift->shift_id)->update([
                'active_shift_id' => null,
                'driver_id'       => null,
                'conductor_id'    => null,
            ]);

            // Clear the driver's active_shift_id if applicable.
            if ($shift->driver_id) {
                \App\Models\Driver::where('id', $shift->driver_id)
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
