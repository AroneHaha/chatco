<?php

namespace App\Http\Controllers\Conductor;

use App\Http\ApiResponse;
use App\Http\Controllers\Controller;
use App\Models\ShiftLog;
use App\Services\HailService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * ConductorHailController (conductor-side) — handles conductor-initiated
 * hail actions for the vehicle on the conductor's currently active shift.
 *
 * GET  /api/conductor/hails             -> index()   list pending hails
 * POST /api/conductor/hails/{id}/accept -> accept()  accept a pending hail
 * POST /api/conductor/hails/{id}/reject -> reject()  reject a pending hail
 *
 * Read endpoints throttled by `conductor-read` (60 req/min per user).
 * Mutation endpoints throttled by `conductor-mutation` (30 req/min per user).
 * Role authorization handled by route-level `role:CONDUCTOR` middleware.
 */
class ConductorHailController extends Controller
{
    use ApiResponse;

    public function __construct(
        private HailService $hailService
    ) {}

    /**
     * GET /api/conductor/hails
     *
     * Returns the list of pending, non-expired hails for the vehicle on
     * the conductor's currently active shift. Returns null with 200 if
     * the conductor has no active shift (matches the existing
     * ConductorController::shiftStatus pattern).
     */
    public function index(Request $request): JsonResponse
    {
        $activeShift = ShiftLog::where('conductor_id', $request->user()->id)
            ->active()
            ->first();

        if (! $activeShift) {
            return $this->successResponse(null, 'No active shift');
        }

        $hails = $this->hailService->getPendingHailsForVehicle($activeShift->vehicle_id);

        return $this->successResponse($hails, 'Pending hails retrieved');
    }

    /**
     * POST /api/conductor/hails/{id}/accept
     *
     * Accepts a pending hail for the vehicle on the conductor's active
     * shift. HailService enforces shift ownership (abort 403), pending
     * status (abort 422), and expiry (abort 422).
     */
    public function accept(Request $request, string $id): JsonResponse
    {
        $validated = $this->validateDevice($request);
        $hail = $this->hailService->acceptHail(
            $request->user(),
            $id,
            $validated['device_id'] ?? null,
            $validated['device_type'] ?? null,
        );

        return $this->successResponse(
            $hail->load(['commuter', 'vehicle', 'conductor']),
            'Hail accepted',
        );
    }

    /**
     * POST /api/conductor/hails/{id}/reject
     *
     * Rejects a pending hail for the vehicle on the conductor's active
     * shift. HailService enforces shift ownership (abort 403) and pending
     * status (abort 422).
     */
    public function reject(Request $request, string $id): JsonResponse
    {
        $validated = $this->validateDevice($request);
        $hail = $this->hailService->rejectHail(
            $request->user(),
            $id,
            $validated['device_id'] ?? null,
            $validated['device_type'] ?? null,
        );

        return $this->successResponse(
            $hail->load(['commuter', 'vehicle']),
            'Hail rejected',
        );
    }

    private function validateDevice(Request $request): array
    {
        return $request->validate([
            'device_id' => ['nullable', 'string', 'min:16', 'max:100', 'regex:/^[A-Za-z0-9._:-]+$/'],
            'device_type' => ['nullable', 'required_with:device_id', 'string', 'in:WEB,MOBILE'],
        ]);
    }
}
