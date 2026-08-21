<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Announcement\StoreAnnouncementRequest;
use App\Http\Requests\Announcement\UpdateAnnouncementRequest;
use App\Services\AnnouncementService;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Sprint 6 (T4) — Admin announcement management.
 *
 *   GET    /api/v1/admin/announcements             — list (incl. ARCHIVED)
 *   GET    /api/v1/admin/announcements?count_only=1 — total only (same filters), for header counts
 *   POST   /api/v1/admin/announcements             — create
 *   GET    /api/v1/admin/announcements/{id}        — detail
 *   PUT    /api/v1/admin/announcements/{id}        — update title/message/type
 *   PATCH  /api/v1/admin/announcements/{id}/archive — soft-archive (status=ARCHIVED)
 *
 * Replaces the old AdminController::announcements() 501 stub. User-facing
 * reads (feed + mark-as-read) live in AnnouncementController (top-level).
 */
class AdminAnnouncementController extends Controller
{
    use ApiResponse;

    public function __construct(
        private readonly AnnouncementService $announcementService,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $filters = [
            'status' => $request->string('status')->toString() ?: null,
            'type' => $request->string('type')->toString() ?: null,
            'search' => $request->string('search')->toString() ?: null,
            'date' => $request->string('date')->toString() ?: null,
            'date_range' => $request->string('date_range')->toString() ?: null,
        ];

        if ($request->boolean('count_only')) {
            return $this->successResponse([
                'total' => $this->announcementService->countForAdmin($filters),
            ], 'Announcement count retrieved');
        }

        $perPage = (int) $request->integer('per_page', 15);

        $announcements = $this->announcementService->listForAdmin($filters, $perPage);

        return $this->successResponse($announcements, 'Announcements retrieved');
    }

    public function store(StoreAnnouncementRequest $request): JsonResponse
    {
        $announcement = $this->announcementService->create(
            $request->user(),
            $request->validated(),
        );

        return $this->successResponse($announcement, 'Announcement created', 201);
    }

    public function show(string $id): JsonResponse
    {
        try {
            $announcement = $this->announcementService->show($id);
        } catch (\RuntimeException $e) {
            return $this->errorResponse($e->getMessage(), 404);
        }

        return $this->successResponse($announcement, 'Announcement retrieved');
    }

    public function update(UpdateAnnouncementRequest $request, string $id): JsonResponse
    {
        try {
            $announcement = $this->announcementService->update($id, $request->validated());
        } catch (\RuntimeException $e) {
            return $this->errorResponse($e->getMessage(), 404);
        }

        return $this->successResponse($announcement, 'Announcement updated');
    }

    public function archive(string $id): JsonResponse
    {
        try {
            $announcement = $this->announcementService->archive($id);
        } catch (\RuntimeException $e) {
            return $this->errorResponse($e->getMessage(), 404);
        }

        return $this->successResponse($announcement, 'Announcement archived');
    }
}
