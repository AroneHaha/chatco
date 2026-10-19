<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Services\ActivityLogService;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Activity log — read-only audit trail.
 *
 *   GET /api/v1/admin/activity-logs — paginated list (?category=, ?search=,
 *   ?actor_role=, ?date=, ?date_range=, ?per_page= (1–100), ?page=)
 *
 *   GET /api/v1/admin/activity-logs/export — every row matching the same
 *   filters, newest first, capped at ActivityLogService::EXPORT_LIMIT, plus
 *   the full match count so the page can say when the export was cut short.
 *
 * Rows are written by ActivityLogService::record() from the admin
 * controllers, the commuter account endpoints and the scheduled jobs — this
 * controller only reads.
 */
class AdminActivityLogController extends Controller
{
    use ApiResponse;

    public function __construct(
        private readonly ActivityLogService $activityLogService,
    ) {}

    public function index(Request $request): JsonResponse
    {
        // Capped like the other admin lists, so a crafted per_page can't
        // load the whole table in one request.
        $perPage = max(1, min((int) $request->integer('per_page', 30), 100));

        $logs = $this->activityLogService->listForAdmin($this->filters($request), $perPage);

        return $this->successResponse($logs, 'Activity logs retrieved');
    }

    public function export(Request $request): JsonResponse
    {
        return $this->successResponse(
            $this->activityLogService->exportForAdmin($this->filters($request)),
            'Activity logs exported',
        );
    }

    private function filters(Request $request): array
    {
        return [
            'category' => $request->string('category')->toString() ?: null,
            'search' => $request->string('search')->toString() ?: null,
            'actor_role' => $request->string('actor_role')->toString() ?: null,
            'date' => $request->string('date')->toString() ?: null,
            'date_range' => $request->string('date_range')->toString() ?: null,
        ];
    }
}
