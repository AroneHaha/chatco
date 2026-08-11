<?php

namespace App\Services;

use App\Enums\ShiftStatus;
use App\Models\ConductorProfile;
use App\Models\Driver;
use App\Models\ShiftLog;
use App\Models\User;
use App\Models\Vehicle;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class ShiftService
{
    public function __construct(
        private ShiftCloseoutService $closeoutService,
    ) {}

    /** Start a shift only from the Admin-approved current-day assignment. */
    public function startShift(User $conductor, string $vehicleId, string $driverId, ?string $routeId = null): ShiftLog
    {
        if (! $conductor->isConductor()) {
            abort(403, 'Forbidden');
        }

        $profileId = $conductor->conductorProfile?->id;
        if (! $profileId) {
            abort(422, 'Conductor profile required');
        }

        return DB::transaction(function () use ($profileId, $vehicleId, $driverId, $routeId) {
            // Locking the profile serializes simultaneous starts by one conductor.
            $profile = ConductorProfile::query()->whereKey($profileId)->lockForUpdate()->firstOrFail();
            $vehicle = Vehicle::query()->whereKey($vehicleId)->lockForUpdate()->firstOrFail();
            $driver = Driver::query()->whereKey($driverId)->lockForUpdate()->firstOrFail();

            if (ShiftLog::query()->where('conductor_id', $profileId)->active()->exists()) {
                abort(409, 'Already on active shift');
            }
            if ($driver->active_shift_id || ShiftLog::query()->where('driver_id', $driverId)->active()->exists()) {
                abort(409, 'Driver already on active shift');
            }
            if ($vehicle->active_shift_id || ShiftLog::query()->where('vehicle_id', $vehicleId)->active()->exists()) {
                abort(409, 'Vehicle already on active shift');
            }
            if ($vehicle->status !== 'ACTIVE' || $driver->status !== 'ACTIVE') {
                abort(422, 'The assigned vehicle and driver must both be active.');
            }

            $operationalDate = now('Asia/Manila')->toDateString();
            if ($vehicle->conductor_id !== null && $vehicle->conductor_id !== $profileId) {
                abort(403, 'Vehicle is assigned to another conductor.');
            }
            if ($vehicle->driver_id !== null && $vehicle->driver_id !== $driverId) {
                abort(403, 'Vehicle is assigned to another driver.');
            }
            $driverAssignedToAnotherConductor = Vehicle::query()
                ->where('driver_id', $driverId)
                ->where('id', '!=', $vehicleId)
                ->whereNotNull('conductor_id')
                ->where('conductor_id', '!=', $profileId)
                ->exists();
            if ($driverAssignedToAnotherConductor) {
                abort(403, 'Driver is assigned to another conductor.');
            }

            if ($routeId !== null && $vehicle->route_id !== null && $routeId !== $vehicle->route_id) {
                abort(422, 'The selected route does not match the approved vehicle assignment.');
            }

            $shiftId = 'SHF-'.strtoupper(Str::random(14));
            $shift = ShiftLog::create([
                'shift_id' => $shiftId,
                'conductor_id' => $profileId,
                'driver_id' => $driverId,
                'vehicle_id' => $vehicleId,
                'route_id' => $routeId ?? $vehicle->route_id,
                'time_in' => now(),
                'time_out' => null,
                'is_active' => true,
                'status' => ShiftStatus::ACTIVE->value,
                'conductor_name' => trim($profile->first_name.' '.$profile->last_name),
                'driver_name' => trim($driver->first_name.' '.$driver->last_name),
                'unit_number' => $vehicle->unit_number,
                'plate_number' => $vehicle->plate_number,
            ]);

            $vehicle->update([
                'active_shift_id' => $shiftId,
                'driver_id' => $driverId,
                'conductor_id' => $profileId,
                'assignment_date' => $operationalDate,
                'assignment_approved_at' => now(),
            ]);
            $driver->update(['active_shift_id' => $shiftId]);

            return $shift;
        }, 3);
    }

    /**
     * Submit physical cash and end an active shift, or resolve the PENDING
     * obligation created earlier by stale/midnight automatic closeout.
     */
    public function endShiftViaRemittance(
        User $conductor,
        string $shiftId,
        float $totalCollected,
        float $remittedAmount,
    ): ShiftLog {
        if (! $conductor->isConductor()) {
            abort(403, 'Forbidden');
        }

        $profileId = $conductor->conductorProfile?->id;
        if (! $profileId) {
            abort(422, 'Conductor profile required');
        }

        // Expected cash is intentionally never trusted from the request.
        unset($totalCollected);

        return $this->closeoutService->close(
            $shiftId,
            $remittedAmount,
            ShiftCloseoutService::REASON_MANUAL,
            $profileId,
        );
    }

    public function setBreakStatus(User $conductor, bool $isOnBreak): ShiftLog
    {
        if (! $conductor->isConductor()) {
            abort(403, 'Forbidden');
        }

        return DB::transaction(function () use ($conductor, $isOnBreak) {
            $shift = ShiftLog::query()
                ->where('conductor_id', $conductor->conductorProfile?->id)
                ->active()
                ->lockForUpdate()
                ->first();

            if (! $shift) {
                abort(422, 'No active shift');
            }

            $shift->update([
                'is_on_break' => $isOnBreak,
                'break_started_at' => $isOnBreak ? ($shift->break_started_at ?? now()) : null,
            ]);

            return $shift->fresh(['vehicle', 'driver', 'route']);
        }, 3);
    }

    public function getActiveShift(User $conductor): ?ShiftLog
    {
        return ShiftLog::query()
            ->where('conductor_id', $conductor->conductorProfile?->id)
            ->active()
            ->with(['vehicle', 'driver', 'route'])
            ->first();
    }

    public function getShiftLogs(User $conductor, int $perPage = 15): LengthAwarePaginator
    {
        return ShiftLog::query()
            ->where('conductor_id', $conductor->conductorProfile?->id)
            ->with(['vehicle', 'driver', 'route'])
            ->orderByDesc('time_in')
            ->paginate($perPage);
    }

    public function getShiftDetail(User $conductor, string $shiftId): ShiftLog
    {
        $shift = ShiftLog::query()
            ->where('shift_id', $shiftId)
            ->with(['vehicle', 'driver', 'route', 'remittance', 'transactions'])
            ->firstOrFail();

        if ($shift->conductor_id !== $conductor->conductorProfile?->id) {
            abort(403, 'Forbidden');
        }

        return $shift;
    }
}
