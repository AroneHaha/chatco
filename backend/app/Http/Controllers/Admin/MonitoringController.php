<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Traits\ApiResponse;
use App\Models\Vehicle;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MonitoringController extends Controller
{
    use ApiResponse;

    /**
     * GET /api/admin/monitoring
     */
    public function index(Request $request): JsonResponse
    {
        $liveVehicles = Vehicle::with(['driver', 'route'])
            ->where('status', 'Operating')
            ->get()
            ->map(fn ($v) => [
                'unit'   => $v->plate_number,
                'driver' => $v->driver ? "{$v->driver->first_name} {$v->driver->surname}" : 'Unassigned',
                'speed'  => $v->speed ?? 0,
                'status' => ($v->speed > 60) ? 'overspeeding' : (($v->speed === 0) ? 'idle' : 'normal'),
                'zone'   => $v->route?->name ?? 'Unknown',
            ]);

        return $this->successResponse([
            'liveVehicles'     => $liveVehicles,
            'sosAlerts'        => [],
            'sosHistory'       => [],
            'overspeedHistory' => [],
            'demandZones'      => [],
        ], 'Monitoring data');
    }
}