<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\LostFound\RejectClaimRequest;
use App\Http\Requests\LostFound\StoreLostItemRequest;
use App\Http\Requests\LostFound\UploadLostItemImageRequest;
use App\Services\LostItemService;
use App\Support\LostFound\LostFoundException;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Sprint 6 (T3) — Admin Lost & Found management.
 *
 *   GET   /api/v1/admin/lost-items                          — list (with claims)
 *   POST  /api/v1/admin/lost-items                          — create reported item
 *   GET   /api/v1/admin/lost-items/{itemId}                 — detail + claims
 *   POST  /api/v1/admin/lost-items/{itemId}/image           — upload item image
 *   GET   /api/v1/admin/lost-items/{itemId}/claims          — claims for an item
 *   PATCH /api/v1/admin/lost-items/{itemId}/claims/{claimId}/approve
 *   PATCH /api/v1/admin/lost-items/{itemId}/claims/{claimId}/release
 *   PATCH /api/v1/admin/lost-items/{itemId}/claims/{claimId}/reject
 *   PATCH /api/v1/admin/lost-items/{itemId}/close           — close released item
 *
 * This replaces the old AdminController::lostItems() 501 stub. All routes
 * are behind role:ADMIN via the admin route group.
 */
class AdminLostItemController extends Controller
{
    use ApiResponse;

    public function __construct(
        private readonly LostItemService $lostItemService,
    ) {}

    /**
     * GET /admin/lost-items?status=&category=&per_page=
     */
    public function index(Request $request): JsonResponse
    {
        $filters = [
            'status'   => $request->string('status')->toString() ?: null,
            'category' => $request->string('category')->toString() ?: null,
        ];
        $perPage = (int) $request->integer('per_page', 15);

        $items = $this->lostItemService->listForAdmin($filters, $perPage);

        return $this->successResponse($items, 'Lost items retrieved');
    }

    /**
     * POST /admin/lost-items
     */
    public function store(StoreLostItemRequest $request): JsonResponse
    {
        $item = $this->lostItemService->create($request->user(), $request->validated());

        return $this->successResponse($item, 'Lost item created', 201);
    }

    /**
     * GET /admin/lost-items/{itemId}
     */
    public function show(string $itemId): JsonResponse
    {
        try {
            $item = $this->lostItemService->show($itemId);
        } catch (LostFoundException $e) {
            return $this->errorResponse($e->getMessage(), 404);
        }

        return $this->successResponse($item, 'Lost item retrieved');
    }

    /**
     * POST /admin/lost-items/{itemId}/image
     * Uploads an image for a lost item (multipart/form-data).
     */
    public function uploadImage(UploadLostItemImageRequest $request, string $itemId): JsonResponse
    {
        try {
            $item = $this->lostItemService->uploadImage(
                $itemId,
                $request->file('image'),
            );
        } catch (LostFoundException $e) {
            return $this->errorResponse($e->getMessage(), 404);
        }

        return $this->successResponse($item, 'Image uploaded');
    }

    /**
     * GET /admin/lost-items/{itemId}/claims
     */
    public function claims(string $itemId): JsonResponse
    {
        try {
            $claims = $this->lostItemService->claimsForItem($itemId);
        } catch (LostFoundException $e) {
            return $this->errorResponse($e->getMessage(), 404);
        }

        return $this->successResponse($claims, 'Claims retrieved');
    }

    /**
     * PATCH /admin/lost-items/{itemId}/claims/{claimId}/approve
     */
    public function approveClaim(Request $request, string $itemId, string $claimId): JsonResponse
    {
        try {
            $claim = $this->lostItemService->approveClaim(
                $request->user(),
                $itemId,
                $claimId,
            );
        } catch (LostFoundException $e) {
            $status = str_contains($e->getMessage(), 'not found') ? 404 : 422;
            return $this->errorResponse($e->getMessage(), $status);
        }

        return $this->successResponse($claim, 'Claim approved');
    }

    /**
     * PATCH /admin/lost-items/{itemId}/claims/{claimId}/release
     * Releases an approved claim — records handover (released_to + released_at).
     */
    public function releaseClaim(Request $request, string $itemId, string $claimId): JsonResponse
    {
        try {
            $claim = $this->lostItemService->releaseClaim(
                $request->user(),
                $itemId,
                $claimId,
            );
        } catch (LostFoundException $e) {
            $status = str_contains($e->getMessage(), 'not found') ? 404 : 422;
            return $this->errorResponse($e->getMessage(), $status);
        }

        return $this->successResponse($claim, 'Claim released');
    }

    /**
     * PATCH /admin/lost-items/{itemId}/claims/{claimId}/reject
     */
    public function rejectClaim(RejectClaimRequest $request, string $itemId, string $claimId): JsonResponse
    {
        try {
            $claim = $this->lostItemService->rejectClaim(
                $request->user(),
                $itemId,
                $claimId,
                $request->validated()['rejection_reason'] ?? null,
            );
        } catch (LostFoundException $e) {
            $status = str_contains($e->getMessage(), 'not found') ? 404 : 422;
            return $this->errorResponse($e->getMessage(), $status);
        }

        return $this->successResponse($claim, 'Claim rejected');
    }

    /**
     * PATCH /admin/lost-items/{itemId}/close
     */
    public function close(Request $request, string $itemId): JsonResponse
    {
        try {
            $item = $this->lostItemService->close(
                $request->user(),
                $itemId,
            );
        } catch (LostFoundException $e) {
            $status = str_contains($e->getMessage(), 'not found') ? 404 : 422;
            return $this->errorResponse($e->getMessage(), $status);
        }

        return $this->successResponse($item, 'Item closed');
    }
}
