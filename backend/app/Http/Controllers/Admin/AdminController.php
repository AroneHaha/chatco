<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Enums\UserRole;
use App\Models\ConductorProfile;
use App\Models\Driver;
use App\Models\Remittance;
use App\Models\Route as RouteModel;
use App\Models\ShiftLog;
use App\Models\Transaction;
use App\Models\User;
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

    /**
     * POST /api/v1/admin/drivers
     * Creates a new driver.
     *
     * Required fields: first_name, last_name, birthday, contact, license_number.
     * Optional: middle_name, profile_picture_url.
     * hire_date defaults to today (admin can edit later if backdating).
     */
    public function storeDriver(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'first_name' => 'required|string|max:100',
            'middle_name' => 'nullable|string|max:100',
            'last_name' => 'required|string|max:100',
            'birthday' => 'required|date|before:today',
            'contact' => 'required|string|max:20',
            'license_number' => 'required|string|max:50|unique:drivers,license_number',
            'profile_picture_url' => 'nullable|string|max:500',
        ]);

        $driver = Driver::create([
            'first_name' => $validated['first_name'],
            'middle_name' => $validated['middle_name'] ?? null,
            'last_name' => $validated['last_name'],
            'birthday' => $validated['birthday'],
            'contact' => $validated['contact'],
            'license_number' => $validated['license_number'],
            'hire_date' => now()->toDateString(),
            'profile_picture_url' => $validated['profile_picture_url'] ?? null,
            'status' => 'ACTIVE',
        ]);

        $driver->load(['vehicle']);

        return $this->successResponse($driver, 'Driver created successfully', 201);
    }

    /**
     * PUT/PATCH /api/v1/admin/drivers/{id}
     * Updates an existing driver.
     *
     * Required fields: first_name, last_name, birthday, contact, license_number.
     * Optional: middle_name, profile_picture_url.
     */
    public function updateDriver(Request $request, string $id): JsonResponse
    {
        $driver = Driver::findOrFail($id);

        $validated = $request->validate([
            'first_name' => 'required|string|max:100',
            'middle_name' => 'nullable|string|max:100',
            'last_name' => 'required|string|max:100',
            'birthday' => 'required|date|before:today',
            'contact' => 'required|string|max:20',
            'license_number' => 'required|string|max:50|unique:drivers,license_number,' . $id,
            'profile_picture_url' => 'nullable|string|max:500',
        ]);

        $driver->update([
            'first_name' => $validated['first_name'],
            'middle_name' => $validated['middle_name'] ?? null,
            'last_name' => $validated['last_name'],
            'birthday' => $validated['birthday'],
            'contact' => $validated['contact'],
            'license_number' => $validated['license_number'],
            'profile_picture_url' => $validated['profile_picture_url'] ?? $driver->profile_picture_url,
        ]);

        $driver->load(['vehicle']);

        return $this->successResponse($driver, 'Driver updated successfully');
    }

    /**
     * GET /api/v1/admin/drivers/{id}
     * Returns a single driver with full details for the profile modal.
     * Includes: vehicle assignment, recent shift logs (assignment history).
     */
    public function showDriver(string $id): JsonResponse
    {
        $driver = Driver::with(['vehicle.route', 'vehicle.conductor'])
            ->findOrFail($id);

        // Fetch recent shift logs for this driver (assignment history).
        $shiftLogs = ShiftLog::with(['vehicle', 'route'])
            ->where('driver_id', $id)
            ->orderBy('time_in', 'desc')
            ->limit(20)
            ->get();

        $data = [
            'id' => $driver->id,
            'first_name' => $driver->first_name,
            'middle_name' => $driver->middle_name,
            'last_name' => $driver->last_name,
            'birthday' => $driver->birthday?->toDateString(),
            'contact' => $driver->contact,
            'license_number' => $driver->license_number,
            'hire_date' => $driver->hire_date?->toDateString(),
            'profile_picture_url' => $driver->profile_picture_url,
            'status' => $driver->status,
            'vehicle' => $driver->vehicle ? [
                'id' => $driver->vehicle->id,
                'unit_number' => $driver->vehicle->unit_number,
                'plate_number' => $driver->vehicle->plate_number,
                'route' => $driver->vehicle->route?->name,
            ] : null,
            'conductor_partner' => $driver->vehicle?->conductor ? [
                'id' => $driver->vehicle->conductor->id,
                'name' => trim(($driver->vehicle->conductor->first_name ?? '') . ' ' . ($driver->vehicle->conductor->last_name ?? '')),
            ] : null,
            'assigned_route' => $driver->vehicle?->route?->name ?? 'Malolos - Meycauayan - Calumpit',
            'shift_logs' => $shiftLogs->map(function ($log) {
                return [
                    'shift_id' => $log->shift_id,
                    'unit_number' => $log->unit_number,
                    'plate_number' => $log->plate_number,
                    'route' => $log->route?->name,
                    'time_in' => $log->time_in?->toDateTimeString(),
                    'time_out' => $log->time_out?->toDateTimeString(),
                    'status' => $log->status,
                ];
            }),
        ];

        return $this->successResponse($data, 'Driver details retrieved');
    }

    /**
     * GET /api/v1/admin/conductors/{id}
     * Returns a single conductor with full details for the profile modal.
     * Includes: vehicle assignment, recent shift logs (assignment history).
     */
    public function showConductor(string $id): JsonResponse
    {
        $conductor = ConductorProfile::with(['vehicle.route', 'vehicle.driver'])
            ->findOrFail($id);

        // Fetch recent shift logs for this conductor (assignment history).
        $shiftLogs = ShiftLog::with(['vehicle', 'route', 'driver'])
            ->where('conductor_id', $id)
            ->orderBy('time_in', 'desc')
            ->limit(20)
            ->get();

        $data = [
            'id' => $conductor->id,
            'first_name' => $conductor->first_name,
            'middle_name' => $conductor->middle_name,
            'last_name' => $conductor->last_name,
            'birthday' => $conductor->birthday?->toDateString(),
            'profile_picture_url' => $conductor->profile_picture_url,
            'generated_username' => $conductor->generated_username,
            'vehicle' => $conductor->vehicle ? [
                'id' => $conductor->vehicle->id,
                'unit_number' => $conductor->vehicle->unit_number,
                'plate_number' => $conductor->vehicle->plate_number,
                'route' => $conductor->vehicle->route?->name,
            ] : null,
            'driver_partner' => $conductor->vehicle?->driver ? [
                'id' => $conductor->vehicle->driver->id,
                'name' => trim(($conductor->vehicle->driver->first_name ?? '') . ' ' . ($conductor->vehicle->driver->last_name ?? '')),
            ] : null,
            'assigned_route' => $conductor->vehicle?->route?->name ?? 'Malolos - Meycauayan - Calumpit',
            'shift_logs' => $shiftLogs->map(function ($log) {
                return [
                    'shift_id' => $log->shift_id,
                    'unit_number' => $log->unit_number,
                    'plate_number' => $log->plate_number,
                    'route' => $log->route?->name,
                    'driver_name' => $log->driver_name,
                    'time_in' => $log->time_in?->toDateTimeString(),
                    'time_out' => $log->time_out?->toDateTimeString(),
                    'status' => $log->status,
                ];
            }),
        ];

        return $this->successResponse($data, 'Conductor details retrieved');
    }

    /**
     * GET /api/v1/admin/conductors
     * Lists all conductor profiles (for the Personnel tab).
     */
    public function conductors(): JsonResponse
    {
        $conductors = ConductorProfile::with(['vehicle.route', 'vehicle.driver'])
            ->orderBy('last_name', 'asc')
            ->get();

        return $this->successResponse($conductors, 'Conductors retrieved');
    }

    /**
     * POST /api/v1/admin/conductors
     * Creates a new conductor account: a User (with CONDUCTOR role) + a
     * ConductorProfile. The username/password are generated server-side
     * (deterministic from name + birthday) and returned in the response so
     * the admin can hand them to the conductor.
     */
    public function storeConductor(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'first_name' => 'required|string|max:100',
            'middle_name' => 'nullable|string|max:100',
            'last_name' => 'required|string|max:100',
            'birthday' => 'required|date|before:today',
            'profile_picture_url' => 'nullable|string|max:500',
        ]);

        $firstName = $validated['first_name'];
        $lastName = $validated['last_name'];
        $birthday = $validated['birthday'];

        // Generate username: firstinitial.lastname (e.g., j.delacruz)
        // Uses the first character of the first name (after trimming) so a
        // compound first name like "Mhaku Jose" still produces "m.delacruz".
        $firstNameTrimmed = trim($firstName);
        $generatedUsername = strtolower(
            substr($firstNameTrimmed, 0, 1) . '.' . preg_replace('/\s+/', '', $lastName)
        );

        // Generate password: firstword.restwordsMMDDYYYY
        // For a single-word first name "Juan" → "juan.05142000"
        // For a compound first name "Mhaku Jose" → "mhaku.jose05142000"
        // (no spaces in the password — the dot separates the first word from
        // any remaining words, and the birthday is appended directly)
        $birthdayFormatted = \Carbon\Carbon::parse($birthday)->format('mdY');
        $firstNameParts = preg_split('/\s+/', $firstNameTrimmed);
        $firstPart = strtolower($firstNameParts[0]);
        $restParts = implode('', array_map('strtolower', array_slice($firstNameParts, 1)));
        $generatedPassword = $firstPart . '.' . $restParts . $birthdayFormatted;

        // Email is derived from username (conductor accounts don't have a real
        // email — they log in with the generated username via a custom field).
        // We store it as username@chatco.local to satisfy the NOT NULL email
        // constraint on the users table.
        $email = $generatedUsername . '@chatco.local';

        // Ensure username/email uniqueness — append a number if taken.
        $originalUsername = $generatedUsername;
        $counter = 1;
        while (User::where('email', $email)->exists()) {
            $generatedUsername = $originalUsername . $counter;
            $email = $generatedUsername . '@chatco.local';
            $counter++;
        }

        // Create the User account (CONDUCTOR role).
        $user = User::create([
            'email' => $email,
            'password' => $generatedPassword,
            'role' => UserRole::CONDUCTOR,
        ]);

        // Create the ConductorProfile (shares the same UUID PK as the User).
        $conductor = ConductorProfile::create([
            'id' => $user->id,
            'first_name' => $firstName,
            'middle_name' => $validated['middle_name'] ?? null,
            'last_name' => $lastName,
            'birthday' => $birthday,
            'profile_picture_url' => $validated['profile_picture_url'] ?? null,
            'generated_username' => $generatedUsername,
            'generated_password' => $generatedPassword,
        ]);

        return $this->successResponse([
            'id' => $conductor->id,
            'first_name' => $conductor->first_name,
            'last_name' => $conductor->last_name,
            'generated_username' => $generatedUsername,
            'generated_password' => $generatedPassword,
        ], 'Conductor account created successfully', 201);
    }

    public function vehicles(): JsonResponse
    {
        $vehicles = Vehicle::with(['route', 'driver', 'conductor'])->get();

        return $this->successResponse($vehicles, 'Vehicles retrieved');
    }

    /**
     * POST /api/v1/admin/vehicles
     * Creates a new vehicle.
     *
     * Required fields: unit_number, plate_number, route_id.
     * Driver and conductor are optional (can be assigned later via update).
     */
    public function storeVehicle(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'unit_number' => 'required|string|max:20|unique:vehicles,unit_number',
            'plate_number' => 'required|string|max:20|unique:vehicles,plate_number',
            'route_id' => 'required|uuid|exists:routes,id',
            'driver_id' => 'nullable|uuid|exists:drivers,id',
            'conductor_id' => 'nullable|uuid|exists:conductor_profiles,id',
            'status' => 'nullable|string|in:ACTIVE,MAINTENANCE,INACTIVE',
        ]);

        $vehicle = Vehicle::create([
            'unit_number' => $validated['unit_number'],
            'plate_number' => $validated['plate_number'],
            'route_id' => $validated['route_id'],
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
     * PUT/PATCH /api/v1/admin/vehicles/{id}
     * Updates an existing vehicle.
     *
     * Required fields: unit_number, plate_number, route_id.
     * Driver/conductor can be cleared by sending null.
     */
    public function updateVehicle(Request $request, string $id): JsonResponse
    {
        $vehicle = Vehicle::findOrFail($id);

        $validated = $request->validate([
            'unit_number' => 'required|string|max:20|unique:vehicles,unit_number,' . $id,
            'plate_number' => 'required|string|max:20|unique:vehicles,plate_number,' . $id,
            'route_id' => 'required|uuid|exists:routes,id',
            'driver_id' => 'nullable|uuid|exists:drivers,id',
            'conductor_id' => 'nullable|uuid|exists:conductor_profiles,id',
            'status' => 'nullable|string|in:ACTIVE,MAINTENANCE,INACTIVE',
        ]);

        $vehicle->update([
            'unit_number' => $validated['unit_number'],
            'plate_number' => $validated['plate_number'],
            'route_id' => $validated['route_id'],
            'driver_id' => $validated['driver_id'] ?? null,
            'conductor_id' => $validated['conductor_id'] ?? null,
            'status' => $validated['status'] ?? $vehicle->status,
        ]);

        $vehicle->load(['route', 'driver', 'conductor']);

        return $this->successResponse($vehicle, 'Vehicle updated successfully');
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

    public function shiftLogs(Request $request): JsonResponse
    {
        $query = ShiftLog::with(['vehicle', 'driver', 'route'])
            ->orderBy('time_in', 'desc');

        if ($request->has('vehicle_id')) {
            $query->where('vehicle_id', $request->input('vehicle_id'));
        }

        if ($request->has('conductor_id')) {
            $query->where('conductor_id', $request->input('conductor_id'));
        }

        if ($request->has('driver_id')) {
            $query->where('driver_id', $request->input('driver_id'));
        }

        $shiftLogs = $query->get();

        return $this->successResponse($shiftLogs, 'Shift logs retrieved');
    }
}