<?php

namespace App\Http\Controllers;

use App\Http\Requests\LostFound\ClaimLostItemRequest;
use App\Services\LostItemService;
use App\Support\LostFound\LostFoundException;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Sprint 6 (T3) — Lost & Found shared endpoints (browse + claim).
 *
 *   GET  /api/v1/lost-found                (any auth role) — paginated browse
 *   GET  /api/v1/lost-found/{itemId}       (any auth role) — item detail
 *   POST /api/v1/lost-found/{itemId}/claim (COMMUTER)       — submit a claim
 *
 * Admin-only operations (create item, review claims, close) live in
 * AdminLostItemController. This split keeps the role middleware clean:
 * browse is open to all authenticated users, claim is commuter-only, and
 * management is admin-only.
 */
class LostItemController extends Controller
{
    use ApiResponse;

    public function __construct(
        private readonly LostItemService $lostItemService,
    ) {}

    /**
     * GET /lost-found?status=&category=&search=&per_page=
     */
    public function index(Request $request): JsonResponse
    {
        $filters = [
            'status'   => $request->string('status')->toString() ?: null,
            'category' => $request->string('category')->toString() ?: null,
            'search'   => $request->string('search')->toString() ?: null,
        ];
        $perPage = (int) $request->integer('per_page', 15);

        $items = $this->lostItemService->listItems($filters, $perPage);

        return $this->successResponse($items, 'Lost items retrieved');
    }

    /**
     * GET /lost-found/{itemId}
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
     * POST /lost-found/{itemId}/claim
     */
    public function claim(ClaimLostItemRequest $request, string $itemId): JsonResponse
    {
        try {
            $claim = $this->lostItemService->claim(
                $request->user(),
                $itemId,
                $request->validated(),
            );
        } catch (LostFoundException $e) {
            $status = str_contains($e->getMessage(), 'not found') ? 404 : 422;
            return $this->errorResponse($e->getMessage(), $status);
        }

        return $this->successResponse($claim, 'Claim submitted', 201);
    }
}
