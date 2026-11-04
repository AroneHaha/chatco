<?php

namespace App\Http\Controllers\Admin;

use App\Enums\ActivityLogCategory;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\SaveRouteGeometryRequest;
use App\Http\Requests\Admin\StoreRouteRequest;
use App\Http\Requests\Admin\UpdateRouteRequest;
use App\Models\Route;
use App\Services\ActivityLogService;
use App\Services\RouteGeometryService;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminRouteController extends Controller
{
    use ApiResponse;

    public function __construct(
        private RouteGeometryService $routeGeometryService,
        private ActivityLogService $activityLogService,
    ) {}

    public function index(): JsonResponse
    {
        $routes = Route::query()
            ->withCount(['vehicles', 'farePoints'])
            ->orderBy('name')
            ->get()
            ->map(fn (Route $route) => $this->adminPayload($route));

        return $this->successResponse($routes, 'Routes retrieved');
    }

    public function show(string $id): JsonResponse
    {
        $route = Route::withCount(['vehicles', 'farePoints'])->findOrFail($id);

        return $this->successResponse($this->adminPayload($route), 'Route retrieved');
    }

    public function store(StoreRouteRequest $request): JsonResponse
    {
        $validated = $request->validated();
        $route = Route::create([
            'name' => $validated['name'],
            'status' => $validated['status'] ?? 'INACTIVE',
            'waypoints' => $validated['waypoints'] ?? [],
        ]);

        $this->activityLogService->record(
            ActivityLogCategory::ROUTE,
            "Created route {$route->name}",
            $request->user(),
        );

        return $this->successResponse($this->adminPayload($route), 'Route created successfully', 201);
    }

    public function update(UpdateRouteRequest $request, string $id): JsonResponse
    {
        $route = Route::findOrFail($id);
        // Waypoints are logged as a count, not as coordinates.
        $snapshot = fn (Route $route) => [
            'name' => $route->name,
            'status' => $route->status,
            'waypoints' => is_array($route->waypoints) ? count($route->waypoints).' points' : null,
        ];
        $before = $snapshot($route);
        $route->update($request->safe()->only(['name', 'status', 'waypoints']));

        $changes = ActivityLogService::diff($before, $snapshot($route), [
            'name' => 'Name',
            'status' => 'Status',
            'waypoints' => 'Waypoints',
        ]);
        if ($changes !== []) {
            $this->activityLogService->record(
                ActivityLogCategory::ROUTE,
                "Updated route {$route->name}: ".ActivityLogService::changedFields($changes),
                $request->user(),
                $changes,
            );
        }

        return $this->successResponse($this->adminPayload($route->fresh()), 'Route updated successfully');
    }

    public function destroy(Request $request, string $id): JsonResponse
    {
        $route = Route::withCount(['vehicles', 'farePoints'])->findOrFail($id);
        if ($route->vehicles_count > 0 || $route->fare_points_count > 0) {
            return $this->errorResponse('Move assigned vehicles and Fare Points before deleting this route.', 409);
        }

        $route->delete();

        $this->activityLogService->record(
            ActivityLogCategory::ROUTE,
            "Deleted route {$route->name}",
            $request->user(),
        );

        return $this->successResponse(null, 'Route deleted successfully');
    }

    /**
     * PUT /admin/routes/{id}/geometry. Replaces the route's road line in place
     * and makes the route active: it is live on every map on the next fetch.
     * Nothing about the previous line is kept.
     */
    public function saveGeometry(SaveRouteGeometryRequest $request, string $id): JsonResponse
    {
        $route = Route::findOrFail($id);
        $validated = $request->validated();
        $route->update([
            'geometry' => array_values($validated['geometry']),
            'waypoints' => array_values($validated['waypoints']),
            'status' => 'ACTIVE',
        ]);

        $this->activityLogService->record(
            ActivityLogCategory::ROUTE,
            "Updated the route line of {$route->name}",
            $request->user(),
        );

        return $this->successResponse($this->adminPayload($route->fresh()), 'Route saved');
    }

    private function adminPayload(Route $route): array
    {
        return [
            'id' => $route->id,
            'name' => $route->name,
            'status' => $route->status,
            'vehicles_count' => (int) ($route->vehicles_count ?? $route->vehicles()->count()),
            'fare_points_count' => (int) ($route->fare_points_count ?? $route->farePoints()->count()),
            'geometry' => array_values($route->geometry ?? []),
            'waypoints' => $this->routeGeometryService->controlPoints($route),
            'updated_at' => $route->updated_at?->toIso8601String(),
        ];
    }
}
