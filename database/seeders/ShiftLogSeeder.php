<?php

namespace Database\Seeders;

use App\Enums\ShiftStatus;
use App\Models\Driver;
use App\Models\Route;
use App\Models\ShiftLog;
use App\Models\ConductorProfile;
use App\Models\Vehicle;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

/**
 * ShiftLogSeeder — conductor shifts (the parent of transactions + remittances).
 *
 * Creates a realistic spread so the admin Remittance / Shift screens have
 * history to page through:
 *   - Several ENDED shifts across the past ~9 days (these get a matching
 *     Remittance row via RemittanceSeeder).
 *   - Two ACTIVE shifts dated today (these surface as "Pending" in the
 *     Remittance tracker and feed the "Today" summary cards).
 *
 * Depends on: conductors, drivers, vehicles, and a route already existing
 * (seeded by DatabaseSeeder). Shift IDs use the same `SHF-` + random format
 * the app generates at runtime.
 *
 * Run alone with:  php artisan db:seed --class=ShiftLogSeeder
 */
class ShiftLogSeeder extends Seeder
{
    public function run(): void
    {
        $conductors = ConductorProfile::orderBy('created_at')->get();
        $drivers    = Driver::orderBy('created_at')->get();
        $vehicles   = Vehicle::orderBy('created_at')->get();
        $route      = Route::first();

        if ($conductors->isEmpty() || $drivers->isEmpty() || $vehicles->isEmpty()) {
            $this->command?->warn('ShiftLogSeeder skipped — conductors/drivers/vehicles must be seeded first.');
            return;
        }

        // Each row: [dayOffset (days ago), startHour, durationHours, status]
        $plan = [
            [9, 5,  9, ShiftStatus::ENDED],
            [8, 6,  8, ShiftStatus::ENDED],
            [7, 5,  10, ShiftStatus::ENDED],
            [6, 7,  8, ShiftStatus::ENDED],
            [5, 5,  9, ShiftStatus::ENDED],
            [4, 6,  9, ShiftStatus::ENDED],
            [3, 5,  8, ShiftStatus::ENDED],
            [2, 7,  9, ShiftStatus::ENDED],
            [1, 5,  10, ShiftStatus::ENDED],
            [0, 5,  0, ShiftStatus::ACTIVE], // active today (conductor 1)
            [0, 6,  0, ShiftStatus::ACTIVE], // active today (conductor 2)
        ];

        $created = 0;
        $activeSeeded = 0;

        foreach ($plan as $i => [$dayOffset, $startHour, $duration, $status]) {
            $conductor = $conductors[$i % $conductors->count()];
            $driver    = $drivers[$i % $drivers->count()];
            $vehicle   = $vehicles[$i % $vehicles->count()];

            $timeIn = now()->subDays($dayOffset)->setTime($startHour, 0, 0);
            $isActive = $status === ShiftStatus::ACTIVE;
            $timeOut = $isActive ? null : (clone $timeIn)->addHours($duration);

            $conductorName = trim("{$conductor->first_name} {$conductor->last_name}");
            $driverName    = trim("{$driver->first_name} {$driver->last_name}");

            $shiftId = 'SHF-' . strtoupper(Str::random(14));

            ShiftLog::create([
                'shift_id'       => $shiftId,
                'conductor_id'   => $conductor->id,
                'conductor_name' => $conductorName,
                'driver_id'      => $driver->id,
                'driver_name'    => $driverName,
                'vehicle_id'     => $vehicle->id,
                'unit_number'    => $vehicle->unit_number,
                'plate_number'   => $vehicle->plate_number,
                'route_id'       => $route?->id,
                'time_in'        => $timeIn,
                'time_out'       => $timeOut,
                'is_active'      => $isActive,
                'status'         => $status->value,
            ]);

            // An ACTIVE shift must also claim its vehicle + driver, exactly as
            // ShiftService::startShift() does at runtime. Without this the
            // shift row exists but vehicles.active_shift_id stays null, and the
            // admin monitoring query (which keys off that column) shows nothing
            // — the seeded "on shift" conductors were invisible on the live map
            // and in Active Vehicle Tracking.
            if ($isActive) {
                $vehicle->update([
                    'active_shift_id' => $shiftId,
                    'driver_id'       => $driver->id,
                    'conductor_id'    => $conductor->id,
                ]);
                $driver->update(['active_shift_id' => $shiftId]);
                $activeSeeded++;
            }

            // NOTE: no vehicle_locations row is seeded on purpose. Positions are
            // real device GPS, written only by LocationService::updateLocation()
            // when the conductor app broadcasts. Faking them here would put
            // phantom units on the admin + commuter maps that never move and
            // can't be told apart from live ones. A seeded active shift shows as
            // "Awaiting GPS" until its conductor actually logs in.

            $created++;
        }

        $this->command?->info("Seeded {$created} shift logs ({$activeSeeded} active today, awaiting live GPS).");
    }
}
