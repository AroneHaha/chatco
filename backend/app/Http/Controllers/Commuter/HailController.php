<?php

namespace App\Http\Controllers\Commuter;

use App\Exceptions\OutsideRadiusException;
use App\Http\ApiResponse;
use App\Http\Controllers\Controller;
use App\Http\Requests\Commuter\CreateHailRequest;
use App\Services\HailService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * HailController (commuter-side) — handles commuter-initiated hail actions.
 *
 * POST   /api/commuter/hail      -> store()   create a new hail
 * DELETE /api/commuter/hail/{id} -> destroy() cancel a pending hail
 *
 * Throttled by `commuter-hail` rate limiter (10 req/min per user).
 * Role authorization handled by route-level `role:COMMUTER` middleware.
 */
class HailController extends Controller
{
    use ApiResponse;

    public function __construct(
        private HailService $hailService
    ) {}

    /**
     * POST /api/commuter/hail
     *
     * Validates the payload via CreateHailRequest, then delegates to
     * HailService::createHail() which enforces the 1KM radius rule.
     *
     * Returns:
     *   201 — hail created successfully
     *   422 — { error: 'outside_radius', distance_m: N } when distance > 1KM
     *   409 — duplicate pending hail (shaped by global exception handler)
     *   422 — validation errors (shaped by global exception handler)
     */
    public function store(CreateHailRequest $request): JsonResponse
    {
        $validated = $request->validated();

        try {
            $hail = $this->hailService->createHail(
                $request->user(),
                $validated['vehicle_id'],
                (float) $validated['commuter_lat'],
                (float) $validated['commuter_lng'],
            );
        } catch (OutsideRadiusException $e) {
            // Spec-mandated response shape: { error: 'outside_radius', distance_m: N }
            // Intentionally does NOT use the standard ApiResponse envelope so the
            // frontend can branch on the `error` discriminator field.
            return response()->json([
                'error'      => 'outside_radius',
                'distance_m' => $e->distanceMeters,
            ], 422);
        }

        return $this->successResponse(
            $hail->load(['commuter', 'vehicle']),
            'Hail created',
            201,
        );
    }

    /**
     * DELETE /api/commuter/hail/{id}
     *
     * Cancels a pending hail owned by the authenticated commuter.
     * HailService enforces ownership (abort 403) and pending status
     * (abort 422).
     */
    public function destroy(Request $request, string $id): JsonResponse
    {
        $hail = $this->hailService->cancelHail($request->user(), $id);

        return $this->successResponse(
            $hail,
            'Hail cancelled',
        );
    }
}
