<?php

namespace App\Http\Controllers\Commuter;

use App\Http\Controllers\Controller;
use App\Http\ApiResponse;
use App\Services\LocationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class VehicleLocationController extends Controller
{
    use ApiResponse;

    protected LocationService $locationService;

    public function __construct(LocationService $locationService)
    {
        $this->locationService = $locationService;
    }

    /**
     * GET /api/vehicles/locations
     * Fallback/initial load for commuter map.
     * Real-time updates come via Pusher broadcast.
     */
    public function index(Request $request): JsonResponse
    {
        $locations = $this->locationService->getAllActiveLocations();

        return $this->successResponse($locations, 'Vehicle locations retrieved');
    }
}