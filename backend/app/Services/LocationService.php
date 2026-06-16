<?php

namespace App\Services;

use App\Enums\CapacityStatus;
use App\Events\VehicleLocationUpdated;
use App\Models\ShiftLog;
use App\Models\Vehicle;
use App\Models\VehicleLocation;
use App\Models\User;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class LocationService
{
    /**
     * Update a vehicle's GPS position.
     *
     * - Requires an active shift (no shift = no GPS update)
     * - Upserts vehicle_locations by vehicle_id (always latest position)
     * - Broadcasts VehicleLocationUpdated via Pusher
     */
    public function updateLocation(
        User $conductor,
        float $lat,
        float $lng,
        ?float $speed = null,
        ?float $heading = null,
        ?string $capacityStatus = null,
    ): VehicleLocation {
        // 1. Validate lat/lng ranges
        if ($lat < -90 || $lat > 90) {
            abort(422, 'Latitude must be between -90 and 90');
        }

        if ($lng < -180 || $lng > 180) {
            abort(422, 'Longitude must be between -180 and 180');
        }

        // 2. Get the conductor's active shift
        $activeShift = ShiftLog::where('conductor_id', $conductor->id)
            ->active()
            ->first();

        if (! $activeShift) {
            abort(422, 'No active shift');
        }

        // 3. Get vehicle_id from the active shift
        $vehicleId = $activeShift->vehicle_id;

        // 4. Upsert vehicle_locations by vehicle_id
        $location = VehicleLocation::updateOrCreate(
            ['vehicle_id' => $vehicleId],
            [
                'conductor_id' => $conductor->id,
                'lat' => $lat,
                'lng' => $lng,
                'speed' => $speed,
                'heading' => $heading,
                'capacity_status' => $capacityStatus ?? CapacityStatus::AVAILABLE->value,
            ],
        );

        // 5. Broadcast the update via Pusher
        $this->broadcastLocationUpdate($vehicleId);

        return $location;
    }

    /**
     * Get all active vehicle locations for the commuter map.
     *
     * - NO distance filter — ALL vehicles visible at ALL times
     * - Joins with vehicles + active shifts + routes
     * - Fallback/initial load endpoint (real-time comes via Pusher)
     * - Ordered by most recently updated first
     */
    public function getAllActiveLocations(): Collection
    {
        return DB::table('vehicle_locations')
            ->join('vehicles', 'vehicle_locations.vehicle_id', '=', 'vehicles.id')
            ->leftJoin('shift_logs', function ($join) {
                $join->on('vehicles.active_shift_id', '=', 'shift_logs.shift_id');
            })
            ->leftJoin('routes', 'shift_logs.route_id', '=', 'routes.id')
            ->select([
                'vehicle_locations.vehicle_id',
                'vehicles.plate_number',
                'vehicles.capacity_status as vehicle_type',
                'vehicle_locations.lat',
                'vehicle_locations.lng',
                'vehicle_locations.speed',
                'vehicle_locations.heading',
                'vehicle_locations.capacity_status',
                'routes.name as route_name',
                'vehicle_locations.updated_at',
            ])
            ->orderBy('vehicle_locations.updated_at', 'desc')
            ->get();
    }

    /**
     * Update a vehicle's capacity status.
     *
     * - Only conductors with an active shift can update
     * - Values restricted to: AVAILABLE, STANDING, FULL
     * - Broadcasts VehicleLocationUpdated via Pusher
     */
    public function updateCapacityStatus(User $conductor, string $status): VehicleLocation
    {
        // 1. Validate status value
        $validStatuses = array_column(CapacityStatus::cases(), 'value');
        if (! in_array($status, $validStatuses)) {
            abort(422, 'Invalid capacity status. Must be: AVAILABLE, STANDING, or FULL');
        }

        // 2. Get the conductor's active shift
        $activeShift = ShiftLog::where('conductor_id', $conductor->id)
            ->active()
            ->first();

        if (! $activeShift) {
            abort(422, 'No active shift');
        }

        // 3. Get vehicle_id from the active shift
        $vehicleId = $activeShift->vehicle_id;

        // 4. Upsert vehicle_locations with new capacity_status
        $location = VehicleLocation::updateOrCreate(
            ['vehicle_id' => $vehicleId],
            [
                'conductor_id' => $conductor->id,
                'capacity_status' => $status,
            ],
        );

        // 5. Broadcast the update via Pusher
        $this->broadcastLocationUpdate($vehicleId);

        return $location;
    }

    /**
     * Build the broadcast payload and fire the event.
     *
     * This is the shared helper used by both GPS updates and capacity
     * status updates — every change triggers a real-time push.
     */
    private function broadcastLocationUpdate(string $vehicleId): void
    {
        $locationData = DB::table('vehicle_locations')
            ->join('vehicles', 'vehicle_locations.vehicle_id', '=', 'vehicles.id')
            ->leftJoin('shift_logs', function ($join) {
                $join->on('vehicles.active_shift_id', '=', 'shift_logs.shift_id');
            })
            ->leftJoin('routes', 'shift_logs.route_id', '=', 'routes.id')
            ->where('vehicle_locations.vehicle_id', $vehicleId)
            ->select([
                'vehicle_locations.vehicle_id',
                'vehicles.plate_number',
                'vehicle_locations.lat',
                'vehicle_locations.lng',
                'vehicle_locations.speed',
                'vehicle_locations.heading',
                'vehicle_locations.capacity_status',
                'routes.name as route_name',
                'vehicle_locations.updated_at',
            ])
            ->first();

        if ($locationData) {
            broadcast(new VehicleLocationUpdated((array) $locationData))->toOthers();
        }
    }
}