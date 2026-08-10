<?php

namespace App\Services;

use App\Enums\HailStatus;
use App\Events\HailCreated;
use App\Events\HailStatusChanged;
use App\Exceptions\OutsideRadiusException;
use App\Helpers\GeoHelper;
use App\Models\Hail;
use App\Models\Route;
use App\Models\ShiftLog;
use App\Models\User;
use App\Models\VehicleLocation;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;

class HailService
{
    private const HAIL_TTL_MINUTES = 3;

    public function __construct(private RouteGeometryService $routeGeometryService) {}

    public function createHail(
        User $commuter,
        string $vehicleId,
        float $commuterLat,
        float $commuterLng,
    ): Hail {
        if (! $commuter->isCommuter()) {
            abort(403, 'Forbidden');
        }

        return DB::transaction(function () use ($commuter, $vehicleId, $commuterLat, $commuterLng) {
            // Serializes a commuter's hail creation attempts without a global lock.
            User::query()->whereKey($commuter->id)->lockForUpdate()->firstOrFail();
            if (Hail::query()->where('commuter_id', $commuter->id)->pending()->exists()) {
                abort(409, 'Duplicate pending hail');
            }

            $shift = ShiftLog::query()
                ->where('vehicle_id', $vehicleId)
                ->active()
                ->lockForUpdate()
                ->first();
            if (! $shift || $shift->is_on_break) {
                abort(422, $shift ? 'Vehicle is currently on break' : 'Vehicle not on duty');
            }

            $location = VehicleLocation::query()
                ->where('vehicle_id', $vehicleId)
                ->where('shift_id', $shift->shift_id)
                ->where('updated_at', '>=', $shift->time_in)
                ->where('updated_at', '>=', now()->subMinutes(10))
                ->lockForUpdate()
                ->first();
            if (! $location || $location->lat === null || $location->lng === null) {
                abort(422, 'Vehicle position is unavailable or stale');
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

            $route = $shift->route_id ? Route::find($shift->route_id) : null;
            $version = $route ? $this->routeGeometryService->activeVersion($route) : null;
            if ($version && GeoHelper::distanceToPolylineMeters(
                $commuterLat,
                $commuterLng,
                $version->geometry ?? [],
            ) > GeoHelper::HAIL_RADIUS_M) {
                abort(422, 'Pickup point is outside the active route coverage.');
            }

            $hail = Hail::create([
                'commuter_id' => $commuter->id,
                'vehicle_id' => $vehicleId,
                'commuter_lat' => $commuterLat,
                'commuter_lng' => $commuterLng,
                'distance_m' => $distance,
                'status' => HailStatus::PENDING,
                'expires_at' => now()->addMinutes(self::HAIL_TTL_MINUTES),
            ]);

            DB::afterCommit(fn () => broadcast(new HailCreated($hail)));

            return $hail;
        }, 3);
    }

    public function cancelHail(User $commuter, string $hailId): Hail
    {
        return $this->transitionHail($hailId, HailStatus::CANCELLED, $commuter);
    }

    public function acceptHail(User $conductor, string $hailId): Hail
    {
        return $this->transitionHail($hailId, HailStatus::ACCEPTED, $conductor);
    }

    public function rejectHail(User $conductor, string $hailId): Hail
    {
        return $this->transitionHail($hailId, HailStatus::REJECTED, $conductor);
    }

    public function getPendingHailsForVehicle(string $vehicleId): Collection
    {
        return Hail::query()
            ->pending()
            ->forVehicle($vehicleId)
            ->where('expires_at', '>', now())
            ->with('commuter')
            ->orderByDesc('created_at')
            ->get();
    }

    /**
     * Pending-only conditional transitions make repeated sweeps and competing
     * accept/cancel/reject requests idempotent. The related shift is locked
     * first everywhere, matching shift closeout's lock order.
     */
    private function transitionHail(string $hailId, HailStatus $target, User $actor): Hail
    {
        return DB::transaction(function () use ($hailId, $target, $actor) {
            $candidate = Hail::query()->whereKey($hailId)->firstOrFail();
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

            if ($hail->status !== HailStatus::PENDING) {
                abort(409, 'Hail is no longer pending');
            }
            if ($target === HailStatus::ACCEPTED && $hail->expires_at->isPast()) {
                abort(409, 'Hail has expired');
            }

            $hail->update([
                'status' => $target->value,
                'conductor_id' => $target === HailStatus::ACCEPTED ? $actor->id : $hail->conductor_id,
            ]);
            $hail->refresh();
            DB::afterCommit(fn () => broadcast(new HailStatusChanged($hail)));

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
