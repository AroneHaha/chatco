<?php

namespace App\Http\Controllers;

use App\Models\Route;
use App\Services\RouteGeometryService;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class RouteGeometryController extends Controller
{
    use ApiResponse;

    public function __construct(private RouteGeometryService $routeGeometryService) {}

    /**
     * Public single source of truth for tracking maps and route coverage.
     * An optional route_id selects a vehicle-specific route; otherwise the
     * first active route with a saved road line is used.
     */
    public function active(Request $request): JsonResponse
    {
        $query = Route::query()->where('status', 'ACTIVE')->orderBy('created_at');

        if ($request->filled('route_id')) {
            $query->whereKey($request->string('route_id')->toString());
        }

        $route = $query->get()->first(fn (Route $route) => $route->hasGeometry());
        if ($route) {
            return $this->successResponse(
                $this->routeGeometryService->routePayload($route),
                'Active route geometry retrieved'
            );
        }

        return $this->errorResponse('No route line has been saved for an active route.', 404);
    }
}
