<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\LostFound\RejectClaimRequest;
use App\Http\Requests\LostFound\StoreLostItemRequest;
use App\Http\Requests\LostFound\UpdateLostItemRequest;
use App\Http\Requests\LostFound\UploadLostItemImageRequest;
use App\Services\LostItemService;
use App\Support\LostFound\LostFoundException;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Sprint 6 (T3) — Admin Lost & Found management.
 *
 *   GET    /api/v1/admin/lost-items                          — list (with claims)
 *   POST   /api/v1/admin/lost-items                          — create reported item
 *   GET    /api/v1/admin/lost-items/{itemId}                 — detail + claims
 *   PATCH  /api/v1/admin/lost-items/{itemId}                 — edit item (blocked once CLOSED)
 *   POST   /api/v1/admin/lost-items/{itemId}/photos          — add a photo (max 3)
 *   DELETE /api/v1/admin/lost-items/{itemId}/photos/{photoId} — remove a photo
 *   PATCH  /api/v1/admin/lost-items/{itemId}/reactivate      — EXPIRED → AVAILABLE
 *   GET    /api/v1/admin/lost-items/{itemId}/claims          — claims for an item
 *   PATCH  /api/v1/admin/lost-items/{itemId}/claims/{claimId}/approve
 *   PATCH  /api/v1/admin/lost-items/{itemId}/claims/{claimId}/release
 *   PATCH  /api/v1/admin/lost-items/{itemId}/claims/{claimId}/reject
 *   PATCH  /api/v1/admin/lost-items/{itemId}/close           — close released item
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
     * GET /admin/lost-items?status=&statuses[]=&category=&per_page=
     *
     * `statuses[]` (repeated query param) filters to any of several statuses
     * at once — powers the admin History tab (?statuses[]=RELEASED&statuses[]=CLOSED)
     * without a dedicated endpoint. `status` (singular) still filters to one
     * exact status, e.g. the Expired tab (?status=EXPIRED).
     */
    public function index(Request $request): JsonResponse
    {
        $statuses = $request->query('statuses');

        $filters = [
            'status' => $request->string('status')->toString() ?: null,
            'statuses' => is_array($statuses) ? array_values(array_filter($statuses, 'is_string')) : null,
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
     * PATCH /admin/lost-items/{itemId}
     * Edits a reported item's descriptive fields. Blocked once CLOSED.
     */
    public function update(UpdateLostItemRequest $request, string $itemId): JsonResponse
    {
        try {
            $item = $this->lostItemService->update($itemId, $request->validated());
        } catch (LostFoundException $e) {
            $status = str_contains($e->getMessage(), 'not found') ? 404 : 422;

            return $this->errorResponse($e->getMessage(), $status);
        }

        return $this->successResponse($item, 'Lost item updated');
    }

    /**
     * POST /admin/lost-items/{itemId}/photos
     * Adds a photo to a lost item (multipart/form-data), up to 3 total.
     */
    public function addPhoto(UploadLostItemImageRequest $request, string $itemId): JsonResponse
    {
        try {
            $item = $this->lostItemService->addPhoto(
                $itemId,
                $request->file('image'),
            );
        } catch (LostFoundException $e) {
            $status = str_contains($e->getMessage(), 'not found') ? 404 : 422;

            return $this->errorResponse($e->getMessage(), $status);
        }

        return $this->successResponse($item, 'Photo added');
    }

    /**
     * DELETE /admin/lost-items/{itemId}/photos/{photoId}
     */
    public function destroyPhoto(string $itemId, string $photoId): JsonResponse
    {
        try {
            $item = $this->lostItemService->deletePhoto($itemId, $photoId);
        } catch (LostFoundException $e) {
            return $this->errorResponse($e->getMessage(), 404);
        }

        return $this->successResponse($item, 'Photo removed');
    }

    /**
     * PATCH /admin/lost-items/{itemId}/reactivate
     * Brings an auto-expired item back to AVAILABLE.
     */
    public function reactivate(string $itemId): JsonResponse
    {
        try {
            $item = $this->lostItemService->reactivate($itemId);
        } catch (LostFoundException $e) {
            $status = str_contains($e->getMessage(), 'not found') ? 404 : 422;

            return $this->errorResponse($e->getMessage(), $status);
        }

        return $this->successResponse($item, 'Item reactivated');
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
     * Record an in-person claimant who does not have a CHATCO account.
     * A name, proof statement, and at least one contact channel are retained
     * in the audit trail before the normal approve/release workflow.
     */
    public function storeManualClaim(Request $request, string $itemId): JsonResponse
    {
        $validated = $request->validate([
            'claimant_name' => ['required', 'string', 'max:100'],
            'claimant_contact' => ['nullable', 'string', 'max:20', 'required_without:claimant_email'],
            'claimant_email' => ['nullable', 'email', 'max:255', 'required_without:claimant_contact'],
            'proof' => ['required', 'string', 'min:10', 'max:500'],
        ]);

        try {
            $claim = $this->lostItemService->createManualClaim(
                $request->user(),
                $itemId,
                $validated,
            );
        } catch (LostFoundException $e) {
            $status = str_contains($e->getMessage(), 'not found') ? 404 : 422;

            return $this->errorResponse($e->getMessage(), $status);
        }

        return $this->successResponse($claim, 'Walk-in claimant recorded', 201);
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
