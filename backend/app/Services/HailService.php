<?php

namespace App\Services;

use App\Enums\CapacityStatus;
use App\Enums\HailStatus;
use App\Events\HailCreated;
use App\Events\HailStatusChanged;
use App\Exceptions\HailCooldownException;
use App\Exceptions\OutsideRadiusException;
use App\Helpers\GeoHelper;
use App\Models\Hail;
use App\Models\Route;
use App\Models\ShiftLog;
use App\Models\User;
use App\Models\VehicleLocation;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpKernel\Exception\HttpException;

class HailService
{
    private const HAIL_TTL_MINUTES = 3;

    /**
     * After an accept, the accepting unit keeps the pickup pin this long and
     * the commuter can't hail again until it passes. Both read the accepted
     * hail's expires_at, so they always end together. 120s covers the full
     * 1KM radius at the corridor's 30-50 km/h.
     */
    public const ACCEPTED_HOLD_SECONDS = 120;

    public function __construct(
        private ShiftDeviceService $shiftDeviceService,
        private LocationService $locationService,
    ) {}

    /**
     * Every unit whose radius covers the commuter gets its own copy of the
     * hail, so each of those conductors sees the pickup point. The unit the
     * commuter picked must pass; the others are added only when they pass the
     * same checks. Returns the picked unit's copy.
     */
    public function createHail(
        User $commuter,
        string $vehicleId,
        float $commuterLat,
        float $commuterLng,
    ): Hail {
        if (! $commuter->isCommuter()) {
            abort(403, 'Forbidden');
        }

        // Unlocked pre-filter over the units shown on the commuter map; the
        // locked checks below are authoritative. Sorted so concurrent hails
        // covering the same units lock rows in the same order.
        $vehicleIds = $this->locationService->getAllActiveLocations()
            ->filter(fn ($row) => GeoHelper::haversineMeters(
                $commuterLat,
                $commuterLng,
                (float) $row->lat,
                (float) $row->lng,
            ) <= GeoHelper::HAIL_RADIUS_M)
            ->pluck('vehicle_id')
            ->push($vehicleId)
            ->unique()
            ->sort()
            ->values();

        return DB::transaction(function () use ($commuter, $vehicleId, $vehicleIds, $commuterLat, $commuterLng) {
            // Serializes a commuter's hail creation attempts without a global lock.
            User::query()->whereKey($commuter->id)->lockForUpdate()->firstOrFail();
            // A PENDING row past expires_at is dead even if no sweep marked it
            // EXPIRED (the scheduler doesn't run in production), so it must
            // not block a new hail.
            if (Hail::query()->where('commuter_id', $commuter->id)->pending()->where('expires_at', '>', now())->exists()) {
                abort(409, 'Duplicate pending hail');
            }
            $this->releaseOrBlockAcceptedHail($commuter->id, $commuterLat, $commuterLng);

            $shifts = ShiftLog::query()
                ->whereIn('vehicle_id', $vehicleIds)
                ->active()
                ->orderBy('vehicle_id')
                ->lockForUpdate()
                ->get()
                ->keyBy('vehicle_id');
            $locations = VehicleLocation::query()
                ->whereIn('vehicle_id', $vehicleIds)
                ->orderBy('vehicle_id')
                ->lockForUpdate()
                ->get()
                ->keyBy('vehicle_id');

            $routes = [];
            $hails = [];
            $expiresAt = now()->addMinutes(self::HAIL_TTL_MINUTES);
            foreach ($vehicleIds as $id) {
                try {
                    $distance = $this->hailableDistance($shifts->get($id), $locations->get($id), $commuterLat, $commuterLng, $routes);
                } catch (HttpException|OutsideRadiusException $e) {
                    // The picked unit keeps its exact refusal; other units are extras.
                    if ($id === $vehicleId) {
                        throw $e;
                    }

                    continue;
                }

                $hails[$id] = Hail::create([
                    'commuter_id' => $commuter->id,
                    'vehicle_id' => $id,
                    'commuter_lat' => $commuterLat,
                    'commuter_lng' => $commuterLng,
                    'distance_m' => $distance,
                    'status' => HailStatus::PENDING,
                    'expires_at' => $expiresAt,
                ]);
            }

            DB::afterCommit(function () use ($hails): void {
                foreach ($hails as $hail) {
                    broadcast(new HailCreated($hail));
                }
            });

            return $hails[$vehicleId];
        }, 3);
    }

