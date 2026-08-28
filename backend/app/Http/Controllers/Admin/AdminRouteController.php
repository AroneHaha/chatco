<?php

namespace App\Http\Controllers\Admin;

use App\Enums\ActivityLogCategory;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\PublishRouteVersionRequest;
use App\Http\Requests\Admin\SaveRouteDraftRequest;
use App\Http\Requests\Admin\StoreRouteRequest;
use App\Http\Requests\Admin\UpdateRouteRequest;
use App\Models\Route;
use App\Services\ActivityLogService;
use App\Services\RouteGeometryService;
use App\Traits\ApiResponse;
use Carbon\Carbon;
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
        $route->update($request->safe()->only(['name', 'status', 'waypoints']));

        $this->activityLogService->record(
            ActivityLogCategory::ROUTE,
            "Updated route {$route->name}",
            $request->user(),
        );

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

    public function saveDraft(SaveRouteDraftRequest $request, string $id): JsonResponse
    {
        $route = Route::findOrFail($id);
        $validated = $request->validated();
        $draft = $this->routeGeometryService->saveDraft(
            $route,
            $validated['geometry'],
            $validated['waypoints'],
            $validated['notes'] ?? null,
            $request->user()?->id,
        );

        return $this->successResponse(
            $this->routeGeometryService->versionPayload($draft),
            'Route draft saved'
        );
    }

    public function publish(PublishRouteVersionRequest $request, string $id): JsonResponse
    {
        $route = Route::findOrFail($id);
        $validated = $request->validated();
        $effectiveFrom = isset($validated['effective_from'])
            ? Carbon::parse($validated['effective_from'])
            : now();
        $effectiveUntil = isset($validated['effective_until'])
            ? Carbon::parse($validated['effective_until'])
            : null;

        if ($effectiveUntil && $effectiveUntil->lessThanOrEqualTo($effectiveFrom)) {
            return $this->errorResponse('The detour expiration must be after its start time.', 422);
        }

        $version = $this->routeGeometryService->publishDraft(
            $route,
            $effectiveFrom,
            $effectiveUntil,
            $validated['notes'] ?? null,
            $request->user()?->id,
        );

        $this->activityLogService->record(
            ActivityLogCategory::ROUTE,
            ($effectiveUntil ? "Published temporary detour for route {$route->name}" : "Published route {$route->name}"),
            $request->user(),
        );

        return $this->successResponse(
            $this->routeGeometryService->versionPayload($version),
            $effectiveUntil ? 'Temporary route published' : 'Route published'
        );
    }

    public function versions(string $id): JsonResponse
    {
        $route = Route::findOrFail($id);
        $versions = $route->versions()
            ->get()
            ->map(fn ($version) => $this->routeGeometryService->versionPayload($version));

        return $this->successResponse($versions, 'Route versions retrieved');
    }

    private function adminPayload(Route $route): array
    {
        return [
            'id' => $route->id,
            'name' => $route->name,
            'status' => $route->status,
            'vehicles_count' => (int) ($route->vehicles_count ?? $route->vehicles()->count()),
            'fare_points_count' => (int) ($route->fare_points_count ?? $route->farePoints()->count()),
            'active_version' => $this->routeGeometryService->versionPayload(
                $this->routeGeometryService->activeVersion($route)
            ),
            'draft_version' => $this->routeGeometryService->versionPayload(
                $this->routeGeometryService->latestDraft($route)
            ),
        ];
    }
}
