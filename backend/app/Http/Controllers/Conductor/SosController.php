<?php

namespace App\Http\Controllers\Conductor;

use App\Http\Controllers\Controller;
use App\Http\Requests\Conductor\SosRequest;
use App\Models\Setting;
use App\Services\SosService;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Conductor SOS trigger — mirrors the commuter SOS flow for on-duty crew.
 *
 *   POST /api/v1/conductor/sos       (CONDUCTOR) — trigger a new alert
 *   GET  /api/v1/conductor/sos/{id}  (CONDUCTOR) — poll own alert status
 *
 * The alert lands in the same sos_alerts table (sender_role=CONDUCTOR) so the
 * admin Monitoring feed shows commuter and conductor alerts side by side, with
 * a map marker + history record. The conductor can stop their own SOS while
 * retaining its history.
 */
class SosController extends Controller
{
    use ApiResponse;

    public function __construct(
        private readonly SosService $sosService,
    ) {}

    public function trigger(SosRequest $request): JsonResponse
    {
        try {
            $alert = $this->sosService->triggerForConductor(
                $request->user(),
                $request->validated(),
            );
        } catch (\RuntimeException $e) {
            return $this->errorResponse($e->getMessage(), 422);
        }

        // The admin-configured emergency hotline (Settings > Safety &
        // Notifications) rides along so the conductor's SOS screen can offer
        // it during the emergency. Additive field; null when not configured.
        $hotline = Setting::where('key', 'emergency_hotline')->value('value');
        $payload = $alert->toArray();
        $payload['emergency_hotline'] = is_string($hotline) && trim($hotline) !== '' ? trim($hotline) : null;

        return $this->successResponse($payload, 'SOS alert triggered', 201);
    }

    /**
     * PATCH /conductor/sos/{id}/stop — close the sender's own alert.
     *
     * Retains the history record and notifies dispatch.
     */
    public function stop(Request $request, string $id): JsonResponse
    {
        try {
            $alert = $this->sosService->stopForSender($request->user(), $id);
        } catch (\RuntimeException $e) {
            return $this->errorResponse($e->getMessage(), str_contains($e->getMessage(), 'not found') ? 404 : 422);
        }

        return $this->successResponse($alert, 'SOS alert stopped');
    }

    /** Return the authenticated sender's own alert for status polling. */
    public function show(Request $request, string $id): JsonResponse
    {
        try {
            $alert = $this->sosService->findForConductor($request->user(), $id);
        } catch (\RuntimeException $e) {
            $status = str_contains($e->getMessage(), 'not found') ? 404 : 422;
            return $this->errorResponse($e->getMessage(), $status);
        }

        return $this->successResponse($alert, 'SOS alert');
    }
}