    /**
     * Distance from the commuter to a unit that can take the hail; throws the
     * reason it can't. $shift and $location must already be locked.
     *
     * @param  array<string, Route|null>  $routes  per-request route cache
     */
    private function hailableDistance(
        ?ShiftLog $shift,
        ?VehicleLocation $location,
        float $commuterLat,
        float $commuterLng,
        array &$routes,
    ): float {
        if (! $shift || $shift->is_on_break) {
            abort(422, $shift ? 'Vehicle is currently on break' : 'Vehicle not on duty');
        }

        if (! $location
            || $location->shift_id !== $shift->shift_id
            || $location->updated_at === null
            || $location->updated_at->lt($shift->time_in)
            || $location->lat === null
            || $location->lng === null) {
            abort(422, 'Vehicle position is unavailable');
        }
        // Same offline rule as the commuter map, so a hidden unit can't be hailed.
        if ($location->updated_at->lt(now()->subSeconds(LocationService::COMMUTER_FRESH_SECONDS))) {
            abort(422, 'Vehicle is offline');
        }

        $distance = GeoHelper::haversineMeters(
            $commuterLat,
            $commuterLng,
            (float) $location->lat,
            (float) $location->lng,
        );
        if ($distance > GeoHelper::HAIL_RADIUS_M) {
            throw new OutsideRadiusException($distance);
        }

        $route = null;
        if ($shift->route_id) {
            $route = $routes[$shift->route_id] ??= Route::find($shift->route_id);
        }
        if ($route?->hasGeometry() && GeoHelper::distanceToPolylineMeters(
            $commuterLat,
            $commuterLng,
            $route->geometry,
        ) > GeoHelper::HAIL_RADIUS_M) {
            abort(422, 'Pickup point is outside the active route coverage.');
        }

        return $distance;
    }

    /**
     * The cooldown after an accept: refuse a new hail while the accepting
     * unit can still pick the commuter up. The cooldown ends early once that
     * unit can't (shift ended, on break, offline, full, or more than 1KM from
     * the commuter, i.e. it drove past); its pin is then hidden at once.
     */
    private function releaseOrBlockAcceptedHail(string $commuterId, float $commuterLat, float $commuterLng): void
    {
        $accepted = Hail::query()
            ->where('commuter_id', $commuterId)
            ->where('status', HailStatus::ACCEPTED->value)
            ->where('expires_at', '>', now())
            ->with('vehicle:id,unit_number,capacity_status')
            ->first();
        if (! $accepted) {
            return;
        }

        if ($this->unitCanStillPickUp($accepted, $commuterLat, $commuterLng)) {
            throw new HailCooldownException($accepted->vehicle?->unit_number, $accepted->vehicle_id, $accepted->expires_at);
        }

        $accepted->update(['expires_at' => now()]);
        DB::afterCommit(fn () => broadcast(new HailStatusChanged($accepted)));
    }

    private function unitCanStillPickUp(Hail $accepted, float $commuterLat, float $commuterLng): bool
    {
        if ($accepted->vehicle?->capacity_status === CapacityStatus::FULL->value) {
            return false;
        }

        // Unlocked reads: this only decides whether to wait, and the unit's
        // state can change a second later anyway. Locking its shift here would
        // break the sorted lock order createHail takes below.
        $routes = [];
        try {
            $this->hailableDistance(
                ShiftLog::query()->where('vehicle_id', $accepted->vehicle_id)->active()->first(),
                VehicleLocation::query()->where('vehicle_id', $accepted->vehicle_id)->first(),
                $commuterLat,
                $commuterLng,
                $routes,
            );
        } catch (HttpException|OutsideRadiusException) {
            return false;
        }

        return true;
    }

    /**
     * Cancels the hail and its copies on the other units in range (a commuter
     * has at most one pending hail, so their pending rows are those copies).
     * Copies go first: the picked unit's copy may already be closed, e.g. its
     * shift ended, and its 409 must not leave the others on a conductor map.
     */
    public function cancelHail(User $commuter, string $hailId): Hail
    {
        if (Hail::query()->whereKey($hailId)->firstOrFail()->commuter_id !== $commuter->id) {
            abort(403, 'Forbidden');
        }

        Hail::query()
            ->where('commuter_id', $commuter->id)
            ->pending()
            ->whereKeyNot($hailId)
            ->pluck('id')
            ->each(function (string $id) use ($commuter): void {
                try {
                    $this->transitionHail($id, HailStatus::CANCELLED, $commuter);
                } catch (HttpException $e) {
                    // Expired or closed by its own unit in the meantime.
                    if ($e->getStatusCode() !== 409) {
                        throw $e;
                    }
                }
            });

        return $this->transitionHail($hailId, HailStatus::CANCELLED, $commuter);
    }

    public function acceptHail(
        User $conductor,
        string $hailId,
        ?string $deviceId = null,
        ?string $deviceType = null,
    ): Hail {
        return $this->transitionHail($hailId, HailStatus::ACCEPTED, $conductor, $deviceId, $deviceType);
    }

