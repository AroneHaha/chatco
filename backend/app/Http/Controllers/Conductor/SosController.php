<?php

namespace App\Http\Controllers\Conductor;

use App\Http\Controllers\Controller;
use App\Http\Requests\Conductor\SosRequest;
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
 * a map marker + history record. The conductor CANNOT cancel their own SOS —
 * only admins resolve it.
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

        return $this->successResponse($alert, 'SOS alert triggered', 201);
    }

    /**
     * GET /conductor/sos/{id}
     *
     * Returns the conductor's own alert (scoped to their profile in the
     * service). The conductor SOS modal polls this to detect when the admin
     * acknowledges / resolves the alert.
     */
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
