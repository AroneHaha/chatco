<?php

namespace App\Http\Controllers;

use App\Models\Route;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * GET /api/v1/routes/active(?route_id=) — polyline geometry for the live map.
 *
 * The conductor mobile app draws the active route under the vehicle marker.
 * The authoritative geometry is seeded verbatim from the web app's
 * frontend/config/route-coords.ts (W5 CTC line, 77 points) into the
 * routes.waypoints column, so both clients render the same line.
 *
 * Response shape expected by chatco-mobile::api.routeGeometry():
 *   { id, name, coordinates: [[lat, lng], ...], version: { number, published_at } }
 */
class RouteGeometryController extends Controller
{
    use ApiResponse;

    public function active(Request $request): JsonResponse
    {
        $route = null;

        if ($request->filled('route_id')) {
            $route = Route::find($request->query('route_id'));
        }

        if (! $route) {
            $route = Route::where('status', 'ACTIVE')->orderBy('created_at')->first()
                ?? Route::orderBy('created_at')->first();
        }

        if (! $route) {
            return $this->errorResponse('No routes configured', 404);
        }

        return $this->successResponse([
            'id'          => $route->id,
            'name'        => $route->name,
            'coordinates' => $this->normalizeCoordinates($route->waypoints),
            'version'     => [
                'number'       => 1,
                'published_at' => $route->updated_at?->toIso8601String(),
            ],
        ], 'Active route retrieved');
    }

    /**
     * Normalize the stored waypoints JSON into [[lat, lng], ...] pairs.
     *
     * Supports the two shapes found in the wild:
     *   - [{lat, lng, name?}, ...]  (DatabaseSeeder / admin route editor)
     *   - [[lat, lng], ...]         (compact pair list)
     */
    private function normalizeCoordinates(mixed $waypoints): array
    {
        if (! is_array($waypoints)) {
            return [];
        }

        $coordinates = [];

        foreach ($waypoints as $point) {
            if (is_array($point) && array_is_list($point) && count($point) >= 2
                && is_numeric($point[0]) && is_numeric($point[1])) {
                $coordinates[] = [(float) $point[0], (float) $point[1]];
                continue;
            }

            if (is_array($point)) {
                $lat = $point['lat'] ?? $point['latitude'] ?? null;
                $lng = $point['lng'] ?? $point['longitude'] ?? null;

                if (is_numeric($lat) && is_numeric($lng)) {
                    $coordinates[] = [(float) $lat, (float) $lng];
                }
            }
        }

        return $coordinates;
    }
}
