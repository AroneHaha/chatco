<?php

namespace App\Services;

use App\Models\SosAlert;
use App\Models\User;
use App\Models\Setting;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

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

        $alert = SosAlert::create([
            'sender_role' => 'COMMUTER',
            'commuter_id' => $profile->id,
            'lat'         => $data['lat'],
            'lng'         => $data['lng'],
            'note'        => $data['note'] ?? null,
            'status'      => self::STATUS_ACTIVE,
        ])->load('commuter');

        $this->sendSosEmailToAdmin($alert, $commuter);

        return $alert;
    }

    /**
     * Conductor triggers an SOS. Stores the alert with status=ACTIVE and
     * sender_role=CONDUCTOR (commuter_id stays null; conductor_id is set).
     */
    public function triggerForConductor(User $conductor, array $data): SosAlert
    {
        $profile = $conductor->conductorProfile;
        if (! $profile) {
            throw new \RuntimeException('Conductor profile not found');
        }

        $alert = SosAlert::create([
            'sender_role'  => 'CONDUCTOR',
            'conductor_id' => $profile->id,
            'lat'          => $data['lat'],
            'lng'          => $data['lng'],
            'note'         => $data['note'] ?? null,
            'status'       => self::STATUS_ACTIVE,
        ])->load('conductor');

        $this->sendSosEmailToAdmin($alert, $conductor);

        return $alert;
    }

    /**
     * Conductor fetches their own alert by ID (for polling status changes).
     * Scoped to the authenticated conductor's profile.
     *
     * @throws \RuntimeException  Profile not found, or alert not found.
     */
    public function findForConductor(User $conductor, string $id): SosAlert
    {
        $profile = $conductor->conductorProfile;
        if (! $profile) {
            throw new \RuntimeException('Conductor profile not found');
        }

        $alert = SosAlert::where('conductor_id', $profile->id)->find($id);
        if (! $alert) {
            throw new \RuntimeException('SOS alert not found');
        }

        return $alert->load('conductor');
    }

    /**
     * Commuter fetches their own alert by ID (for polling status changes).
     *
     * Scoped to the authenticated commuter's profile — a commuter cannot
     * read another commuter's alert. Used by the commuter SOS modal to
     * detect when the admin acknowledges / resolves the alert so the UI
     * can flip to the "responded" screen.
     *
     * @throws \RuntimeException  Profile not found, or alert not found.
     */
    public function findForCommuter(User $commuter, string $id): SosAlert
    {
        $profile = $commuter->commuterProfile;
        if (! $profile) {
            throw new \RuntimeException('Commuter profile not found');
        }

        $alert = SosAlert::where('commuter_id', $profile->id)->find($id);
        if (! $alert) {
            throw new \RuntimeException('SOS alert not found');
        }

        return $alert->load('commuter');
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
        $query = SosAlert::with(['commuter', 'conductor'])
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

        return $alert->fresh(['commuter', 'conductor']);
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

        return $alert->fresh(['commuter', 'conductor', 'acknowledger', 'resolver']);
    }

    private function findOrFail(string $id): SosAlert
    {
        try {
            return SosAlert::findOrFail($id);
        } catch (ModelNotFoundException) {
            throw new \RuntimeException('SOS alert not found');
        }
    }

    /**
     * Send an SOS notification email to the admin.
     *
     * Reads the `admin_sos_email` + `sos_admin_template` from the settings
     * table. If either is missing, the email is silently skipped (the SOS
     * alert still lands in the DB — the email is a best-effort notification).
     *
     * Errors are logged but never thrown — the SOS trigger must not fail
     * because of an email issue.
     */
    private function sendSosEmailToAdmin(SosAlert $alert, User $sender): void
    {
        try {
            $adminEmail = Setting::where('key', 'admin_sos_email')->value('value');
            if (! $adminEmail) {
                return; // No admin email configured — skip silently
            }

            $template = Setting::where('key', 'sos_admin_template')->value('value')
                ?? "SOS ALERT\n\nA {sender_name} has triggered an emergency SOS alert.\n\nCoordinates: {lat}, {lng}\nNote: {note}\nTime: {time}\n\nPlease respond immediately.";

            $senderName = $alert->sender_role === 'CONDUCTOR'
                ? ($alert->conductor?->first_name . ' ' . $alert->conductor?->last_name)
                : ($alert->commuter?->first_name . ' ' . $alert->commuter?->surname);

            $body = strtr($template, [
                '{sender_name}' => trim($senderName),
                '{lat}'         => $alert->lat,
                '{lng}'         => $alert->lng,
                '{note}'        => $alert->note ?? 'No note provided',
                '{time}'        => $alert->created_at?->toDateTimeString() ?? now()->toDateTimeString(),
            ]);

            Mail::raw($body, function ($message) use ($adminEmail) {
                $message->to($adminEmail)
                    ->subject('CHATCO — Emergency SOS Alert');
            });
        } catch (\Exception $e) {
            Log::error('Failed to send SOS email to admin', [
                'error' => $e->getMessage(),
                'alert_id' => $alert->id,
            ]);
        }
    }
}
