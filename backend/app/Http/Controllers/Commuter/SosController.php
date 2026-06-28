<?php

namespace App\Http\Controllers\Commuter;

use App\Http\Controllers\Controller;
use App\Http\Requests\Commuter\SosRequest;
use App\Services\SosService;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;

/**
 * Sprint 6 (T5) — Commuter SOS trigger.
 *
 *   POST /api/v1/commuter/sos  (COMMUTER)
 *
 * Rate-limited at 1 request per 5 minutes per commuter (throttle:sos) to
 * prevent abuse. The alert is stored with the commuter's lat/lng + optional
 * note, and admins are notified via the admin dashboard feed
 * (GET /admin/sos). The commuter CANNOT cancel their own SOS — only admins
 * can resolve it.
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
}
