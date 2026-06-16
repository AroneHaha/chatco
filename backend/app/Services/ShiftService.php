<?php

namespace App\Services;

use App\Enums\ShiftStatus;
use App\Enums\UserRole;
use App\Models\Driver;
use App\Models\Remittance;
use App\Models\ShiftLog;
use App\Models\User;
use App\Models\Vehicle;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class ShiftService
{
    /**
     * Start a new shift for a conductor.
     *
     * Validates that conductor, driver, and vehicle are all available
     * (not already on an active shift), then creates the shift record
     * and links it to both the vehicle and driver.
     *
     * @throws \Symfony\Component\HttpKernel\Exception\HttpException
     */
    public function startShift(User $conductor, string $vehicleId, string $driverId, ?string $routeId = null): ShiftLog
    {
        // 1. Validate conductor role
        if (! $conductor->isConductor()) {
            abort(403, 'Forbidden');
        }

        // 2. Check conductor has no existing active shift
        $existingConductorShift = ShiftLog::where('conductor_id', $conductor->id)
            ->active()
            ->exists();

        if ($existingConductorShift) {
            abort(409, 'Already on active shift');
        }

        // 3. Check driver is not already on another active shift
        $existingDriverShift = ShiftLog::where('driver_id', $driverId)
            ->active()
            ->exists();

        if ($existingDriverShift) {
            abort(409, 'Driver already on active shift');
        }

        // 4. Check vehicle is not already on another active shift
        $existingVehicleShift = ShiftLog::where('vehicle_id', $vehicleId)
            ->active()
            ->exists();

        if ($existingVehicleShift) {
            abort(409, 'Vehicle already on active shift');
        }

        // 5. Verify vehicle and driver exist
        $vehicle = Vehicle::findOrFail($vehicleId);
        $driver = Driver::findOrFail($driverId);

        // 6. Get conductor profile for denormalized name
        $conductorProfile = $conductor->conductorProfile;

        // 7. Generate shift ID and create shift record
        $shiftId = 'SHF-' . strtoupper(Str::random(14));

        return DB::transaction(function () use ($conductor, $vehicleId, $driverId, $routeId, $vehicle, $driver, $conductorProfile, $shiftId) {
            $shiftLog = ShiftLog::create([
                'shift_id' => $shiftId,
                'conductor_id' => $conductor->id,
                'driver_id' => $driverId,
                'vehicle_id' => $vehicleId,
                'route_id' => $routeId,
                'time_in' => now(),
                'time_out' => null,
                'status' => ShiftStatus::ACTIVE->value,
                'conductor_name' => $conductorProfile
                    ? trim($conductorProfile->first_name . ' ' . $conductorProfile->last_name)
                    : null,
                'driver_name' => trim($driver->first_name . ' ' . $driver->last_name),
                'plate_number' => $vehicle->plate_number,
                'total_trips' => 0,
            ]);

            // 8. Set active_shift_id on vehicle and driver
            $vehicle->update(['active_shift_id' => $shiftId]);
            $driver->update(['active_shift_id' => $shiftId]);

            return $shiftLog;
        });
    }

    /**
     * End a shift via remittance submission.
     *
     * The shift ends ONLY when a remittance is submitted.
     * No standalone end-shift — remittance IS the end trigger.
     *
     * @throws \Symfony\Component\HttpKernel\Exception\HttpException
     */
    public function endShiftViaRemittance(
        User $conductor,
        string $shiftId,
        float $totalCollected,
        float $remittedAmount,
    ): ShiftLog {
        // 1. Validate conductor role
        if (! $conductor->isConductor()) {
            abort(403, 'Forbidden');
        }

        // 2. Find the shift
        $shiftLog = ShiftLog::where('shift_id', $shiftId)->firstOrFail();

        // 3. Validate the shift belongs to this conductor
        if ($shiftLog->conductor_id !== $conductor->id) {
            abort(403, 'Forbidden');
        }

        // 4. Validate shift is still ACTIVE
        if ($shiftLog->status !== ShiftStatus::ACTIVE->value) {
            abort(422, 'Shift is not active');
        }

        // 5. Calculate shortage
        $shortage = max(0, $totalCollected - $remittedAmount);

        return DB::transaction(function () use ($shiftLog, $totalCollected, $remittedAmount, $shortage, $conductor) {
            // 6. Create remittance record
            Remittance::create([
                'shift_id' => $shiftLog->shift_id,
                'conductor_id' => $shiftLog->conductor_id,
                'driver_id' => $shiftLog->driver_id,
                'vehicle_id' => $shiftLog->vehicle_id,
                'total_collected' => $totalCollected,
                'remitted_amount' => $remittedAmount,
                'shortage' => $shortage,
                'remittance_status' => $shortage > 0 ? 'SHORTAGE' : 'COMPLETE',
                'remitted_at' => now(),
            ]);

            // 7. Update shift: status ENDED, time_out now
            $shiftLog->update([
                'status' => ShiftStatus::ENDED->value,
                'time_out' => now(),
            ]);

            // 8. Clear active_shift_id on vehicle and driver
            if ($shiftLog->vehicle_id) {
                Vehicle::where('id', $shiftLog->vehicle_id)
                    ->update(['active_shift_id' => null]);
            }

            if ($shiftLog->driver_id) {
                Driver::where('id', $shiftLog->driver_id)
                    ->update(['active_shift_id' => null]);
            }

            return $shiftLog->fresh();
        });
    }

    /**
     * Get the conductor's current active shift.
     * Returns null if no active shift.
     */
    public function getActiveShift(User $conductor): ?ShiftLog
    {
        return ShiftLog::where('conductor_id', $conductor->id)
            ->active()
            ->with(['vehicle', 'driver', 'route'])
            ->first();
    }

    /**
     * Get paginated shift history for the conductor.
     * Ordered by time_in DESC (most recent first).
     */
    public function getShiftLogs(User $conductor, int $perPage = 15): LengthAwarePaginator
    {
        return ShiftLog::where('conductor_id', $conductor->id)
            ->with(['vehicle', 'driver', 'route'])
            ->orderBy('time_in', 'desc')
            ->paginate($perPage);
    }

    /**
     * Get a single shift detail with all relationships.
     * Validates that the shift belongs to this conductor.
     *
     * @throws \Symfony\Component\HttpKernel\Exception\HttpException
     */
    public function getShiftDetail(User $conductor, string $shiftId): ShiftLog
    {
        $shiftLog = ShiftLog::where('shift_id', $shiftId)
            ->with(['vehicle', 'driver', 'route', 'remittance', 'transactions'])
            ->firstOrFail();

        if ($shiftLog->conductor_id !== $conductor->id) {
            abort(403, 'Forbidden');
        }

        return $shiftLog;
    }
}