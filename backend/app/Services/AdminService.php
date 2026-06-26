<?php

namespace App\Services;

use App\Models\Remittance;
use App\Models\ShiftLog;
use App\Models\Vehicle;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class AdminService
{
    /**
     * List vehicles with optional filters + pagination.
     *
     * Supported filters:
     *   - status   (exact match, e.g. ACTIVE / MAINTENANCE / INACTIVE)
     *   - route_id (exact match, UUID)
     *   - search   (LIKE on plate_number OR unit_number)
     *
     * Always eager-loads driver + route (+ conductor) to avoid N+1 in lists.
     *
     * @param  array{status?: string, route_id?: string, search?: string}  $filters
     * @param  int  $perPage  Page size (defaults to 15, matching other list endpoints).
     */
    public function listVehicles(array $filters = [], int $perPage = 15): LengthAwarePaginator
    {
        return Vehicle::query()
            ->with(['route', 'driver', 'conductor'])
            ->when($filters['status'] ?? null, function (Builder $q, string $status) {
                $q->where('status', $status);
            })
            ->when($filters['route_id'] ?? null, function (Builder $q, string $routeId) {
                $q->where('route_id', $routeId);
            })
            ->when($filters['search'] ?? null, function (Builder $q, string $search) {
                $term = "%{$search}%";
                $q->where(function (Builder $sub) use ($term) {
                    $sub->where('plate_number', 'like', $term)
                        ->orWhere('unit_number', 'like', $term);
                });
            })
            ->orderBy('unit_number', 'asc')
            ->paginate($perPage);
    }

    /**
     * Create a new vehicle.
     *
     * plate_number + unit_number uniqueness is enforced by the database
     * (unique indexes) and by the Form Request validation.
     *
     * @param  array  $data  Validated payload from StoreVehicleRequest.
     */
    public function createVehicle(array $data): Vehicle
    {
        return DB::transaction(function () use ($data) {
            return Vehicle::create([
                'unit_number'     => $data['unit_number'],
                'plate_number'    => $data['plate_number'],
                'vehicle_type'    => $data['vehicle_type'] ?? null,
                'route_id'        => $data['route_id'] ?? null,
                'driver_id'       => $data['driver_id'] ?? null,
                'conductor_id'    => $data['conductor_id'] ?? null,
                'status'          => $data['status'] ?? 'ACTIVE',
                'capacity_status' => $data['capacity_status'] ?? 'AVAILABLE',
            ])->fresh(['route', 'driver', 'conductor']);
        });
    }

    /**
     * Update an existing vehicle's mutable fields.
     *
     * @param  array  $data  Validated payload from UpdateVehicleRequest.
     * @throws \Illuminate\Database\Eloquent\ModelNotFoundException  If the vehicle doesn't exist.
     */
    public function updateVehicle(string $id, array $data): Vehicle
    {
        $vehicle = Vehicle::findOrFail($id);

        DB::transaction(function () use ($vehicle, $data) {
            $vehicle->update(array_filter([
                'unit_number'     => $data['unit_number'] ?? null,
                'plate_number'    => $data['plate_number'] ?? null,
                'vehicle_type'    => array_key_exists('vehicle_type', $data) ? $data['vehicle_type'] : null,
                'route_id'        => array_key_exists('route_id', $data) ? $data['route_id'] : null,
                'driver_id'       => array_key_exists('driver_id', $data) ? $data['driver_id'] : null,
                'conductor_id'    => array_key_exists('conductor_id', $data) ? $data['conductor_id'] : null,
                'status'          => $data['status'] ?? null,
                'capacity_status' => $data['capacity_status'] ?? null,
            ], fn ($value) => $value !== null));
        });

        return $vehicle->fresh(['route', 'driver', 'conductor']);
    }

    /**
     * Delete a vehicle — UNLESS it has an active_shift_id, in which case
     * reject with a 409 Conflict so the conductor's active shift is never
     * orphaned.
     *
     * @throws ValidationException  When the vehicle has an active shift.
     * @throws \Illuminate\Database\Eloquent\ModelNotFoundException  If the vehicle doesn't exist.
     */
    public function deleteVehicle(string $id): void
    {
        $vehicle = Vehicle::findOrFail($id);

        if ($vehicle->active_shift_id) {
            throw ValidationException::withMessages([
                'vehicle' => [
                    'Cannot delete a vehicle that is currently on an active shift. ' .
                    'End the shift (via conductor remittance) before deleting.',
                ],
            ]);
        }

        $vehicle->delete();
    }

    /**
     * Aggregate business metrics for the admin dashboard.
     *
     * Computes from real DB tables (transactions + remittances + vehicles +
     * shift_logs). All aggregation is server-side via Query Builder — no
     * static data, no wallet/balance metrics (none exist in the schema).
     *
     * Default window: last 30 days (date_from = today - 30, date_to = today).
     * Override via ?date_from=YYYY-MM-DD&date_to=YYYY-MM-DD.
     *
     * Only PAID transactions count toward revenue totals; pending counts
     * are exposed separately.
     *
     * @param  array{date_from?: string, date_to?: string}  $filters
     * @return array{
     *     date_range: array{from: string, to: string, days: int},
     *     totals: array{
     *         total_fares: float,
     *         cash_total: float,
     *         gcash_total: float,
     *         paid_count: int,
     *         pending_count: int,
     *         total_passengers: int
     *     },
     *     payment_split: array{cash: array{count: int, total: float}, gcash: array{count: int, total: float}},
     *     daily_series: array<int, array{date: string, cash: float, gcash: float, total: float, count: int}>,
     *     remittances: array{total_remitted: float, total_collected: float, total_shortage: float, count: int},
     *     fleet: array{active_vehicles: int, total_vehicles: int, active_conductors: int, total_conductors: int}
     * }
     */
    public function analytics(array $filters = []): array
    {
        // Default window: last 30 days.
        $dateTo = isset($filters['date_to'])
            ? Carbon::parse($filters['date_to'])->endOfDay()
            : Carbon::today()->endOfDay();
        $dateFrom = isset($filters['date_from'])
            ? Carbon::parse($filters['date_from'])->startOfDay()
            : Carbon::today()->subDays(29)->startOfDay();

        // ── Totals (PAID transactions only) ────────────────────────────────
        $paidBase = DB::table('transactions')
            ->where('status', 'PAID')
            ->whereBetween('created_at', [$dateFrom, $dateTo]);

        $cashTotal = (float) (clone $paidBase)->where('payment_method', 'CASH')->sum('final_amount');
        $gcashTotal = (float) (clone $paidBase)->where('payment_method', 'GCASH')->sum('final_amount');
        $paidCount = (int) (clone $paidBase)->count();
        $totalPassengers = $paidCount; // 1 transaction = 1 passenger in the current schema

        // ── Pending transactions (PENDING + PROCESSING) ────────────────────
        $pendingCount = (int) DB::table('transactions')
            ->whereIn('status', ['PENDING', 'PROCESSING'])
            ->whereBetween('created_at', [$dateFrom, $dateTo])
            ->count();

        // ── Payment split (counts + sums) ──────────────────────────────────
        $paymentSplit = [
            'cash' => [
                'count' => (int) (clone $paidBase)->where('payment_method', 'CASH')->count(),
                'total' => $cashTotal,
            ],
            'gcash' => [
                'count' => (int) (clone $paidBase)->where('payment_method', 'GCASH')->count(),
                'total' => $gcashTotal,
            ],
        ];

        // ── Per-day series (PAID transactions, grouped by date) ────────────
        // Uses DATE(created_at) so it groups by calendar day regardless of DB driver.
        $dailyRows = DB::table('transactions')
            ->select(
                DB::raw('DATE(created_at) as date'),
                DB::raw("SUM(CASE WHEN payment_method = 'CASH' THEN final_amount ELSE 0 END) as cash"),
                DB::raw("SUM(CASE WHEN payment_method = 'GCASH' THEN final_amount ELSE 0 END) as gcash"),
                DB::raw('SUM(final_amount) as total'),
                DB::raw('COUNT(*) as count')
            )
            ->where('status', 'PAID')
            ->whereBetween('created_at', [$dateFrom, $dateTo])
            ->groupBy(DB::raw('DATE(created_at)'))
            ->orderBy('date', 'asc')
            ->get();

        $dailySeries = $dailyRows->map(function ($row) {
            return [
                'date'  => $row->date,
                'cash'  => (float) $row->cash,
                'gcash' => (float) $row->gcash,
                'total' => (float) $row->total,
                'count' => (int) $row->count,
            ];
        })->values()->toArray();

        // ── Remittance summary ─────────────────────────────────────────────
        // Remittances use a 'date' column (not created_at) — that's the
        // business date the shift was remitted on.
        $remittanceBase = Remittance::query()
            ->whereBetween('date', [$dateFrom->toDateString(), $dateTo->toDateString()]);

        $remittanceCount = (int) (clone $remittanceBase)->count();
        $totalRemitted = (float) (clone $remittanceBase)->sum('remitted_amount');
        $totalCollected = (float) (clone $remittanceBase)->sum('total_collected');
        $totalShortage = (float) (clone $remittanceBase)->sum('shortage');

        // ── Fleet counts ───────────────────────────────────────────────────
        // Active = currently on an active shift (active_shift_id IS NOT NULL).
        // Total = all non-deleted vehicles (soft-deletes excluded by Eloquent).
        $totalVehicles = (int) Vehicle::count();
        $activeVehicles = (int) Vehicle::whereNotNull('active_shift_id')->count();

        // Active conductors = conductors with an ACTIVE shift right now.
        // Total conductors = all conductor profiles (non-deleted).
        $totalConductors = (int) DB::table('conductor_profiles')->count();
        $activeConductors = (int) ShiftLog::where('status', 'ACTIVE')->distinct('conductor_id')->count('conductor_id');

        return [
            'date_range' => [
                'from' => $dateFrom->toDateString(),
                'to'   => $dateTo->toDateString(),
                'days' => (int) $dateFrom->diffInDays($dateTo) + 1,
            ],
            'totals' => [
                'total_fares'      => $cashTotal + $gcashTotal,
                'cash_total'       => $cashTotal,
                'gcash_total'      => $gcashTotal,
                'paid_count'       => $paidCount,
                'pending_count'    => $pendingCount,
                'total_passengers' => $totalPassengers,
            ],
            'payment_split' => $paymentSplit,
            'daily_series'  => $dailySeries,
            'remittances' => [
                'total_remitted'   => $totalRemitted,
                'total_collected'  => $totalCollected,
                'total_shortage'   => $totalShortage,
                'count'            => $remittanceCount,
            ],
            'fleet' => [
                'active_vehicles'   => $activeVehicles,
                'total_vehicles'    => $totalVehicles,
                'active_conductors' => $activeConductors,
                'total_conductors'  => $totalConductors,
            ],
        ];
    }
}
