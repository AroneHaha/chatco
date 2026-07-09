<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Services\FeedbackService;
use App\Support\Feedback\FeedbackException;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Sprint 6 (T6 revised) — Admin feedback listing for staff performance review.
 *
 *   GET /api/v1/admin/feedback?conductor_id={uuid}
 *   GET /api/v1/admin/feedback?driver_id={uuid}
 *
 * Replaces the standalone "Feedback QR" admin module. The admin now views
 * driver/conductor feedback directly from User Management by double-clicking
 * a row. One of conductor_id / driver_id is required (mutually exclusive —
 * if both are passed, conductor_id wins). Returns paginated feedback plus a
 * summary (average_rating, total_count, 5→1 distribution) so the modal can
 * render aggregate stats alongside the per-shift rows.
 *
 * Role enforcement: ADMIN only (inherited from the /admin route group).
 * Conductor not found / Driver not found → 404. Neither param supplied → 422.
 */
class AdminFeedbackController extends Controller
{
    use ApiResponse;

    public function __construct(
        private readonly FeedbackService $feedbackService,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $conductorId = $request->query('conductor_id');
        $driverId = $request->query('driver_id');
        $perPage = max(1, min((int) $request->query('per_page', 10), 50));

        if (! $conductorId && ! $driverId) {
            return $this->errorResponse(
                'Either conductor_id or driver_id is required.',
                422,
                ['conductor_id' => ['One of conductor_id or driver_id is required.']]
            );
        }

        try {
            $result = $conductorId
                ? $this->feedbackService->listForConductor($conductorId, $perPage)
                : $this->feedbackService->listForDriver($driverId, $perPage);
        } catch (FeedbackException $e) {
            return $this->errorResponse($e->getMessage(), 404);
        }

        return $this->successResponse($result, 'Feedback retrieved');
    }
}
