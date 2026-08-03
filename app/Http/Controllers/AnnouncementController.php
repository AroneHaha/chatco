<?php

namespace App\Http\Controllers;

use App\Services\AnnouncementService;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Sprint 6 (T4) — User-facing announcement reads (any authenticated role).
 *
 *   GET  /api/v1/announcements                — ACTIVE feed with is_read flag
 *   POST /api/v1/announcements/{id}/read      — mark-as-read (idempotent, 204)
 *   GET  /api/v1/announcements/unread-count   — bell badge count
 *
 * Admin CRUD lives in AdminAnnouncementController. This split keeps the
 * role middleware clean: reads are open to all authenticated users, writes
 * are admin-only.
 */
class AnnouncementController extends Controller
{
    use ApiResponse;

    public function __construct(
        private readonly AnnouncementService $announcementService,
    ) {}

    /**
     * GET /announcements?unread_only=1&per_page=
     */
    public function index(Request $request): JsonResponse
    {
        $filters = [
            'unread_only' => $request->boolean('unread_only'),
        ];
        $perPage = (int) $request->integer('per_page', 15);

        $announcements = $this->announcementService->listForUser(
            $request->user(),
            $filters,
            $perPage,
        );

        return $this->successResponse($announcements, 'Announcements retrieved');
    }

    /**
     * POST /announcements/{id}/read
     * Idempotent — returns 204 (No Content) on success.
     */
    public function markRead(Request $request, string $id): JsonResponse
    {
        try {
            $this->announcementService->markRead($request->user(), $id);
        } catch (\RuntimeException $e) {
            return $this->errorResponse($e->getMessage(), 404);
        }

        return response()->json([
            'success' => true,
            'data'    => null,
            'message' => 'Marked as read',
            'errors'  => null,
            'meta'    => null,
        ], 200);
    }

    /**
     * GET /announcements/unread-count
     */
    public function unreadCount(Request $request): JsonResponse
    {
        $count = $this->announcementService->unreadCount($request->user());

        return $this->successResponse(['count' => $count], 'Unread count retrieved');
    }
}
