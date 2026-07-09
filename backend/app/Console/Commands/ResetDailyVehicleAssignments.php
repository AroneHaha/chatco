<?php

namespace App\Console\Commands;

use App\Models\Vehicle;
use Illuminate\Console\Command;

/**
 * Artisan command: php artisan vehicles:reset-daily-assignments
 *
 * Automatic daily reset (12:00 AM). Clears the CURRENT driver, conductor,
 * and active-shift assignment on EVERY vehicle so each unit starts the new
 * day with no active personnel.
 *
 * Data integrity: this command NEVER touches historical records. The
 * shift_logs table (append-only, soft-deletable audit trail of every
 * shift ever worked) and the remittances table remain fully intact —
 * only the mutable "current assignment" columns on the vehicles table
 * are reset to null.
 *
 * Scheduled to run daily at 00:00 via routes/console.php:
 *   Schedule::command('vehicles:reset-daily-assignments')->dailyAt('00:00')
 *
 * Production deployment requires the Laravel scheduler to be running:
 *   php artisan schedule:work   (dev)
 *   php artisan schedule:run    (production, via system cron: * * * * *)
 *
 * The command can also be run manually for testing/ops:
 *   php artisan vehicles:reset-daily-assignments
 */
class ResetDailyVehicleAssignments extends Command
{
    /**
     * @var string
     */
    protected $signature = 'vehicles:reset-daily-assignments';

    /**
     * @var string
     */
    protected $description = 'Clear current driver + conductor + active shift on all vehicles (daily 12AM reset). Historical shift_logs are untouched.';

    /**
     * Execute the console command.
     *
     * Performs a single bulk UPDATE on the vehicles table (soft-delete scope
     * excludes trashed vehicles) setting driver_id, conductor_id, and
     * active_shift_id to NULL. Returns the number of affected rows.
     */
    public function handle(): int
    {
        $affected = Vehicle::query()->update([
            'driver_id'       => null,
            'conductor_id'    => null,
            'active_shift_id' => null,
        ]);

        $this->info("{$affected} vehicle(s) reset — current driver/conductor/shift cleared.");

        return self::SUCCESS;
    }
}
