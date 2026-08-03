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
     * first active route with a currently effective published version is used.
     */
    public function active(Request $request): JsonResponse
    {
        $query = Route::query()->where('status', 'ACTIVE')->orderBy('created_at');

        if ($request->filled('route_id')) {
            $query->whereKey($request->string('route_id')->toString());
        }

        foreach ($query->get() as $route) {
            $version = $this->routeGeometryService->activeVersion($route);
            if ($version) {
                return $this->successResponse(
                    $this->routeGeometryService->routePayload($route, $version),
                    'Active route geometry retrieved'
                );
            }
        }

        return $this->errorResponse('No published route geometry is currently active.', 404);
    }
}
