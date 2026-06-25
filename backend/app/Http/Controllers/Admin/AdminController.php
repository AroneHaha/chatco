<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Driver;
use App\Models\Remittance;
use App\Models\Route as RouteModel;
use App\Models\ShiftLog;
use App\Models\Transaction;
use App\Models\Vehicle;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class AdminController extends Controller
{
    use ApiResponse;

    public function dashboard(): JsonResponse
    {
        return $this->notImplementedResponse();
    }

    public function users(): JsonResponse
    {
        return $this->notImplementedResponse();
    }

    public function drivers(): JsonResponse
    {
        $drivers = Driver::with('vehicle')->get();

        return $this->successResponse($drivers, 'Drivers retrieved');
    }

    public function vehicles(): JsonResponse
    {
        $vehicles = Vehicle::with(['route', 'driver', 'conductor'])->get();

        return $this->successResponse($vehicles, 'Vehicles retrieved');
    }

    /**
     * POST /api/v1/admin/vehicles
     * Creates a new vehicle.
     */
    public function storeVehicle(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'unit_number' => 'required|string|max:20|unique:vehicles,unit_number',
            'plate_number' => 'required|string|max:20|unique:vehicles,plate_number',
            'route_id' => 'nullable|uuid|exists:routes,id',
            'driver_id' => 'nullable|uuid|exists:drivers,id',
            'conductor_id' => 'nullable|uuid|exists:conductor_profiles,id',
            'status' => 'nullable|string|in:ACTIVE,MAINTENANCE,INACTIVE',
        ]);

        $vehicle = Vehicle::create([
            'unit_number' => $validated['unit_number'],
            'plate_number' => $validated['plate_number'],
            'route_id' => $validated['route_id'] ?? null,
            'driver_id' => $validated['driver_id'] ?? null,
            'conductor_id' => $validated['conductor_id'] ?? null,
            'status' => $validated['status'] ?? 'ACTIVE',
            'capacity_status' => 'AVAILABLE',
        ]);

        // Load relationships for the response
        $vehicle->load(['route', 'driver', 'conductor']);

        return $this->successResponse($vehicle, 'Vehicle created successfully', 201);
    }

    /**
     * DELETE /api/v1/admin/vehicles/{id}
     * Deletes a vehicle.
     */
    public function destroyVehicle(string $id): JsonResponse
    {
        $vehicle = Vehicle::findOrFail($id);
        $vehicle->delete();

        return $this->successResponse(null, 'Vehicle deleted successfully');
    }

    public function routes(): JsonResponse
    {
        $routes = RouteModel::orderBy('name', 'asc')->get();

        return $this->successResponse($routes, 'Routes retrieved');
    }

    public function transactions(Request $request): JsonResponse
    {
        $query = Transaction::with(['shiftLog', 'passenger'])
            ->orderBy('created_at', 'desc');

        if ($request->has('shift_id')) {
            $query->where('shift_id', $request->input('shift_id'));
        }

        $transactions = $query->get();

        return $this->successResponse($transactions, 'Transactions retrieved');
    }

    /**
     * GET /api/v1/admin/remittances
     *
     * Returns a unified list of remittances:
     * 1. Active shifts WITH transactions -> mapped as "Pending"
     * 2. Completed remittances -> mapped as "Remitted"
     *
     * This allows admin to see a shift appear as "Pending" the moment
     * the conductor records their first cash fare, before they click
     * "Remit to Admin".
     */
    public function remittances(): JsonResponse
    {
        // 1. Completed remittances
        $completedRemittances = Remittance::query()
            ->orderBy('date', 'desc')
            ->orderBy('time_in', 'desc')
            ->get()
            ->map(function ($r) {
                return [
                    'shift_id' => $r->shift_id,
                    'conductor_name' => $r->conductor_name,
                    'driver_name' => $r->driver_name,
                    'unit_number' => $r->unit_number,
                    'date' => $r->date,
                    'time_in' => $r->time_in,
                    'time_out' => $r->time_out,
                    'cash_total' => (float) $r->cash_total,
                    'gcash_total' => (float) $r->gcash_total,
                    'total_passengers' => $r->total_passengers,
                    'remittance_status' => 'Remitted',
                ];
            });

        // 2. Active shifts with transactions (Pending)
        $pendingShifts = ShiftLog::where('status', 'ACTIVE')
            ->whereHas('transactions')
            ->with(['vehicle', 'driver'])
            ->get()
            ->map(function ($s) {
                $cashTotal = (float) DB::table('transactions')
                    ->where('shift_id', $s->shift_id)
                    ->where('payment_method', 'CASH')
                    ->where('status', 'PAID')
                    ->sum('final_amount');

                $gcashTotal = (float) DB::table('transactions')
                    ->where('shift_id', $s->shift_id)
                    ->where('payment_method', 'GCASH')
                    ->where('status', 'PAID')
                    ->sum('final_amount');

                $totalPassengers = (int) DB::table('transactions')
                    ->where('shift_id', $s->shift_id)
                    ->where('status', 'PAID')
                    ->count();

                return [
                    'shift_id' => $s->shift_id,
                    'conductor_name' => $s->conductor_name,
                    'driver_name' => $s->driver_name,
                    'unit_number' => $s->unit_number,
                    'date' => $s->time_in ? $s->time_in->toDateString() : null,
                    'time_in' => $s->time_in,
                    'time_out' => null, // Still active
                    'cash_total' => $cashTotal,
                    'gcash_total' => $gcashTotal,
                    'total_passengers' => $totalPassengers,
                    'remittance_status' => 'Pending',
                ];
            });

        // Merge: Pending first, then Remitted
        $unified = $pendingShifts->concat($completedRemittances);

        return $this->successResponse($unified, 'Remittances retrieved');
    }

    public function announcements(): JsonResponse
    {
        return $this->notImplementedResponse();
    }

    public function lostItems(): JsonResponse
    {
        return $this->notImplementedResponse();
    }

    public function shiftLogs(): JsonResponse
    {
        $shiftLogs = ShiftLog::with(['vehicle', 'driver', 'route'])
            ->orderBy('time_in', 'desc')
            ->get();

        return $this->successResponse($shiftLogs, 'Shift logs retrieved');
    }
}