<?php

namespace App\Http\Controllers\Admin;

use App\Enums\ActivityLogCategory;
use App\Http\Controllers\Controller;
use App\Services\ActivityLogService;
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
        private readonly ActivityLogService $activityLogService,
    ) {}

    /**
     * GET /admin/sos?status=&per_page=
     *
     * Status filter semantics:
     *   - omitted         → defaults to ACTIVE (live dashboard feed)
     *   - status=ALL      → returns EVERY status (ACTIVE + ACKNOWLEDGED + RESOLVED)
     *   - status=ACTIVE   → ACTIVE only
     *   - status=RESOLVED → RESOLVED only (etc.)
     *
     * The controller owns the "default to ACTIVE" behavior so the service can
     * treat a null status filter as "no filter" (return all). This avoids the
     * conflict where the service's else-branch would re-apply ACTIVE filtering
     * even when the controller intended ALL.
     */
    public function index(Request $request): JsonResponse
    {
        // Case-insensitive like before (status=all, status=resolved), then
        // validated: unknown values and unbounded page sizes are refused
        // instead of reaching the query.
        foreach (['status', 'outcome'] as $field) {
            if (is_string($request->input($field))) {
                $request->merge([$field => strtoupper(trim($request->input($field)))]);
            }
        }
        $validated = $request->validate([
            'sort' => ['sometimes', 'in:recent,oldest'],
            'status' => ['sometimes', 'nullable', 'in:ACTIVE,ACKNOWLEDGED,RESOLVED,ALL'],
            // Safety History: a day (app timezone) and resolved-by-admin vs
            // cancelled-by-sender, applied in SQL rather than on one page.
            'date' => ['sometimes', 'nullable', 'date_format:Y-m-d'],
            'outcome' => ['sometimes', 'nullable', 'in:RESOLVED,CANCELLED'],
            'per_page' => ['sometimes', 'integer', 'min:1', 'max:100'],
            'page' => ['sometimes', 'integer', 'min:1'],
        ]);
        $statusInput = $validated['status'] ?? '';
        $filters = [
            'status' => match (true) {
                $statusInput === ''    => 'ACTIVE', // default: live feed
                $statusInput === 'ALL' => null,     // explicit ALL → no filter
                default                => $statusInput,
            },
            'sort' => $validated['sort'] ?? 'recent',
            'date' => $validated['date'] ?? null,
            'outcome' => $validated['outcome'] ?? null,
        ];
        $perPage = (int) ($validated['per_page'] ?? 15);

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

        $this->activityLogService->record(
            ActivityLogCategory::SOS,
            'Acknowledged SOS alert #' . substr($alert->id, 0, 8),
            $request->user(),
        );

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

        $this->activityLogService->record(
            ActivityLogCategory::SOS,
            'Resolved SOS alert #' . substr($alert->id, 0, 8),
            $request->user(),
        );

        return $this->successResponse($alert, 'SOS alert resolved');
    }
}
