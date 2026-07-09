<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreFarePointRequest;
use App\Http\Requests\Admin\UpdateFarePointRequest;
use App\Models\FarePoint;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

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
            'route_id'        => $validated['route_id'],
            'point_number'    => $validated['point_number'],
            'code'            => $validated['code'],
            'name'            => $validated['name'],
            'landmarks'       => $validated['landmarks'] ?? null,
            'sub_stops'       => $validated['sub_stops'] ?? null,
            'regular_fare'    => $validated['regular_fare'],
            'discounted_fare' => $validated['discounted_fare'],
            'latitude'        => $validated['latitude'] ?? null,
            'longitude'       => $validated['longitude'] ?? null,
        ]);

        $farePoint->load('route:id,name');

        return $this->successResponse($farePoint, 'Fare point created successfully', 201);
    }

    /**
     * PUT/PATCH /api/v1/admin/fare-points/{id}
     * Update a fare point. Partial updates supported.
     */
    public function update(UpdateFarePointRequest $request, string $id): JsonResponse
    {
        $farePoint = FarePoint::findOrFail($id);

        $validated = $request->validated();

        // Only update fields that were sent.
        $updateData = array_filter($validated, function ($value, $key) {
            // Allow null values for nullable fields (landmarks, sub_stops, etc.)
            return $value !== null || in_array($key, ['landmarks', 'sub_stops', 'latitude', 'longitude']);
        }, ARRAY_FILTER_USE_BOTH);

        $farePoint->update($updateData);
        $farePoint->load('route:id,name');

        return $this->successResponse($farePoint, 'Fare point updated successfully');
    }

    /**
     * DELETE /api/v1/admin/fare-points/{id}
     * Delete a fare point.
     */
    public function destroy(string $id): JsonResponse
    {
        $farePoint = FarePoint::findOrFail($id);
        $farePoint->delete();

        return $this->successResponse(null, 'Fare point deleted successfully');
    }
}
