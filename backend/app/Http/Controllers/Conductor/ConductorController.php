<?php

namespace App\Http\Controllers\Conductor;

use App\Http\Controllers\Controller;
use App\Http\ApiResponse;
use App\Services\ShiftService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ConductorController extends Controller
{
    use ApiResponse;

    protected ShiftService $shiftService;

    public function __construct(ShiftService $shiftService)
    {
        $this->shiftService = $shiftService;
    }

    /**
     * POST /api/conductor/location
     * Sprint 3 — placeholder for now.
     */
    public function location(Request $request): JsonResponse
    {
        return $this->notImplementedResponse();
    }

    /**
     * GET /api/conductor/shift
     * Get the conductor's current active shift.
     */
    public function shift(Request $request): JsonResponse
    {
        $activeShift = $this->shiftService->getActiveShift($request->user());

        if (! $activeShift) {
            return $this->successResponse(null, 'No active shift');
        }

        return $this->successResponse($activeShift, 'Active shift retrieved');
    }

    /**
     * POST /api/conductor/shift/start
     * Start a new shift — conductor selects vehicle and driver.
     *
     * Body: { vehicle_id, driver_id, route_id? }
     */
    public function shiftStart(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'vehicle_id' => 'required|uuid|exists:vehicles,id',
            'driver_id' => 'required|uuid|exists:drivers,id',
            'route_id' => 'nullable|uuid|exists:routes,id',
        ]);

        $shiftLog = $this->shiftService->startShift(
            $request->user(),
            $validated['vehicle_id'],
            $validated['driver_id'],
            $validated['route_id'] ?? null,
        );

        return $this->successResponse(
            $shiftLog->load(['vehicle', 'driver', 'route']),
            'Shift started',
            201,
        );
    }

    /**
     * POST /api/conductor/shift/end
     * End shift via remittance submission.
     * Shift ends ONLY when remittance is submitted — no standalone end.
     *
     * Body: { shift_id, total_collected, remitted_amount }
     */
    public function shiftEnd(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'shift_id' => 'required|string|exists:shift_logs,shift_id',
            'total_collected' => 'required|numeric|min:0',
            'remitted_amount' => 'required|numeric|min:0',
        ]);

        $shiftLog = $this->shiftService->endShiftViaRemittance(
            $request->user(),
            $validated['shift_id'],
            (float) $validated['total_collected'],
            (float) $validated['remitted_amount'],
        );

        return $this->successResponse(
            $shiftLog->load(['vehicle', 'driver', 'route', 'remittance']),
            'Shift ended via remittance',
        );
    }

    /**
     * GET /api/conductor/shift/{shiftId}
     * Get a single shift detail with all relationships.
     */
    public function shiftDetail(Request $request, string $shiftId): JsonResponse
    {
        $shiftLog = $this->shiftService->getShiftDetail($request->user(), $shiftId);

        return $this->successResponse($shiftLog, 'Shift detail retrieved');
    }

    /**
     * GET /api/conductor/remittances
     * Get paginated shift history for the conductor.
     */
    public function remittances(Request $request): JsonResponse
    {
        $perPage = $request->integer('per_page', 15);

        $shiftLogs = $this->shiftService->getShiftLogs($request->user(), $perPage);

        return $this->successResponse($shiftLogs, 'Shift history retrieved');
    }

    /**
     * GET /api/conductor/transactions
     * Get shift detail with transactions.
     * Query param: shift_id (required)
     */
    public function transactions(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'shift_id' => 'required|string|exists:shift_logs,shift_id',
        ]);

        $shiftLog = $this->shiftService->getShiftDetail(
            $request->user(),
            $validated['shift_id'],
        );

        return $this->successResponse($shiftLog, 'Shift detail retrieved');
    }
}