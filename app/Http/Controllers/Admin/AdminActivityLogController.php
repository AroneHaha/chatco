<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Services\ActivityLogService;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Admin activity log — read-only audit trail.
 *
 *   GET /api/v1/admin/activity-logs — paginated list (?category=, ?search=,
 *   ?date=, ?date_range=, ?per_page=, ?page=)
 *
 * Rows are written by ActivityLogService::record(), called from every other
 * admin controller right after a mutating action succeeds — this controller
 * only reads.
 */
class AdminActivityLogController extends Controller
{
    use ApiResponse;

    public function __construct(
        private readonly ActivityLogService $activityLogService,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $filters = [
            'category' => $request->string('category')->toString() ?: null,
            'search' => $request->string('search')->toString() ?: null,
            'date' => $request->string('date')->toString() ?: null,
            'date_range' => $request->string('date_range')->toString() ?: null,
        ];

        $perPage = (int) $request->integer('per_page', 30);

        $logs = $this->activityLogService->listForAdmin($filters, $perPage);

        return $this->successResponse($logs, 'Activity logs retrieved');
    }
}
