<?php

namespace App\Http\Controllers\Conductor;

use App\Http\Controllers\Controller;
use App\Http\ApiResponse;
use App\Http\Requests\Conductor\StartShiftRequest;
use App\Http\Requests\Conductor\UpdateLocationRequest;
use App\Http\Requests\Conductor\SubmitRemittanceRequest;
use App\Models\Driver;
use App\Models\Vehicle;
use App\Services\LocationService;
use App\Services\ShiftService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

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
     * GET /api/conductor/shift
     */
    public function shiftStatus(Request $request): JsonResponse
    {
        $activeShift = $this->shiftService->getActiveShift($request->user());

        if (! $activeShift) {
            return $this->successResponse(null, 'No active shift');
        }

        return $this->successResponse($activeShift, 'Active shift retrieved');
    }

    /**
     * POST /api/conductor/shifts/start
     */
    public function startShift(StartShiftRequest $request): JsonResponse
    {
        $validated = $request->validated();

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
     * POST /api/conductor/remittances
     * This is the ONLY way to end a shift.
     */
    public function remittances(SubmitRemittanceRequest $request): JsonResponse
    {
        $validated = $request->validated();

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
     * POST /api/conductor/location
     * GPS update — triggers VehicleLocationUpdated broadcast.
     */
    public function updateLocation(UpdateLocationRequest $request): JsonResponse
    {
        $validated = $request->validated();

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
     * GET /api/conductor/shift-logs
     */
    public function shiftLogs(Request $request): JsonResponse
    {
        $perPage = $request->integer('per_page', 15);

        $shiftLogs = $this->shiftService->getShiftLogs($request->user(), $perPage);

        return $this->successResponse($shiftLogs, 'Shift history retrieved');
    }

    /**
     * GET /api/conductor/transactions
     * Sprint 4 — keep as stub.
     */
    public function transactions(Request $request): JsonResponse
    {
        return $this->notImplementedResponse();
    }

    /**
     * GET /api/conductor/profile
     */
    public function profile(): JsonResponse
    {
        /** @var \App\Models\User $user */
        $user = Auth::user();

        $profile = $user->conductorProfile;

        return $this->successResponse([
            'id' => $user->id,
            'name' => $profile
                ? trim($profile->first_name . ' ' . $profile->last_name)
                : $user->email,
            'email' => $user->email,
            'role' => $user->role,
        ], 'Conductor profile retrieved');
    }

    /**
     * GET /api/conductor/units
     * Returns available vehicles for shift assignment.
     */
    public function units(): JsonResponse
    {
        $units = Vehicle::where('status', 'ACTIVE')->get();

        return $this->successResponse($units, 'Available vehicles retrieved');
    }

    /**
     * GET /api/conductor/drivers
     * Returns drivers not currently on an active shift.
     */
    public function drivers(): JsonResponse
    {
        $drivers = Driver::whereDoesntHave('activeShift')->get();

        return $this->successResponse($drivers, 'Available drivers retrieved');
    }
}