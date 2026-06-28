<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Services\SosService;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Sprint 6 (T5) — Admin SOS alert management.
 *
 *   GET   /api/v1/admin/sos                      — paginated feed (default: ACTIVE)
 *   PATCH /api/v1/admin/sos/{id}/acknowledge     — ACTIVE → ACKNOWLEDGED
 *   PATCH /api/v1/admin/sos/{id}/resolve         — any → RESOLVED
 *
 * Admins monitor the live feed, acknowledge alerts (signal 'I see this'),
 * and resolve them when the situation is handled. Acknowledge is idempotent;
 * resolve is terminal (422 if already resolved).
 */
class AdminSosController extends Controller
{
    use ApiResponse;

    public function __construct(
        private readonly SosService $sosService,
    ) {}

    /**
     * GET /admin/sos?status=&per_page=
     * Default filter: status=ACTIVE (live dashboard). Pass status=ALL for everything.
     */
    public function index(Request $request): JsonResponse
    {
        $status = $request->string('status')->toString() ?: null;
        $filters = [
            'status' => ($status && strtoupper($status) !== 'ALL') ? $status : null,
        ];
        $perPage = (int) $request->integer('per_page', 15);

        $alerts = $this->sosService->listActive($request->user(), $filters, $perPage);

        return $this->successResponse($alerts, 'SOS alerts retrieved');
    }

    /**
     * PATCH /admin/sos/{id}/acknowledge
     */
    public function acknowledge(Request $request, string $id): JsonResponse
    {
        try {
            $alert = $this->sosService->acknowledge($request->user(), $id);
        } catch (\RuntimeException $e) {
            $status = str_contains($e->getMessage(), 'not found') ? 404 : 422;
            return $this->errorResponse($e->getMessage(), $status);
        }

        return $this->successResponse($alert, 'SOS alert acknowledged');
    }

    /**
     * PATCH /admin/sos/{id}/resolve
     */
    public function resolve(Request $request, string $id): JsonResponse
    {
        try {
            $alert = $this->sosService->resolve($request->user(), $id);
        } catch (\RuntimeException $e) {
            $status = str_contains($e->getMessage(), 'not found') ? 404 : 422;
            return $this->errorResponse($e->getMessage(), $status);
        }

        return $this->successResponse($alert, 'SOS alert resolved');
    }
}
