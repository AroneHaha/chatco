<?php

namespace App\Services;

use App\Models\SosAlert;
use App\Models\User;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\ModelNotFoundException;

/**
 * Sprint 6 (T5) — SOS alert business logic.
 *
 * Commuter:
 *   trigger(commuter, data) → creates an ACTIVE alert with lat/lng + note
 *
 * Admin:
 *   listActive(admin, filters) → paginated feed, default filter status=ACTIVE
 *   acknowledge(admin, id)     → ACTIVE → ACKNOWLEDGED (admin sees it)
 *   resolve(admin, id)         → any status → RESOLVED (admin closes)
 *
 * Status transitions:
 *   ACTIVE → ACKNOWLEDGED (via acknowledge)
 *   ACTIVE → RESOLVED     (admin may skip ACK — allowed, no error)
 *   ACKNOWLEDGED → RESOLVED (via resolve)
 *   RESOLVED → (no further transitions — 422 if attempted)
 *
 * The alert is a paper trail once filed — commuters CANNOT cancel their own
 * SOS via the API; only admins can resolve.
 */
class SosService
{
    private const STATUS_ACTIVE       = 'ACTIVE';
    private const STATUS_ACKNOWLEDGED = 'ACKNOWLEDGED';
    private const STATUS_RESOLVED     = 'RESOLVED';

    /**
     * Commuter triggers an SOS. Stores the alert with status=ACTIVE.
     */
    public function trigger(User $commuter, array $data): SosAlert
    {
        $profile = $commuter->commuterProfile;
        if (! $profile) {
            throw new \RuntimeException('Commuter profile not found');
        }

        return SosAlert::create([
            'commuter_id' => $profile->id,
            'lat'         => $data['lat'],
            'lng'         => $data['lng'],
            'note'        => $data['note'] ?? null,
            'status'      => self::STATUS_ACTIVE,
        ])->load('commuter');
    }

    /**
     * Admin list — paginated. Eager-loads commuter for name display.
     *
     * The status filter is owned by the controller (which defaults to ACTIVE
     * when no param is supplied, and passes null only when status=ALL is
     * explicitly requested). The service treats a null/empty status as "no
     * filter" — return every alert regardless of status.
     */
    public function listActive(User $admin, array $filters, int $perPage = 15): LengthAwarePaginator
    {
        $query = SosAlert::with('commuter')
            ->orderByDesc('created_at');

        if (! empty($filters['status'])) {
            $query->where('status', $filters['status']);
        }
        // else: no filter → return all statuses (controller already
        // defaulted to ACTIVE if the caller omitted the param entirely).

        return $query->paginate($perPage);
    }

    /**
     * Admin acknowledges an alert. ACTIVE → ACKNOWLEDGED.
     * Acknowledging an already-ACKNOWLEDGED alert is a no-op (idempotent).
     *
     * @throws \RuntimeException  Alert not found, or already RESOLVED.
     */
    public function acknowledge(User $admin, string $id): SosAlert
    {
        $alert = $this->findOrFail($id);

        if ($alert->status === self::STATUS_RESOLVED) {
            throw new \RuntimeException('Cannot acknowledge a resolved alert');
        }

        if ($alert->status === self::STATUS_ACTIVE) {
            $alert->update([
                'status'          => self::STATUS_ACKNOWLEDGED,
                'acknowledged_by' => $admin->id,
                'acknowledged_at' => now(),
            ]);
        }

        return $alert->fresh('commuter');
    }

    /**
     * Admin resolves an alert. Any non-RESOLVED status → RESOLVED.
     * Resolving an already-RESOLVED alert → 422.
     *
     * @throws \RuntimeException  Alert not found, or already RESOLVED.
     */
    public function resolve(User $admin, string $id): SosAlert
    {
        $alert = $this->findOrFail($id);

        if ($alert->status === self::STATUS_RESOLVED) {
            throw new \RuntimeException('Alert is already resolved');
        }

        $alert->update([
            'status'      => self::STATUS_RESOLVED,
            'resolved_by' => $admin->id,
            'resolved_at' => now(),
        ]);

        return $alert->fresh(['commuter', 'acknowledger', 'resolver']);
    }

    private function findOrFail(string $id): SosAlert
    {
        try {
            return SosAlert::findOrFail($id);
        } catch (ModelNotFoundException) {
            throw new \RuntimeException('SOS alert not found');
        }
    }
}
