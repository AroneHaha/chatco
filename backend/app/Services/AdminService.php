<?php

namespace App\Services;

use App\Models\Vehicle;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class AdminService
{
    /**
     * List vehicles with optional filters + pagination.
     *
     * Supported filters:
     *   - status   (exact match, e.g. ACTIVE / MAINTENANCE / INACTIVE)
     *   - route_id (exact match, UUID)
     *   - search   (LIKE on plate_number OR unit_number)
     *
     * Always eager-loads driver + route (+ conductor) to avoid N+1 in lists.
     *
     * @param  array{status?: string, route_id?: string, search?: string}  $filters
     * @param  int  $perPage  Page size (defaults to 15, matching other list endpoints).
     */
    public function listVehicles(array $filters = [], int $perPage = 15): LengthAwarePaginator
    {
        return Vehicle::query()
            ->with(['route', 'driver', 'conductor'])
            ->when($filters['status'] ?? null, function (Builder $q, string $status) {
                $q->where('status', $status);
            })
            ->when($filters['route_id'] ?? null, function (Builder $q, string $routeId) {
                $q->where('route_id', $routeId);
            })
            ->when($filters['search'] ?? null, function (Builder $q, string $search) {
                $term = "%{$search}%";
                $q->where(function (Builder $sub) use ($term) {
                    $sub->where('plate_number', 'like', $term)
                        ->orWhere('unit_number', 'like', $term);
                });
            })
            ->orderBy('unit_number', 'asc')
            ->paginate($perPage);
    }

    /**
     * Create a new vehicle.
     *
     * plate_number + unit_number uniqueness is enforced by the database
     * (unique indexes) and by the Form Request validation.
     *
     * @param  array  $data  Validated payload from StoreVehicleRequest.
     */
    public function createVehicle(array $data): Vehicle
    {
        return DB::transaction(function () use ($data) {
            return Vehicle::create([
                'unit_number'     => $data['unit_number'],
                'plate_number'    => $data['plate_number'],
                'vehicle_type'    => $data['vehicle_type'] ?? null,
                'route_id'        => $data['route_id'] ?? null,
                'driver_id'       => $data['driver_id'] ?? null,
                'conductor_id'    => $data['conductor_id'] ?? null,
                'status'          => $data['status'] ?? 'ACTIVE',
                'capacity_status' => $data['capacity_status'] ?? 'AVAILABLE',
            ])->fresh(['route', 'driver', 'conductor']);
        });
    }

    /**
     * Update an existing vehicle's mutable fields.
     *
     * @param  array  $data  Validated payload from UpdateVehicleRequest.
     * @throws \Illuminate\Database\Eloquent\ModelNotFoundException  If the vehicle doesn't exist.
     */
    public function updateVehicle(string $id, array $data): Vehicle
    {
        $vehicle = Vehicle::findOrFail($id);

        DB::transaction(function () use ($vehicle, $data) {
            $vehicle->update(array_filter([
                'unit_number'     => $data['unit_number'] ?? null,
                'plate_number'    => $data['plate_number'] ?? null,
                'vehicle_type'    => array_key_exists('vehicle_type', $data) ? $data['vehicle_type'] : null,
                'route_id'        => array_key_exists('route_id', $data) ? $data['route_id'] : null,
                'driver_id'       => array_key_exists('driver_id', $data) ? $data['driver_id'] : null,
                'conductor_id'    => array_key_exists('conductor_id', $data) ? $data['conductor_id'] : null,
                'status'          => $data['status'] ?? null,
                'capacity_status' => $data['capacity_status'] ?? null,
            ], fn ($value) => $value !== null));
        });

        return $vehicle->fresh(['route', 'driver', 'conductor']);
    }

    /**
     * Delete a vehicle — UNLESS it has an active_shift_id, in which case
     * reject with a 409 Conflict so the conductor's active shift is never
     * orphaned.
     *
     * @throws ValidationException  When the vehicle has an active shift.
     * @throws \Illuminate\Database\Eloquent\ModelNotFoundException  If the vehicle doesn't exist.
     */
    public function deleteVehicle(string $id): void
    {
        $vehicle = Vehicle::findOrFail($id);

        if ($vehicle->active_shift_id) {
            throw ValidationException::withMessages([
                'vehicle' => [
                    'Cannot delete a vehicle that is currently on an active shift. ' .
                    'End the shift (via conductor remittance) before deleting.',
                ],
            ]);
        }

        $vehicle->delete();
    }
}
