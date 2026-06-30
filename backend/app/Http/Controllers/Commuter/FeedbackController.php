<?php

namespace App\Http\Controllers\Commuter;

use App\Http\Controllers\Controller;
use App\Http\Requests\Commuter\StoreFeedbackRequest;
use App\Services\FeedbackService;
use App\Support\Feedback\FeedbackException;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Sprint 6 — Commuter feedback submission.
 *
 *   POST /api/v1/commuter/feedback  (COMMUTER)
 *
 * The commuter first scans the unit QR (POST /qr/scan) to resolve today's
 * shift_id + crew, then submits a rating + optional comment here. The
 * service derives vehicle_id/driver_id/conductor_id from the shift_log row
 * and commuter_id from the auth user — client input only provides shift_id,
 * rating, category?, comment?. This prevents impersonation and ensures
 * feedback lands on both the driver's and conductor's profiles.
 */
class FeedbackController extends Controller
{
    use ApiResponse;

    public function __construct(
        private readonly FeedbackService $feedbackService,
    ) {}

    public function store(StoreFeedbackRequest $request): JsonResponse
    {
        try {
            $feedback = $this->feedbackService->submit(
                $request->user(),
                $request->validated(),
            );
        } catch (FeedbackException $e) {
            // Duplicate feedback (unique violation) → 409. Other FeedbackExceptions
            // (shift not found) → 422. We detect by message for the 409 case.
            $status = str_contains($e->getMessage(), 'already submitted') ? 409 : 422;
            return $this->errorResponse($e->getMessage(), $status);
        }

        return $this->successResponse($feedback, 'Feedback submitted', 201);
    }

    /**
     * GET /api/v1/commuter/feedback — the authenticated commuter's own
     * feedback history (newest first), paginated.
     *
     * Sprint 6 (S6-T7) — powers the commuter ride-history "Leave Feedback" /
     * "View Feedback" flow. The frontend fetches this once when the Payment
     * History modal opens, builds a {shift_id → feedback} map, and uses it to
     * (a) mark each PAID ride row as already-feedback-submitted, and (b)
     * populate the read-only feedback modal when the commuter reopens it.
     *
     * The commuter_id is ALWAYS auth()->id() — never read from the query — so
     * a commuter can only ever see their own feedback. Role enforcement
     * (COMMUTER only) is inherited from the /commuter route group.
     */
    public function index(Request $request): JsonResponse
    {
        $perPage = max(1, min((int) $request->query('per_page', 20), 100));

        $result = $this->feedbackService->listForCommuter(
            $request->user(),
            $perPage
        );

        return $this->successResponse($result, 'Feedback history retrieved');
    }
}
