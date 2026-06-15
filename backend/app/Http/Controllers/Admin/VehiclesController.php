<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Traits\ApiResponse;
use App\Models\Vehicle;
use App\Models\Driver;
use App\Models\ConductorProfile;
use App\Models\ShiftLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class VehiclesController extends Controller
{
    use ApiResponse;

    /**
     * GET /api/admin/vehicles
     */
    public function index(Request $request): JsonResponse
    {
        $vehicles = Vehicle::with(['driver', 'conductor', 'route'])
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(fn ($v) => [
                'id'          => $v->id,
                'plateNumber' => $v->plate_number,
                'route'       => $v->route?->name,
                'driver'      => $v->driver ? "{$v->driver->first_name} {$v->driver->surname}" : null,
                'conductor'   => $v->conductor ? "{$v->conductor->first_name} {$v->conductor->surname}" : null,
                'status'      => $v->status,
                'speed'       => $v->speed,
            ]);

        $personnel = Driver::orderBy('created_at', 'desc')
            ->get()
            ->map(fn ($d) => [
                'id'         => $d->id,
                'name'       => trim("{$d->first_name} {$d->middle_name} {$d->surname}"),
                'role'       => 'Driver',
                'contact'    => $d->contact_number,
                'profilePic' => "https://ui-avatars.com/api/?name=" . urlencode($d->first_name . '+' . $d->surname),
            ])
            ->concat(
                ConductorProfile::orderBy('created_at', 'desc')
                    ->get()
                    ->map(fn ($c) => [
                        'id'         => $c->id,
                        'name'       => trim("{$c->first_name} {$c->middle_name} {$c->surname}"),
                        'role'       => 'Conductor',
                        'contact'    => $c->contact_number,
                        'profilePic' => "https://ui-avatars.com/api/?name=" . urlencode($c->first_name . '+' . $c->surname),
                    ])
            );

        $terminatedPersonnel = [];

        $shiftHistoryLog = ShiftLog::with(['conductor', 'vehicle'])
            ->orderBy('shift_start', 'desc')
            ->limit(20)
            ->get()
            ->map(fn ($s) => [
                'id'            => $s->id,
                'personnelName' => $s->conductor ? "{$s->conductor->first_name} {$s->conductor->surname}" : 'N/A',
                'role'          => 'Conductor',
                'vehicle'       => $s->vehicle?->plate_number ?? 'N/A',
                'shiftDate'     => $s->shift_start?->format('Y-m-d'),
                'details'       => "Shift from {$s->shift_start?->format('h:i A')} to {$s->shift_end?->format('h:i A')}.",
            ]);

        return $this->successResponse([
            'vehicles'            => $vehicles,
            'personnel'           => $personnel,
            'terminatedPersonnel' => $terminatedPersonnel,
            'shiftHistoryLog'     => $shiftHistoryLog,
        ], 'Vehicles data');
    }

    /**
     * GET /api/admin/drivers/{id}
     */
    public function showDriver(string $id): JsonResponse
    {
        $driver = Driver::with('vehicle.route')->findOrFail($id);

        return $this->successResponse([
            'profile' => [
                'id'              => $driver->id,
                'name'            => trim("{$driver->first_name} {$driver->middle_name} {$driver->surname}"),
                'role'            => 'Driver',
                'contact'         => $driver->contact_number,
                'hireDate'        => $driver->hire_date?->format('Y-m-d'),
                'licenseNumber'   => $driver->license_number,
                'licenseExpiry'   => $driver->license_expiry?->format('Y-m-d'),
                'assignedVehicle' => $driver->vehicle?->plate_number,
                'assignedRoute'   => $driver->vehicle?->route?->name,
                'totalTrips'      => 0,
            ],
        ], 'Driver profile');
    }

    /**
     * GET /api/admin/drivers/{id}/ratings
     */
    public function driverRatings(string $id): JsonResponse
    {
        return $this->successResponse([
            'ratings' => [],
        ], 'Driver ratings');
    }
}