<?php

namespace App\Services;

use App\Enums\CapacityStatus;
use App\Events\VehicleLocationUpdated;
use App\Models\OverspeedEvent;
use App\Models\Setting;
use App\Models\ShiftLog;
use App\Models\User;
use App\Models\Vehicle;
use App\Models\VehicleLocation;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class LocationService
{
    public function __construct(private ShiftDeviceService $shiftDeviceService) {}

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
        ?float $accuracy = null,
        ?string $fixTimestamp = null,
        ?string $deviceId = null,
        ?string $deviceType = null,
    ): VehicleLocation {
        // 1. Validate lat/lng ranges
        if ($lat < -90 || $lat > 90) {
            abort(422, 'Latitude must be between -90 and 90');
        }

        if ($lng < -180 || $lng > 180) {
            abort(422, 'Longitude must be between -180 and 180');
        }

        return $this->updateShiftAwareLocation(
            $conductor,
            $lat,
            $lng,
            $speed,
            $heading,
            $capacityStatus,
            $accuracy,
            $fixTimestamp,
            $deviceId,
            $deviceType,
        );
    }

    /**
     * The current speed limit in km/h (settings `speed_limit_kmh`, default 50),
     * cached briefly so high-frequency GPS pings don't hammer the settings table.
     *
     * The default is the fallback only — an admin-set `speed_limit_kmh` row in
     * settings still wins, so the Operations Rules screen keeps full control.
     *
     * NOTE: the Cache::remember TTL means a changed limit takes up to 60s to
     * take effect on live pings.
     */
    private function speedLimitKmh(): int
    {
        return (int) Cache::remember('overspeed.limit_kmh', 60, function () {
            return (int) (Setting::where('key', 'speed_limit_kmh')->value('value') ?? 50);
        });
    }

    private function updateShiftAwareLocation(
        User $conductor,
        float $lat,
        float $lng,
        ?float $speed,
        ?float $heading,
        ?string $capacityStatus,
        ?float $accuracy,
        ?string $fixTimestamp,
        ?string $deviceId,
        ?string $deviceType,
    ): VehicleLocation {
        if ($speed !== null && ($speed < 0 || $speed > 160)) {
            abort(422, 'Reported speed is outside the supported 0-160 km/h range.');
        }
        if ($accuracy !== null && ($accuracy < 0 || $accuracy > 1000)) {
            abort(422, 'GPS accuracy must be between 0 and 1000 metres.');
        }

        $fixAt = $fixTimestamp ? Carbon::parse($fixTimestamp) : now();
        if ($fixAt->lt(now()->subMinutes(2)) || $fixAt->gt(now()->addMinute())) {
            abort(422, 'The GPS sample is stale or has an invalid timestamp.');
        }

        return DB::transaction(function () use ($conductor, $lat, $lng, $speed, $heading, $capacityStatus, $accuracy, $fixAt, $deviceId, $deviceType) {
            $shift = ShiftLog::query()
                ->where('conductor_id', $conductor->conductorProfile?->id)
                ->active()
                ->lockForUpdate()
                ->first();

            if (! $shift) {
                abort(422, 'No active shift');
            }

            $this->shiftDeviceService->assertCanOperate($shift, $deviceId, $deviceType);

            $vehicle = Vehicle::query()->whereKey($shift->vehicle_id)->lockForUpdate()->firstOrFail();
            if ($vehicle->active_shift_id !== $shift->shift_id) {
                abort(409, 'The vehicle is no longer assigned to this shift.');
            }

            $location = VehicleLocation::query()
                ->where('vehicle_id', $vehicle->id)
                ->lockForUpdate()
                ->first() ?? new VehicleLocation(['vehicle_id' => $vehicle->id]);

            $effectiveSpeed = $speed;
            if ($location->exists && $location->shift_id === $shift->shift_id
                && $location->lat !== null && $location->lng !== null && $location->fix_recorded_at) {
                $milliseconds = $location->fix_recorded_at->diffInMilliseconds($fixAt, false);
                if ($milliseconds <= 0) {
                    abort(422, 'The GPS sample is older than the latest accepted fix.');
                }

                $derivedSpeed = ($this->distanceMetres(
                    (float) $location->lat,
                    (float) $location->lng,
                    $lat,
                    $lng,
                ) / ($milliseconds / 1000)) * 3.6;

                if ($derivedSpeed > 180 && ($accuracy ?? 100) <= 50) {
                    abort(422, 'The GPS sample represents an impossible location jump.');
                }
                $effectiveSpeed ??= $derivedSpeed;
            }

            $isNewShiftSnapshot = ! $location->exists || $location->shift_id !== $shift->shift_id;
            $location->fill([
                'shift_id' => $shift->shift_id,
                'conductor_id' => $conductor->id,
                'lat' => $lat,
                'lng' => $lng,
                'speed' => $effectiveSpeed,
                'heading' => $heading,
                'accuracy_m' => $accuracy,
                'fix_recorded_at' => $fixAt,
            ]);
            if ($capacityStatus !== null) {
                $location->capacity_status = $capacityStatus;
            } elseif ($isNewShiftSnapshot) {
                $location->capacity_status = CapacityStatus::AVAILABLE->value;
            }
            $location->save();

            // A poor-quality fix may still keep the map usable, but must not
            // create or increase a speeding record.
            if ($effectiveSpeed !== null && ($accuracy === null || $accuracy <= 50)) {
                $this->recordOverspeedAtomic($shift, $effectiveSpeed, $lat, $lng, $accuracy);
            }

            DB::afterCommit(fn () => $this->broadcastLocationUpdate($vehicle->id));

            return $location;
        }, 3);
    }

    private function recordOverspeedAtomic(
        ShiftLog $shift,
        float $speed,
        float $lat,
        float $lng,
        ?float $accuracy,
    ): void {
        $threshold = $this->speedLimitKmh();
        if ($threshold < 1 || $threshold > 120) {
            return;
        }

        $openEvent = OverspeedEvent::query()
            ->where('shift_id', $shift->shift_id)
            ->whereNull('ended_at')
            ->lockForUpdate()
            ->first();

        if ($speed <= $threshold) {
            // Speed is back at/under the limit — close the open episode, if any.
            $openEvent?->update(['ended_at' => now()]);

            return;
        }

        $roundedSpeed = (int) round($speed);
        $event = $openEvent ?? new OverspeedEvent(['shift_id' => $shift->shift_id]);

        $event->fill([
            'conductor_id' => $shift->conductor_id,
            'driver_id' => $shift->driver_id,
            'vehicle_id' => $shift->vehicle_id,
            'conductor_name' => $shift->conductor_name,
            'driver_name' => $shift->driver_name,
            'unit_number' => $shift->unit_number,
            'plate_number' => $shift->plate_number,
            'top_speed' => max((int) ($event->top_speed ?? 0), $roundedSpeed),
            'threshold' => $threshold,
            'latitude' => $roundedSpeed >= (int) ($event->top_speed ?? 0) ? $lat : $event->latitude,
            'longitude' => $roundedSpeed >= (int) ($event->top_speed ?? 0) ? $lng : $event->longitude,
            'accuracy_m' => $roundedSpeed >= (int) ($event->top_speed ?? 0) ? $accuracy : $event->accuracy_m,
            'date' => $event->date ?? now()->toDateString(),
            'last_logged_at' => now(),
        ])->save();
    }

    private function distanceMetres(float $lat1, float $lng1, float $lat2, float $lng2): float
    {
        $earthRadius = 6371000.0;
        $latDelta = deg2rad($lat2 - $lat1);
        $lngDelta = deg2rad($lng2 - $lng1);
        $a = sin($latDelta / 2) ** 2
            + cos(deg2rad($lat1)) * cos(deg2rad($lat2)) * sin($lngDelta / 2) ** 2;

        return $earthRadius * 2 * atan2(sqrt($a), sqrt(1 - $a));
    }

    /**
     * Record/refresh the overspeeding history for a shift.
     *
     * One row per episode (a continuous stretch above the limit). While a
     * ping stays over the limit, the open episode's top_speed is raised and
     * last_logged_at refreshed. A ping at/under the limit closes the open
     * episode (sets ended_at); the next ping over the limit starts a new one.
     */
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
            // Only show vehicles that have an ACTIVE shift. After remittance,
            // active_shift_id is set to null — the vehicle should disappear
            // from the commuter map immediately.
            ->whereNotNull('vehicles.active_shift_id')
            ->whereColumn('vehicle_locations.shift_id', 'vehicles.active_shift_id')
            // lat/lng are nullable — a capacity-status-only update creates a row
            // before the first GPS fix arrives. Those rows must not reach the
            // commuter map, which would plot them at (null, null).
            ->whereNotNull('vehicle_locations.lat')
            ->whereNotNull('vehicle_locations.lng')
            ->leftJoin('shift_logs', function ($join) {
                $join->on('vehicles.active_shift_id', '=', 'shift_logs.shift_id');
            })
            ->where('shift_logs.is_on_break', false)
            ->whereColumn('vehicle_locations.updated_at', '>=', 'shift_logs.time_in')
            ->where('vehicle_locations.updated_at', '>=', now()->subMinutes(10))
            ->leftJoin('routes', 'shift_logs.route_id', '=', 'routes.id')
            ->select([
                'vehicle_locations.vehicle_id',
                'vehicles.plate_number',
                'vehicles.vehicle_type',
                'vehicles.unit_number',
                'vehicles.capacity_status as vehicle_capacity_status',
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
     * Get the live fleet monitoring view for admins.
     *
     * Returns all vehicles with an ACTIVE shift, their latest GPS position,
     * capacity status, speed, and a `is_stale` flag (true if the last
     * location update was more than 10 minutes ago — the unit may have
     * lost connectivity or the conductor forgot to broadcast). A unit on
     * an active break is never flagged stale — the conductor deliberately
     * paused broadcasting, so a quiet GPS feed is expected, not a fault.
     *
     * Includes driver + conductor names from the active shift log.
     *
     * @return Collection<int, object>
     */
    public function getMonitoringFleet(): Collection
    {
        $now = now();
        $staleThresholdMinutes = 10;

        // Driven from `vehicles`, NOT from `vehicle_locations`. A unit that has
        // started a shift but not yet posted a GPS ping has no vehicle_locations
        // row at all; joining from that table made it invisible to the admin —
        // absent from both the tracking list and the map, with nothing to
        // indicate a shift was running. It now appears with a null position and
        // has_gps = false so the UI can label it "Awaiting GPS".
        return DB::table('vehicles')
            ->leftJoin('vehicle_locations', function ($join) {
                $join->on('vehicles.id', '=', 'vehicle_locations.vehicle_id')
                    ->on('vehicles.active_shift_id', '=', 'vehicle_locations.shift_id');
            })
            ->whereNotNull('vehicles.active_shift_id')
            ->leftJoin('shift_logs', function ($join) {
                $join->on('vehicles.active_shift_id', '=', 'shift_logs.shift_id');
            })
            ->leftJoin('routes', 'shift_logs.route_id', '=', 'routes.id')
            ->leftJoin('drivers', 'shift_logs.driver_id', '=', 'drivers.id')
            ->leftJoin('conductor_profiles', 'shift_logs.conductor_id', '=', 'conductor_profiles.id')
            ->select([
                'vehicles.id as id',
                'vehicles.unit_number',
                'vehicles.plate_number',
                'vehicles.vehicle_type',
                'vehicle_locations.lat',
                'vehicle_locations.lng',
                'vehicle_locations.speed',
                'vehicle_locations.heading',
                'vehicle_locations.capacity_status',
                'shift_logs.is_on_break',
                'shift_logs.break_started_at',
                'routes.name as route_name',
                'vehicle_locations.updated_at as last_update',
                'drivers.first_name as driver_first_name',
                'drivers.last_name as driver_last_name',
                'conductor_profiles.first_name as conductor_first_name',
                'conductor_profiles.last_name as conductor_last_name',
            ])
            ->orderByRaw('vehicle_locations.updated_at IS NULL, vehicle_locations.updated_at DESC')
            ->get()
            ->map(function ($row) use ($now, $staleThresholdMinutes) {
                $lastUpdate = $row->last_update ? Carbon::parse($row->last_update) : null;
                // abs(): Carbon 3 returns a SIGNED diff, so $now->diffInMinutes($past)
                // is negative. Without this, minutes_since_update rendered as
                // "-42m ago" and is_stale (> 10) could never be true — the
                // "Stale Units" metric was permanently stuck at 0.
                $minutesSinceUpdate = $lastUpdate ? (int) abs($now->diffInMinutes($lastUpdate)) : null;
                $hasGps = $row->lat !== null && $row->lng !== null;

                return [
                    'id' => $row->id,
                    'unit_number' => $row->unit_number,
                    'plate_number' => $row->plate_number,
                    'vehicle_type' => $row->vehicle_type,
                    'lat' => $row->lat !== null ? (float) $row->lat : null,
                    'lng' => $row->lng !== null ? (float) $row->lng : null,
                    'speed' => $row->speed !== null ? (int) $row->speed : null,
                    'heading' => $row->heading,
                    'capacity_status' => $row->capacity_status ?? 'AVAILABLE',
                    'is_on_break' => (bool) $row->is_on_break,
                    'break_started_at' => $row->break_started_at,
                    'route_name' => $row->route_name,
                    'driver_name' => trim(($row->driver_first_name ?? '').' '.($row->driver_last_name ?? '')) ?: null,
                    'conductor_name' => trim(($row->conductor_first_name ?? '').' '.($row->conductor_last_name ?? '')) ?: null,
                    'last_update' => $lastUpdate?->toDateTimeString(),
                    'minutes_since_update' => $minutesSinceUpdate,
                    'has_gps' => $hasGps,
                    'is_stale' => $minutesSinceUpdate !== null && $minutesSinceUpdate > $staleThresholdMinutes && ! $row->is_on_break,
                ];
            });
    }

    /**
     * Update a vehicle's capacity status.
     *
     * - Only conductors with an active shift can update
     * - Values restricted to: AVAILABLE, STANDING, FULL
     * - Broadcasts VehicleLocationUpdated via Pusher
     */
    public function updateCapacityStatus(
        User $conductor,
        string $status,
        ?string $deviceId = null,
        ?string $deviceType = null,
    ): VehicleLocation {
        // 1. Validate status value
        $validStatuses = array_column(CapacityStatus::cases(), 'value');
        if (! in_array($status, $validStatuses)) {
            abort(422, 'Invalid capacity status. Must be: AVAILABLE, STANDING, or FULL');
        }

        return $this->updateCapacityForActiveShift($conductor, $status, $deviceId, $deviceType);
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
            ->whereColumn('vehicle_locations.shift_id', 'vehicles.active_shift_id')
            ->select([
                'vehicle_locations.vehicle_id',
                'vehicles.plate_number',
                'vehicles.vehicle_type',
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

    private function updateCapacityForActiveShift(
        User $conductor,
        string $status,
        ?string $deviceId,
        ?string $deviceType,
    ): VehicleLocation {
        return DB::transaction(function () use ($conductor, $status, $deviceId, $deviceType) {
            $shift = ShiftLog::query()
                ->where('conductor_id', $conductor->conductorProfile?->id)
                ->active()
                ->lockForUpdate()
                ->first();
            if (! $shift) {
                abort(422, 'No active shift');
            }

            $this->shiftDeviceService->assertCanOperate($shift, $deviceId, $deviceType);

            $vehicle = Vehicle::query()->whereKey($shift->vehicle_id)->lockForUpdate()->firstOrFail();
            if ($vehicle->active_shift_id !== $shift->shift_id) {
                abort(409, 'The vehicle is no longer assigned to this shift.');
            }

            $location = VehicleLocation::query()
                ->where('vehicle_id', $vehicle->id)
                ->lockForUpdate()
                ->first() ?? new VehicleLocation(['vehicle_id' => $vehicle->id]);
            if ($location->shift_id !== $shift->shift_id) {
                $location->fill([
                    'shift_id' => $shift->shift_id,
                    'conductor_id' => $conductor->id,
                    'lat' => null,
                    'lng' => null,
                    'speed' => null,
                    'heading' => null,
                    'accuracy_m' => null,
                    'fix_recorded_at' => null,
                ]);
            }
            $location->capacity_status = $status;
            $location->save();

            DB::afterCommit(fn () => $this->broadcastLocationUpdate($vehicle->id));

            return $location;
        }, 3);
    }

    /**
     * Persisted overspeeding history for the admin monitoring module.
     * Returns one row per overspeeding episode (a shift may have several),
     * most recent first. Recorded live by recordOverspeedAtomic() on each GPS ping.
     */
    public function getOverspeedHistory(int $perPage = 25, ?string $shiftId = null, ?string $date = null): LengthAwarePaginator
    {
        $paginator = OverspeedEvent::query()
            ->when($shiftId, fn ($query) => $query->where('shift_id', $shiftId))
            ->when($date, fn ($query) => $query->where('date', $date))
            ->orderByDesc('last_logged_at')
            ->paginate(min(max($perPage, 1), 100));

        $paginator->through(function (OverspeedEvent $e) {
            return [
                'id' => (string) $e->id,
                'unit' => $e->unit_number,
                'plate' => $e->plate_number,
                'speed' => (int) $e->top_speed,
                'threshold' => (int) $e->threshold,
                'driver' => $e->driver_name,
                'conductor' => $e->conductor_name,
                'date' => $e->date?->toDateString(),
                'last_update' => $e->last_logged_at?->toIso8601String(),
            ];
        });

        return $paginator;
    }
}
