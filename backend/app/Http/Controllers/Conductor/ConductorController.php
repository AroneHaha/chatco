<?php

namespace App\Http\Controllers\Conductor;

use App\Http\Controllers\Controller;
use App\Http\Middleware\ApiResponse;
use App\Services\LocationService;
use App\Services\ShiftService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ConductorController extends Controller
{
    use ApiResponse;

    protected ShiftService $shiftService;
    protected LocationService $locationService;

    public function __construct(ShiftService $shiftService, LocationService $locationService)
    {
        $this->shiftService = $shiftService;
        $this->locationService = $locationService;
    }

    /**
     * POST /api/conductor/location
     * Update GPS position during an active shift.
     * Body: { lat, lng, speed?, heading?, capacity_status? }
     */
    public function location(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'lat' => 'required|numeric',
            'lng' => 'required|numeric',
            'speed' => 'nullable|numeric',
            'heading' => 'nullable|numeric',
            'capacity_status' => 'nullable|string|in:AVAILABLE,STANDING,FULL',
        ]);

        $location = $this->locationService->updateLocation(
            $request->user(),
            (float) $validated['lat'],
            (float) $validated['lng'],
            isset($validated['speed']) ? (float) $validated['speed'] : null,
            isset($validated['heading']) ? (float) $validated['heading'] : null,
            $validated['capacity_status'] ?? null,
        );

        return $this->successResponse($location, 'Location updated');
    }

    /**
     * POST /api/conductor/capacity-status
     * Update vehicle capacity status during an active shift.
     * Body: { capacity_status: 'AVAILABLE' | 'STANDING' | 'FULL' }
     */
    public function updateCapacityStatus(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'capacity_status' => 'required|string|in:AVAILABLE,STANDING,FULL',
        ]);

        $location = $this->locationService->updateCapacityStatus(
            $request->user(),
            $validated['capacity_status'],
        );

        return $this->successResponse($location, 'Capacity status updated');
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
     * GET /api/conductor/remittances
     */
    public function remittances(Request $request): JsonResponse
    {
        $perPage = $request->integer('per_page', 15);

        $shiftLogs = $this->shiftService->getShiftLogs($request->user(), $perPage);

        return $this->successResponse($shiftLogs, 'Shift history retrieved');
    }

    /**
     * GET /api/conductor/transactions
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