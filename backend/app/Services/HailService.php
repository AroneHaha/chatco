<?php

namespace App\Services;

use App\Enums\HailStatus;
use App\Events\HailCreated;
use App\Events\HailStatusChanged;
use App\Exceptions\OutsideRadiusException;
use App\Helpers\GeoHelper;
use App\Models\Hail;
use App\Models\ShiftLog;
use App\Models\User;
use App\Models\VehicleLocation;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;

/**
 * HailService — sole gatekeeper for the 1KM hail radius rule.
 *
 * Frontend radius checks are display-only; this service enforces the rule
 * on the server using GeoHelper::haversineMeters() against the vehicle's
 * latest reported position from vehicle_locations.
 *
 * Hail lifecycle:
 *   PENDING  -> CANCELLED  (commuter cancels via cancelHail)
 *   PENDING  -> ACCEPTED   (conductor accepts via acceptHail)
 *   PENDING  -> REJECTED   (conductor rejects via rejectHail)
 *   PENDING  -> EXPIRED    (swept by expireStaleHails when expires_at < now())
 */
class HailService
{
    /**
     * Hail TTL in minutes. Each new hail expires 3 minutes after creation
     * unless acted upon. Spec-mandated value.
     */
    private const HAIL_TTL_MINUTES = 3;

    /**
     * Create a new hail for a commuter against a specific vehicle.
     *
     * @param  User    $commuter      The commuter requesting the hail (must be COMMUTER role)
     * @param  string  $vehicleId     Target vehicle UUID
     * @param  float   $commuterLat   Commuter's current latitude (degrees)
     * @param  float   $commuterLng   Commuter's current longitude (degrees)
     *
     * @return Hail                    The created hail (status PENDING)
     *
     * @throws OutsideRadiusException  When computed distance > HAIL_RADIUS_M
     * @throws \Symfony\Component\HttpKernel\Exception\HttpException
     *         403 if not a commuter
     *         409 if commuter already has a pending hail
     *         422 if vehicle is not currently on an active shift
     *         422 if vehicle has no reported position
     */
    public function createHail(
        User $commuter,
        string $vehicleId,
        float $commuterLat,
        float $commuterLng
    ): Hail {
        // ─── Role check ─────────────────────────────────────────────
        if (! $commuter->isCommuter()) {
            abort(403, 'Forbidden');
        }

        // ─── Duplicate pending hail check ───────────────────────────
        if (Hail::where('commuter_id', $commuter->id)->pending()->exists()) {
            abort(409, 'Duplicate pending hail');
        }

        // ─── Fetch latest vehicle position ──────────────────────────
        /** @var VehicleLocation|null $vehicleLocation */
        $vehicleLocation = VehicleLocation::find($vehicleId);
        if (! $vehicleLocation) {
            abort(422, 'Vehicle position unknown');
        }

        // ─── Compute Haversine distance via GeoHelper ───────────────
        $distanceMeters = GeoHelper::haversineMeters(
            $commuterLat,
            $commuterLng,
            (float) $vehicleLocation->lat,
            (float) $vehicleLocation->lng,
        );

        // ─── Enforce 1KM hard limit ─────────────────────────────────
        if ($distanceMeters > GeoHelper::HAIL_RADIUS_M) {
            throw new OutsideRadiusException($distanceMeters);
        }

        // ─── Verify vehicle is currently on active shift ────────────
        $activeShift = ShiftLog::where('vehicle_id', $vehicleId)->active()->first();
        if (! $activeShift) {
            abort(422, 'Vehicle not on duty');
        }
        if ($activeShift->is_on_break) {
            abort(422, 'Vehicle is currently on break');
        }

        // ─── Persist hail + dispatch broadcast (transactional) ──────
        return DB::transaction(function () use ($commuter, $vehicleId, $commuterLat, $commuterLng, $distanceMeters) {
            $hail = Hail::create([
                'commuter_id'  => $commuter->id,
                'vehicle_id'   => $vehicleId,
                'commuter_lat' => $commuterLat,
                'commuter_lng' => $commuterLng,
                'distance_m'   => $distanceMeters,
                'status'       => HailStatus::PENDING,
                'expires_at'   => now()->addMinutes(self::HAIL_TTL_MINUTES),
            ]);

            broadcast(new HailCreated($hail));

            return $hail;
        });
    }

    /**
     * Cancel a pending hail. Only the owning commuter can cancel.
     *
     * @param  User    $commuter  The commuter attempting cancellation
     * @param  string  $hailId    UUID of the hail to cancel
     *
     * @return Hail                The cancelled hail
     *
     * @throws \Symfony\Component\HttpKernel\Exception\HttpException
     *         403 if commuter is not the hail owner
     *         422 if hail is not in PENDING status
     *         404 if hail does not exist
     */
    public function cancelHail(User $commuter, string $hailId): Hail
    {
        $hail = Hail::findOrFail($hailId);

        if ($hail->commuter_id !== $commuter->id) {
            abort(403, 'Forbidden');
        }

        if ($hail->status !== HailStatus::PENDING) {
            abort(422, 'Hail is not pending');
        }

        $hail->update(['status' => HailStatus::CANCELLED]);
        $hail->refresh();

        broadcast(new HailStatusChanged($hail));

        return $hail;
    }

