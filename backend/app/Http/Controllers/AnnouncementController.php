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
 *   POST /api/v1/announcements/mark-all-read  — bulk mark-as-read
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

    /** Parse a `types` param (comma-separated string or array) into a clean string array. */
    private function parseTypes(Request $request, string $key = 'types'): array
    {
        $raw = $request->query($key, $request->input($key));
        if (is_string($raw)) {
            $raw = explode(',', $raw);
        }
        if (! is_array($raw)) {
            return [];
        }

        return array_values(array_filter(array_map('trim', $raw), fn ($t) => $t !== ''));
    }

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
     * GET /announcements/unread-count?types=claim_approved,claim_rejected
     * `types` is optional — omitted, it counts every ACTIVE unread announcement.
     */
    public function unreadCount(Request $request): JsonResponse
    {
        $count = $this->announcementService->unreadCount($request->user(), $this->parseTypes($request));

        return $this->successResponse(['count' => $count], 'Unread count retrieved');
    }

    /**
     * POST /announcements/mark-all-read?types=claim_approved,claim_rejected
     * `types` is optional — omitted, it marks every ACTIVE unread announcement
     * visible to the user as read.
     */
    public function markAllRead(Request $request): JsonResponse
    {
        $count = $this->announcementService->markAllRead($request->user(), $this->parseTypes($request));

        return $this->successResponse(['count' => $count], 'Marked as read');
    }
}
