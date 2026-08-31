<?php

namespace App\Http\Controllers\Commuter;

use App\Http\Controllers\Controller;
use App\Http\Requests\Commuter\SosRequest;
use App\Services\SosService;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Sprint 6 (T5) — Commuter SOS trigger.
 *
 *   POST /api/v1/commuter/sos       (COMMUTER) — trigger a new alert
 *   GET  /api/v1/commuter/sos/{id}  (COMMUTER) — poll own alert status
 *
 * Rate-limited at 1 request per minute per commuter (throttle:sos) for
 * the trigger to prevent abuse. The poll endpoint uses conductor-read
 * (60/min) so the commuter modal can poll every 3s without hitting the
 * limit. The commuter CANNOT cancel their own SOS — only admins can
 * resolve it.
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
            $alert = $this->sosService->trigger(
                $request->user(),
                $request->validated(),
            );
        } catch (\RuntimeException $e) {
            return $this->errorResponse($e->getMessage(), 422);
        }

        return $this->successResponse($alert, 'SOS alert triggered', 201);
    }

    /**
     * GET /commuter/sos/{id}
     *
     * Returns the commuter's own alert (scoped to auth()->id() in the
     * service). The commuter modal polls this every 3s to detect when the
     * admin acknowledges / resolves the alert.
     */
    public function show(Request $request, string $id): JsonResponse
    {
        try {
            $alert = $this->sosService->findForCommuter($request->user(), $id);
        } catch (\RuntimeException $e) {
            $status = str_contains($e->getMessage(), 'not found') ? 404 : 422;
            return $this->errorResponse($e->getMessage(), $status);
        }

        return $this->successResponse($alert, 'SOS alert');
    }
}
