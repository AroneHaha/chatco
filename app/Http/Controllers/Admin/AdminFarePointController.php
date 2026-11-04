<?php

namespace App\Http\Controllers\Admin;

use App\Enums\ActivityLogCategory;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreFarePointRequest;
use App\Http\Requests\Admin\UpdateFarePointRequest;
use App\Models\FarePoint;
use App\Models\Route;
use App\Services\ActivityLogService;
use App\Support\FareRules;
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

    /**
     * Fare Point moves never touch the live road line (routes.geometry); the
     * line stays as it is (it is only written by PUT /admin/routes/{id}/geometry),
     * so maps never lose their route.
     */
    private const LINE_UNCHANGED = 'The route line on the maps is unchanged.';

    public function __construct(
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
        // Stored fares are the stop's fare from stop 1 under the Financial Rules.
        $rules = FareRules::current();
        $regularFare = $rules->fare((int) $validated['point_number']);

        // Convert sub_stops string to the DB format (it's stored as a string).
        $farePoint = FarePoint::create([
            'route_id' => $validated['route_id'],
            'point_number' => $validated['point_number'],
            'code' => $validated['code'],
            'name' => $validated['name'],
            'landmarks' => $validated['landmarks'] ?? null,
            'sub_stops' => $validated['sub_stops'] ?? null,
            'regular_fare' => $regularFare,
            'discounted_fare' => $rules->discounted($regularFare),
            'latitude' => $validated['latitude'] ?? null,
            'longitude' => $validated['longitude'] ?? null,
        ]);

        $farePoint->load('route:id,name');

        $this->activityLogService->record(
            ActivityLogCategory::FARE_POINT,
            "Added fare point {$farePoint->name}",
            $request->user(),
        );

        return $this->successResponse(
            $farePoint,
            'Fare point created. '.self::LINE_UNCHANGED,
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
        $before = $this->farePointSnapshot($farePoint);
        $originalRouteId = $farePoint->route_id;

        $validated = $request->validated();
        $changed = fn (string $field) => array_key_exists($field, $validated)
            && (string) $farePoint->{$field} !== (string) $validated[$field];
        $routeFieldsChanged = collect(['route_id', 'point_number', 'latitude', 'longitude'])->contains($changed);
        $positionChanged = $changed('route_id') || $changed('point_number');

        // Only update fields that were sent.
        $updateData = array_filter($validated, function ($value, $key) {
            // Allow null values for nullable fields (landmarks, sub_stops, etc.)
            return $value !== null || in_array($key, ['landmarks', 'sub_stops', 'latitude', 'longitude']);
        }, ARRAY_FILTER_USE_BOTH);

        DB::transaction(function () use ($farePoint, $updateData, $positionChanged, $originalRouteId) {
            $farePoint->update($updateData);
            // A stop's fares follow its position, so re-derive them when it moves.
            if ($positionChanged) {
                $rules = FareRules::current();
                $rules->syncStopFares($farePoint->route_id);
                if ($originalRouteId !== $farePoint->route_id) {
                    $rules->syncStopFares($originalRouteId);
                }
            }
        });
        $farePoint->refresh()->load('route:id,name');

        $changes = ActivityLogService::diff($before, $this->farePointSnapshot($farePoint), [
            'route' => 'Route',
            'point_number' => 'Point number',
            'code' => 'Code',
            'name' => 'Name',
            'sub_stops' => 'Sub pickup / drop-off points',
            'landmarks' => 'Landmarks',
            'regular_fare' => 'Regular fare',
            'discounted_fare' => 'Discounted fare',
            'location' => 'Location',
        ]);
        if ($changes !== []) {
            $this->activityLogService->record(
                ActivityLogCategory::FARE_POINT,
                "Updated fare point {$farePoint->name}: ".ActivityLogService::changedFields($changes),
                $request->user(),
                $changes,
            );
        }

        return $this->successResponse(
            $farePoint,
            $routeFieldsChanged
                ? 'Fare point updated. '.self::LINE_UNCHANGED
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
        // Close the gap so later stops move up one: fares are priced by the
        // number of stops between pickup and drop-off, and a removed stop
        // must not still count as a barangay traveled.
        DB::transaction(function () use ($farePoint) {
            $routeId = $farePoint->route_id;
            $farePoint->delete();
            FarePoint::where('route_id', $routeId)
                ->where('point_number', '>', $farePoint->point_number)
                ->decrement('point_number');
            FareRules::current()->syncStopFares($routeId);
        });

        $this->activityLogService->record(
            ActivityLogCategory::FARE_POINT,
            "Deleted fare point {$farePointName}",
            $request->user(),
        );

        return $this->successResponse(null, 'Fare point deleted. '.self::LINE_UNCHANGED);
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

        DB::transaction(function () use ($orderedIds, $route) {
            foreach ($orderedIds as $index => $id) {
                FarePoint::whereKey($id)->update(['point_number' => $index + 1]);
            }
            FareRules::current()->syncStopFares($route->id);
        });

        $this->activityLogService->record(
            ActivityLogCategory::FARE_POINT,
            'Reordered ' . count($orderedIds) . " fare point(s) on route {$route->name}",
            $request->user(),
        );

        return $this->successResponse(
            $route->farePoints()->orderBy('point_number')->get(),
            'Fare Points reordered. '.self::LINE_UNCHANGED
        );
    }

    /** The fare point as admins read it: route by name, one location value. */
    private function farePointSnapshot(FarePoint $farePoint): array
    {
        $farePoint->loadMissing('route:id,name');

        return [
            'route' => $farePoint->route?->name,
            'point_number' => $farePoint->point_number,
            'code' => $farePoint->code,
            'name' => $farePoint->name,
            'sub_stops' => $farePoint->sub_stops,
            'landmarks' => $farePoint->landmarks,
            'regular_fare' => $farePoint->regular_fare,
            'discounted_fare' => $farePoint->discounted_fare,
            'location' => $farePoint->latitude !== null && $farePoint->longitude !== null
                ? number_format((float) $farePoint->latitude, 6).', '.number_format((float) $farePoint->longitude, 6)
                : null,
        ];
    }
}
