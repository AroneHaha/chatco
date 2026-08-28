<?php

namespace App\Http\Controllers\Admin;

use App\Enums\ActivityLogCategory;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreVehicleRequest;
use App\Http\Requests\Admin\UpdateVehicleRequest;
use App\Services\ActivityLogService;
use App\Services\AdminService;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

/**
 * AdminVehicleController — thin controller for vehicle CRUD.
 *
 * All query logic lives in AdminService; this controller just wires
 * HTTP requests to the service and returns the project's standard
 * ApiResponse JSON envelope.
 *
 * Routes (all behind role:ADMIN):
 *   GET    /api/v1/admin/vehicles           index
 *   POST   /api/v1/admin/vehicles           store
 *   PUT    /api/v1/admin/vehicles/{id}      update
 *   PATCH  /api/v1/admin/vehicles/{id}      update
 *   DELETE /api/v1/admin/vehicles/{id}      destroy
 */
class AdminVehicleController extends Controller
{
    use ApiResponse;

    public function __construct(
        private AdminService $adminService,
        private ActivityLogService $activityLogService,
    ) {}

    /**
     * GET /api/v1/admin/vehicles?status=&route_id=&search=&per_page=
     * Paginated list with optional filters + eager-loaded driver/route/conductor.
     */
    public function index(Request $request): JsonResponse
    {
        $filters = [
            'status'   => $request->string('status')->toString() ?: null,
            'route_id' => $request->string('route_id')->toString() ?: null,
            'search'   => $request->string('search')->toString() ?: null,
        ];

        if ($request->boolean('count_only')) {
            return $this->successResponse([
                'total' => $this->adminService->countVehicles($filters),
            ], 'Vehicle count retrieved');
        }

        $perPage = max(1, min((int) $request->integer('per_page', 15), 100));

        $vehicles = $this->adminService->listVehicles($filters, $perPage);

        return $this->successResponse($vehicles, 'Vehicles retrieved');
    }

    /**
     * GET /api/v1/admin/vehicles/{id}
     * Single vehicle details with the same route/driver/conductor relations
     * returned by the paginated list.
     */
    public function show(string $id): JsonResponse
    {
        $vehicle = $this->adminService->getVehicle($id);

        return $this->successResponse($vehicle, 'Vehicle retrieved');
    }

    /**
     * POST /api/v1/admin/vehicles
     * Create a new vehicle. plate_number + unit_number uniqueness enforced
     * by StoreVehicleRequest validation (422 on dup).
     */
    public function store(StoreVehicleRequest $request): JsonResponse
    {
        $vehicle = $this->adminService->createVehicle($request->validated());

        $this->activityLogService->record(
            ActivityLogCategory::VEHICLE,
            "Added vehicle {$vehicle->plate_number}",
            $request->user(),
        );

        return $this->successResponse($vehicle, 'Vehicle created successfully', 201);
    }

    /**
     * PUT/PATCH /api/v1/admin/vehicles/{id}
     * Update mutable fields. Partial updates supported (only sent fields change).
     */
    public function update(UpdateVehicleRequest $request, string $id): JsonResponse
    {
        $vehicle = $this->adminService->updateVehicle($id, $request->validated());

        $this->activityLogService->record(
            ActivityLogCategory::VEHICLE,
            "Updated vehicle {$vehicle->plate_number}",
            $request->user(),
        );

        return $this->successResponse($vehicle, 'Vehicle updated successfully');
    }

    /**
     * DELETE /api/v1/admin/vehicles/{id}
     * Blocks (409) if the vehicle has an active_shift_id — never orphan
     * a conductor's active shift. Otherwise soft-deletes the vehicle.
     */
    public function destroy(Request $request, string $id): JsonResponse
    {
        // Captured before delete() so the log description can still name it.
        $plateNumber = $this->adminService->getVehicle($id)->plate_number ?? $id;

        try {
            $this->adminService->deleteVehicle($id);
        } catch (ValidationException $e) {
            // 409 Conflict — vehicle is on an active shift, cannot delete.
            return response()->json([
                'success' => false,
                'data'    => null,
                'message' => 'Conflict',
                'errors'  => $e->errors(),
                'meta'    => null,
            ], 409);
        }

        $this->activityLogService->record(
            ActivityLogCategory::VEHICLE,
            "Deleted vehicle {$plateNumber}",
            $request->user(),
        );

        return $this->successResponse(null, 'Vehicle deleted successfully');
    }
}