    public function rejectHail(
        User $conductor,
        string $hailId,
        ?string $deviceId = null,
        ?string $deviceType = null,
    ): Hail {
        return $this->transitionHail($hailId, HailStatus::REJECTED, $conductor, $deviceId, $deviceType);
    }

    /**
     * Hails shown on the unit's map: pending ones, plus the one it accepted
     * until ACCEPTED_HOLD_SECONDS pass (its expires_at).
     */
    public function getVisibleHailsForVehicle(string $vehicleId): Collection
    {
        return Hail::query()
            ->whereIn('status', [HailStatus::PENDING->value, HailStatus::ACCEPTED->value])
            ->forVehicle($vehicleId)
            ->where('expires_at', '>', now())
            ->with('commuter')
            ->orderByDesc('created_at')
            ->get();
    }

    /**
     * Pending-only conditional transitions make repeated sweeps and competing
     * accept/cancel/reject requests idempotent. The commuter's user row is
     * locked first (as createHail does), so transitions on one commuter's
     * copies run one at a time and only one unit can accept. Then the shift,
     * then the hail, matching shift closeout's lock order.
     */
    private function transitionHail(
        string $hailId,
        HailStatus $target,
        User $actor,
        ?string $deviceId = null,
        ?string $deviceType = null,
    ): Hail {
        return DB::transaction(function () use ($hailId, $target, $actor, $deviceId, $deviceType) {
            $candidate = Hail::query()->whereKey($hailId)->firstOrFail();
            User::query()->whereKey($candidate->commuter_id)->lockForUpdate()->first();
            $shift = ShiftLog::query()
                ->where('vehicle_id', $candidate->vehicle_id)
                ->active()
                ->lockForUpdate()
                ->first();
            $hail = Hail::query()->whereKey($hailId)->lockForUpdate()->firstOrFail();

            if ($target === HailStatus::CANCELLED) {
                if ($hail->commuter_id !== $actor->id) {
                    abort(403, 'Forbidden');
                }
            } elseif (! $shift || $shift->conductor_id !== $actor->id) {
                abort(403, 'Forbidden');
            }

            if ($target !== HailStatus::CANCELLED) {
                $this->shiftDeviceService->assertCanOperate($shift, $deviceId, $deviceType);
            }

            if ($hail->status !== HailStatus::PENDING) {
                abort(409, 'Hail is no longer pending');
            }
            if ($target === HailStatus::ACCEPTED && $hail->expires_at->isPast()) {
                abort(409, 'Hail has expired');
            }

            $accepting = $target === HailStatus::ACCEPTED;
            $hail->update([
                'status' => $target->value,
                'conductor_id' => $accepting ? $actor->id : $hail->conductor_id,
                // From here expires_at is when this unit's pin hides and the
                // commuter's cooldown ends.
                'expires_at' => $accepting ? now()->addSeconds(self::ACCEPTED_HOLD_SECONDS) : $hail->expires_at,
            ]);
            $hail->refresh();
            DB::afterCommit(fn () => broadcast(new HailStatusChanged($hail)));

            if ($accepting) {
                // Another unit is no longer needed: take the commuter's
                // location off every other map in the same commit.
                Hail::query()
                    ->where('commuter_id', $hail->commuter_id)
                    ->pending()
                    ->whereKeyNot($hail->id)
                    ->lockForUpdate()
                    ->get()
                    ->each(function (Hail $copy): void {
                        $copy->update(['status' => HailStatus::CANCELLED->value]);
                        DB::afterCommit(fn () => broadcast(new HailStatusChanged($copy)));
                    });
            }

            return $hail;
        }, 3);
    }

    public function expireStaleHails(): int
    {
        $expired = 0;

        Hail::query()
            ->where('status', HailStatus::PENDING->value)
            ->where('expires_at', '<=', now())
            ->orderBy('id')
            ->chunkById(100, function ($candidates) use (&$expired): void {
                foreach ($candidates as $candidate) {
                    DB::transaction(function () use ($candidate, &$expired): void {
                        // Lock shift before hail, consistent with accept/cancel/closeout.
                        ShiftLog::query()
                            ->where('vehicle_id', $candidate->vehicle_id)
                            ->active()
                            ->lockForUpdate()
                            ->first();
                        $hail = Hail::query()->whereKey($candidate->id)->lockForUpdate()->first();
                        if (! $hail || $hail->status !== HailStatus::PENDING || $hail->expires_at->isFuture()) {
                            return;
                        }

                        $hail->update(['status' => HailStatus::EXPIRED->value]);
                        $hail->refresh();
                        $expired++;
                        DB::afterCommit(fn () => broadcast(new HailStatusChanged($hail)));
                    }, 3);
                }
            });

        return $expired;
    }
}
