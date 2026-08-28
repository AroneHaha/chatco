<?php

namespace App\Http\Controllers\Admin;

use App\Enums\ActivityLogCategory;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreFarePointRequest;
use App\Http\Requests\Admin\UpdateFarePointRequest;
use App\Models\FarePoint;
use App\Models\Route;
use App\Services\ActivityLogService;
use App\Services\RouteGeometryService;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Admin Fare Point CRUD (S6 Settings Batch 1).
 *
 * Thin controller — all logic is inline (simple Eloquent operations).
 * Routes (all behind auth:sanctum + role:ADMIN):
 *   GET    /api/v1/admin/fare-points           index
 *   POST   /api/v1/admin/fare-points           store
 *   PUT    /api/v1/admin/fare-points/{id}      update
 *   DELETE /api/v1/admin/fare-points/{id}      destroy
 */
class AdminFarePointController extends Controller
{
    use ApiResponse;

    public function __construct(
        private RouteGeometryService $routeGeometryService,
        private ActivityLogService $activityLogService,
    ) {}

    /**
     * GET /api/v1/admin/fare-points?route_id={uuid}
     * List fare points, optionally filtered by route. Ordered by point_number.
     */
    public function index(Request $request): JsonResponse
    {
        $query = FarePoint::with('route:id,name')
            ->orderBy('point_number', 'asc');

        if ($request->has('route_id')) {
            $query->where('route_id', $request->input('route_id'));
        }

        $farePoints = $query->get();

        return $this->successResponse($farePoints, 'Fare points retrieved');
    }

    /**
     * POST /api/v1/admin/fare-points
     * Create a new fare point.
     */
    public function store(StoreFarePointRequest $request): JsonResponse
    {
        $validated = $request->validated();

        // Convert sub_stops string to the DB format (it's stored as a string).
        $farePoint = FarePoint::create([
            'route_id' => $validated['route_id'],
            'point_number' => $validated['point_number'],
            'code' => $validated['code'],
            'name' => $validated['name'],
            'landmarks' => $validated['landmarks'] ?? null,
            'sub_stops' => $validated['sub_stops'] ?? null,
            'regular_fare' => $validated['regular_fare'],
            'discounted_fare' => $validated['discounted_fare'],
            'latitude' => $validated['latitude'] ?? null,
            'longitude' => $validated['longitude'] ?? null,
        ]);

        $farePoint->load('route:id,name');
        $this->routeGeometryService->syncDraftWaypointsFromFarePoints(
            $farePoint->route,
            $request->user()?->id,
        );

        $this->activityLogService->record(
            ActivityLogCategory::FARE_POINT,
            "Added fare point {$farePoint->name}",
            $request->user(),
        );

        return $this->successResponse(
            $farePoint,
            'Fare point created. Review and publish the updated route draft.',
            201
        );
    }

    /**
     * PUT/PATCH /api/v1/admin/fare-points/{id}
     * Update a fare point. Partial updates supported.
     */
    public function update(UpdateFarePointRequest $request, string $id): JsonResponse
    {
        $farePoint = FarePoint::findOrFail($id);
        $originalRouteId = $farePoint->route_id;

        $validated = $request->validated();
        $routeFieldsChanged = collect(['route_id', 'point_number', 'latitude', 'longitude'])
            ->contains(fn ($field) => array_key_exists($field, $validated)
                && (string) $farePoint->{$field} !== (string) $validated[$field]);

        // Only update fields that were sent.
        $updateData = array_filter($validated, function ($value, $key) {
            // Allow null values for nullable fields (landmarks, sub_stops, etc.)
            return $value !== null || in_array($key, ['landmarks', 'sub_stops', 'latitude', 'longitude']);
        }, ARRAY_FILTER_USE_BOTH);

        $farePoint->update($updateData);
        $farePoint->load('route:id,name');

        if ($routeFieldsChanged) {
            if ($originalRouteId !== $farePoint->route_id) {
                $originalRoute = Route::find($originalRouteId);
                if ($originalRoute) {
                    $this->routeGeometryService->syncDraftWaypointsFromFarePoints(
                        $originalRoute,
                        $request->user()?->id,
                    );
                }
            }

            $this->routeGeometryService->syncDraftWaypointsFromFarePoints(
                $farePoint->route,
                $request->user()?->id,
            );
        }

        $this->activityLogService->record(
            ActivityLogCategory::FARE_POINT,
            "Updated fare point {$farePoint->name}",
            $request->user(),
        );

        return $this->successResponse(
            $farePoint,
            $routeFieldsChanged
                ? 'Fare point updated. Review and publish the updated route draft.'
                : 'Fare point updated successfully'
        );
    }

    /**
     * DELETE /api/v1/admin/fare-points/{id}
     * Delete a fare point.
     */
    public function destroy(Request $request, string $id): JsonResponse
    {
        $farePoint = FarePoint::findOrFail($id);
        $farePointName = $farePoint->name;
        $route = $farePoint->route;
        $farePoint->delete();
        $this->routeGeometryService->syncDraftWaypointsFromFarePoints(
            $route,
            $request->user()?->id,
        );

        $this->activityLogService->record(
            ActivityLogCategory::FARE_POINT,
            "Deleted fare point {$farePointName}",
            $request->user(),
        );

        return $this->successResponse(null, 'Fare point deleted. Review and publish the updated route draft.');
    }

    public function reorder(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'route_id' => ['required', 'uuid', 'exists:routes,id'],
            'ordered_ids' => ['required', 'array', 'min:1'],
            'ordered_ids.*' => ['required', 'uuid', 'distinct', 'exists:fare_points,id'],
        ]);

        $route = Route::findOrFail($validated['route_id']);
        $existingIds = $route->farePoints()->orderBy('point_number')->pluck('id')->all();
        $orderedIds = array_values($validated['ordered_ids']);

        if (count($existingIds) !== count($orderedIds)
            || array_diff($existingIds, $orderedIds)
            || array_diff($orderedIds, $existingIds)) {
            return $this->errorResponse('The ordered list must contain every Fare Point for this route exactly once.', 422);
        }

        DB::transaction(function () use ($orderedIds) {
            foreach ($orderedIds as $index => $id) {
                FarePoint::whereKey($id)->update(['point_number' => $index + 1]);
            }
        });

        $this->routeGeometryService->syncDraftWaypointsFromFarePoints(
            $route,
            $request->user()?->id,
        );

        $this->activityLogService->record(
            ActivityLogCategory::FARE_POINT,
            'Reordered ' . count($orderedIds) . " fare point(s) on route {$route->name}",
            $request->user(),
        );

        return $this->successResponse(
            $route->farePoints()->orderBy('point_number')->get(),
            'Fare Points reordered. Review and publish the updated route draft.'
        );
    }
}
