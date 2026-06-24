<?php

namespace App\Services;

use App\Enums\ShiftStatus;
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
     */
    public function startShift(User $conductor, string $vehicleId, string $driverId, ?string $routeId = null): ShiftLog
    {
        if (! $conductor->isConductor()) {
            abort(403, 'Forbidden');
        }

        if (ShiftLog::where('conductor_id', $conductor->id)->active()->exists()) {
            abort(409, 'Already on active shift');
        }

        if (ShiftLog::where('driver_id', $driverId)->active()->exists()) {
            abort(409, 'Driver already on active shift');
        }

        if (ShiftLog::where('vehicle_id', $vehicleId)->active()->exists()) {
            abort(409, 'Vehicle already on active shift');
        }

        $vehicle = Vehicle::findOrFail($vehicleId);
        $driver = Driver::findOrFail($driverId);
        $conductorProfile = $conductor->conductorProfile;

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
                'is_active' => true,
                'status' => ShiftStatus::ACTIVE->value,
                'conductor_name' => $conductorProfile
                    ? trim($conductorProfile->first_name . ' ' . $conductorProfile->last_name)
                    : $conductor->email,
                'driver_name' => trim($driver->first_name . ' ' . $driver->last_name),
                'unit_number' => $vehicle->unit_number,
                'plate_number' => $vehicle->plate_number,
            ]);

            $vehicle->update(['active_shift_id' => $shiftId]);
            $driver->update(['active_shift_id' => $shiftId]);

            return $shiftLog;
        });
    }

    /**
     * End a shift via remittance submission.
     * Shift ends ONLY when remittance is submitted.
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

        $shiftLog = ShiftLog::where('shift_id', $shiftId)->firstOrFail();

        if ($shiftLog->conductor_id !== $conductor->id) {
            abort(403, 'Forbidden');
        }

        if ($shiftLog->status !== ShiftStatus::ACTIVE) {
            abort(422, 'Shift is not active');
        }

        $shortage = max(0, $totalCollected - $remittedAmount);

        // ─── Compute cash_total and gcash_total DIRECTLY from the DB ───
        $shiftIdValue = $shiftLog->getRawOriginal('shift_id');

        $cashTotal = (float) DB::selectOne(
            "SELECT COALESCE(SUM(final_amount), 0) as total FROM transactions WHERE shift_id = ? AND payment_method = 'CASH' AND status = 'PAID'",
            [$shiftIdValue]
        )->total;

        $gcashTotal = (float) DB::selectOne(
            "SELECT COALESCE(SUM(final_amount), 0) as total FROM transactions WHERE shift_id = ? AND payment_method = 'GCASH' AND status = 'PAID'",
            [$shiftIdValue]
        )->total;

        $totalPassengers = (int) DB::selectOne(
            "SELECT COUNT(*) as cnt FROM transactions WHERE shift_id = ? AND status = 'PAID'",
            [$shiftIdValue]
        )->cnt;

        $timeOut = now();

        return DB::transaction(function () use ($shiftLog, $totalCollected, $remittedAmount, $shortage, $timeOut, $cashTotal, $gcashTotal, $totalPassengers) {
            Remittance::create([
                'shift_id' => $shiftLog->shift_id,
                'conductor_id' => $shiftLog->conductor_id,
                'driver_id' => $shiftLog->driver_id,
                'vehicle_id' => $shiftLog->vehicle_id,
                'date' => $shiftLog->time_in->toDateString(),
                'conductor_name' => $shiftLog->conductor_name,
                'driver_name' => $shiftLog->driver_name,
                'unit_number' => $shiftLog->unit_number,
                'total_passengers' => $totalPassengers,
                'time_in' => $shiftLog->time_in,
                'time_out' => $timeOut,
                'total_collected' => $totalCollected,
                'remitted_amount' => $remittedAmount,
                'shortage' => $shortage,
                'cash_total' => $cashTotal,
                'gcash_total' => $gcashTotal,
                'remittance_status' => $shortage > 0 ? 'SHORTAGE' : 'COMPLETE',
            ]);

            $shiftLog->update([
                'status' => ShiftStatus::ENDED->value,
                'is_active' => false,
                'time_out' => $timeOut,
            ]);

            if ($shiftLog->vehicle_id) {
                Vehicle::where('id', $shiftLog->vehicle_id)->update(['active_shift_id' => null]);
            }

            if ($shiftLog->driver_id) {
                Driver::where('id', $shiftLog->driver_id)->update(['active_shift_id' => null]);
            }

            return $shiftLog->fresh();
        });
    }

    /**
     * Get the conductor's current active shift.
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