<?php

namespace App\Http\Controllers\Admin;

use App\Enums\ActivityLogCategory;
use App\Http\Controllers\Controller;
use App\Http\Requests\LostFound\ApproveClaimRequest;
use App\Http\Requests\LostFound\RejectClaimRequest;
use App\Http\Requests\LostFound\StoreLostItemRequest;
use App\Http\Requests\LostFound\UpdateLostItemRequest;
use App\Http\Requests\LostFound\UploadLostItemImageRequest;
use App\Models\LostItem;
use App\Services\ActivityLogService;
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
 *   POST   /api/v1/admin/lost-items/{itemId}/photos/{photoId} — replace a photo in place
 *   DELETE /api/v1/admin/lost-items/{itemId}/photos/{photoId} — remove a photo
 *   PATCH  /api/v1/admin/lost-items/{itemId}/reactivate      — EXPIRED → AVAILABLE
 *   PATCH  /api/v1/admin/lost-items/reactivate               — bulk EXPIRED → AVAILABLE
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
        private readonly ActivityLogService $activityLogService,
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
            'search' => $request->string('search')->toString() ?: null,
            'date' => $request->string('date')->toString() ?: null,
        ];
        $perPage = min(max((int) $request->integer('per_page', 15), 1), 50);

        $items = $this->lostItemService->listForAdmin($filters, $perPage);

        return $this->successResponse($items, 'Lost items retrieved');
    }

    /** GET /admin/lost-items/recent-claims */
    public function recentClaims(): JsonResponse
    {
        return $this->successResponse($this->lostItemService->recentClaims(5), 'Recent claims retrieved');
    }

    /**
     * POST /admin/lost-items
     */
    public function store(StoreLostItemRequest $request): JsonResponse
    {
        $item = $this->lostItemService->create($request->user(), $request->validated());

        $this->activityLogService->record(
            ActivityLogCategory::LOST_FOUND,
            "Reported lost item \"{$item->item_name}\"",
            $request->user(),
        );

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
        // The unit is logged by plate number (vehicle_id is just its key).
        $fields = [
            'item_name' => 'Item name',
            'description' => 'Description',
            'category' => 'Category',
            'plate_number' => 'Plate number',
            'driver_name' => 'Driver',
            'conductor_name' => 'Conductor',
            'estimated_time_lost' => 'Estimated time lost',
        ];
        $before = LostItem::query()->find($itemId)?->only(array_keys($fields)) ?? [];

        try {
            $item = $this->lostItemService->update($itemId, $request->validated());
        } catch (LostFoundException $e) {
            $status = str_contains($e->getMessage(), 'not found') ? 404 : 422;

            return $this->errorResponse($e->getMessage(), $status);
        }

        $changes = ActivityLogService::diff($before, $item->only(array_keys($fields)), $fields);
        if ($changes !== []) {
            $this->activityLogService->record(
                ActivityLogCategory::LOST_FOUND,
                "Updated lost item \"{$item->item_name}\": ".ActivityLogService::changedFields($changes),
                $request->user(),
                $changes,
            );
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

        $this->activityLogService->record(
            ActivityLogCategory::LOST_FOUND,
            "Added a photo to lost item \"{$item->item_name}\"",
            $request->user(),
        );

        return $this->successResponse($item, 'Photo added');
    }

    /**
     * POST /admin/lost-items/{itemId}/photos/{photoId}
     * Replaces one photo's file in place (multipart/form-data), keeping its
     * position. POST rather than PATCH: PHP doesn't parse multipart bodies
     * on PATCH/PUT.
     */
    public function replacePhoto(UploadLostItemImageRequest $request, string $itemId, string $photoId): JsonResponse
    {
        try {
            $item = $this->lostItemService->replacePhoto(
                $itemId,
                $photoId,
                $request->file('image'),
            );
        } catch (LostFoundException $e) {
            return $this->errorResponse($e->getMessage(), 404);
        }

        $this->activityLogService->record(
            ActivityLogCategory::LOST_FOUND,
            "Replaced a photo of lost item \"{$item->item_name}\"",
            $request->user(),
        );

        return $this->successResponse($item, 'Photo replaced');
    }

    /**
     * DELETE /admin/lost-items/{itemId}/photos/{photoId}
     */
    public function destroyPhoto(Request $request, string $itemId, string $photoId): JsonResponse
    {
        try {
            $item = $this->lostItemService->deletePhoto($itemId, $photoId);
        } catch (LostFoundException $e) {
            return $this->errorResponse($e->getMessage(), 404);
        }

        $this->activityLogService->record(
            ActivityLogCategory::LOST_FOUND,
            "Removed a photo from lost item \"{$item->item_name}\"",
            $request->user(),
        );

        return $this->successResponse($item, 'Photo removed');
    }

    /**
     * PATCH /admin/lost-items/{itemId}/reactivate
     * Brings an auto-expired item back to AVAILABLE.
     */
    public function reactivate(Request $request, string $itemId): JsonResponse
    {
        try {
            $item = $this->lostItemService->reactivate($itemId);
        } catch (LostFoundException $e) {
            $status = str_contains($e->getMessage(), 'not found') ? 404 : 422;

            return $this->errorResponse($e->getMessage(), $status);
        }

        $this->activityLogService->record(
            ActivityLogCategory::LOST_FOUND,
            "Reactivated lost item \"{$item->item_name}\"",
            $request->user(),
        );

        return $this->successResponse($item, 'Item reactivated');
    }

    /**
     * PATCH /admin/lost-items/reactivate  { item_ids: string[] }
     * Bulk version of reactivate() for the Expired tab's multi-select. One
     * request and one transaction instead of N calls (which would also run
     * into the admin-write rate limit). Ids that are no longer EXPIRED or no
     * longer exist are skipped, not failed, so a stale selection still
     * reactivates everything it can.
     */
    public function reactivateMany(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'item_ids' => ['required', 'array', 'min:1', 'max:'.LostItemService::MAX_BULK_REACTIVATE],
            'item_ids.*' => ['required', 'string', 'max:64'],
        ]);

        $result = $this->lostItemService->reactivateMany($validated['item_ids']);

        $count = count($result['reactivated']);
        if ($count > 0) {
            $this->activityLogService->record(
                ActivityLogCategory::LOST_FOUND,
                $count === 1
                    ? "Reactivated lost item \"{$result['names'][0]}\""
                    : "Reactivated {$count} lost items: ".implode(', ', array_map(fn (string $name) => "\"{$name}\"", $result['names'])),
                $request->user(),
            );
        }

        return $this->successResponse([
            'reactivated' => $result['reactivated'],
            'skipped' => $result['skipped'],
        ], $count === 1 ? '1 item reactivated' : "{$count} items reactivated");
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

        $this->activityLogService->record(
            ActivityLogCategory::LOST_FOUND,
            "Recorded walk-in claim by {$validated['claimant_name']} on lost item \"{$claim->item?->item_name}\"",
            $request->user(),
        );

        return $this->successResponse($claim, 'Walk-in claimant recorded', 201);
    }

    /**
     * PATCH /admin/lost-items/{itemId}/claims/{claimId}/approve
     */
    public function approveClaim(ApproveClaimRequest $request, string $itemId, string $claimId): JsonResponse
    {
        try {
            $claim = $this->lostItemService->approveClaim(
                $request->user(),
                $itemId,
                $claimId,
                $request->validated(),
            );
        } catch (LostFoundException $e) {
            $status = str_contains($e->getMessage(), 'not found') ? 404 : 422;

            return $this->errorResponse($e->getMessage(), $status);
        }

        $this->activityLogService->record(
            ActivityLogCategory::LOST_FOUND,
            "Approved claim on lost item \"{$claim->item?->item_name}\"",
            $request->user(),
        );

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

        $this->activityLogService->record(
            ActivityLogCategory::LOST_FOUND,
            "Released lost item \"{$claim->item?->item_name}\" to claimant",
            $request->user(),
        );

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

        $this->activityLogService->record(
            ActivityLogCategory::LOST_FOUND,
            "Rejected claim on lost item \"{$claim->item?->item_name}\"",
            $request->user(),
        );

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

        $this->activityLogService->record(
            ActivityLogCategory::LOST_FOUND,
            "Closed lost item \"{$item->item_name}\"",
            $request->user(),
        );

        return $this->successResponse($item, 'Item closed');
    }
}