    /**
     * Accept a pending hail. Only the conductor currently on shift for
     * the hail's vehicle can accept.
     *
     * @param  User    $conductor  The conductor accepting the hail
     * @param  string  $hailId     UUID of the hail to accept
     *
     * @return Hail                  The accepted hail (status ACCEPTED, conductor_id set)
     *
     * @throws \Symfony\Component\HttpKernel\Exception\HttpException
     *         403 if conductor is not on active shift for the hail's vehicle
     *         422 if hail is not pending or has expired
     *         404 if hail does not exist
     */
    public function acceptHail(User $conductor, string $hailId): Hail
    {
        $hail = Hail::findOrFail($hailId);

        $this->verifyConductorOwnsVehicle($conductor, $hail->vehicle_id);

        if ($hail->status !== HailStatus::PENDING) {
            abort(422, 'Hail is not pending');
        }

        if ($hail->expires_at < now()) {
            abort(422, 'Hail has expired');
        }

        $hail->update([
            'status'       => HailStatus::ACCEPTED,
            'conductor_id' => $conductor->id,
        ]);
        $hail->refresh();

        broadcast(new HailStatusChanged($hail));

        return $hail;
    }

    /**
     * Reject a pending hail. Only the conductor currently on shift for
     * the hail's vehicle can reject.
     *
     * @param  User    $conductor  The conductor rejecting the hail
     * @param  string  $hailId     UUID of the hail to reject
     *
     * @return Hail                  The rejected hail (status REJECTED)
     *
     * @throws \Symfony\Component\HttpKernel\Exception\HttpException
     *         403 if conductor is not on active shift for the hail's vehicle
     *         422 if hail is not pending
     *         404 if hail does not exist
     */
    public function rejectHail(User $conductor, string $hailId): Hail
    {
        $hail = Hail::findOrFail($hailId);

        $this->verifyConductorOwnsVehicle($conductor, $hail->vehicle_id);

        if ($hail->status !== HailStatus::PENDING) {
            abort(422, 'Hail is not pending');
        }

        $hail->update(['status' => HailStatus::REJECTED]);
        $hail->refresh();

        broadcast(new HailStatusChanged($hail));

        return $hail;
    }

    /**
     * Get all pending, non-expired hails for a vehicle, eager-loaded
     * with the commuter relationship.
     *
     * @param  string  $vehicleId  Target vehicle UUID
     *
     * @return Collection<Hail>     Pending hails ordered by created_at desc
     */
    public function getPendingHailsForVehicle(string $vehicleId): Collection
    {
        return Hail::query()
            ->pending()
            ->forVehicle($vehicleId)
            ->where('expires_at', '>', now())
            ->with('commuter')
            ->orderBy('created_at', 'desc')
            ->get();
    }

    /**
     * Bulk-expire stale hails: any PENDING hail with expires_at in the
     * past transitions to EXPIRED.
     *
     * Fires a HailStatusChanged broadcast per expired hail so each
     * affected commuter is notified in real time on their personal
     * `commuter.{commuter_id}.hails` channel.
     *
     * Typically called by the `hails:expire` scheduled command (every
     * minute) or on demand before listing pending hails for a vehicle.
     *
     * @return int  Number of hails transitioned to EXPIRED
     */
    public function expireStaleHails(): int
    {
        // Fetch stale hails first so we can broadcast per-hail
        $staleHails = Hail::query()
            ->where('status', HailStatus::PENDING)
            ->where('expires_at', '<', now())
            ->get();

        if ($staleHails->isEmpty()) {
            return 0;
        }

        // Bulk UPDATE for efficiency
        $updatedCount = Hail::query()
            ->where('status', HailStatus::PENDING)
            ->where('expires_at', '<', now())
            ->update(['status' => HailStatus::EXPIRED]);

        // Per-hail broadcast so each commuter gets notified
        foreach ($staleHails as $hail) {
            // Sync the model's status to reflect the UPDATE without re-querying
            $hail->status = HailStatus::EXPIRED;
            broadcast(new HailStatusChanged($hail));
        }

        return $updatedCount;
    }

    /**
     * Internal helper: verify that the given conductor is currently on
     * an active shift for the given vehicle. Aborts 403 otherwise.
     */
    private function verifyConductorOwnsVehicle(User $conductor, string $vehicleId): void
    {
        $activeShift = ShiftLog::where('vehicle_id', $vehicleId)
            ->active()
            ->first();

        if (! $activeShift || $activeShift->conductor_id !== $conductor->id) {
            abort(403, 'Forbidden');
        }
    }
}
