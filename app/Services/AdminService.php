<?php

namespace App\Services;

use App\Enums\UserRole;
use App\Mail\AccountApprovedMail;
use App\Mail\AccountRejectedMail;
use App\Models\Remittance;
use App\Models\ShiftLog;
use App\Models\Setting;
use App\Models\User;
use App\Models\UserSuspension;
use App\Models\Vehicle;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;

class AdminService
{
    /** Account statuses an admin may toggle a commuter between. */
    private const ADMIN_TOGGLEABLE_STATUSES = ['ACTIVE', 'SUSPENDED'];

    public function __construct(
        private RegistrationGuard $registrationGuard
    ) {}
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

        // Immediately-preceding window of the same length, used for the
        // period-over-period deltas on the metric cards. A window of N days
        // is compared against the N days directly before it.
        $windowDays = (int) $dateFrom->diffInDays($dateTo) + 1;
        $prevTo = (clone $dateFrom)->subSecond();
        $prevFrom = (clone $dateFrom)->subDays($windowDays);

        $current = $this->aggregateTransactionWindow($dateFrom, $dateTo);
        $previous = $this->aggregateTransactionWindow($prevFrom, $prevTo);

        $cashTotal = $current['cash_total'];
        $gcashTotal = $current['gcash_total'];
        $voucherCount = $current['voucher_count'];
        // Revenue excludes VOUCHER by construction: reward rides are recorded
        // with final_amount = 0. They still count as *rides*, which is why
        // ride counts and revenue are reported separately below.
        $totalFares = $cashTotal + $gcashTotal;
        $paidCount = $current['paid_count'];

        // ── Pending transactions (PENDING + PROCESSING) ────────────────────
        $pendingCount = (int) DB::table('transactions')
            ->whereIn('status', ['PENDING', 'PROCESSING'])
            ->whereBetween('created_at', [$dateFrom, $dateTo])
            ->count();

        // ── Full status breakdown ──────────────────────────────────────────
        // Drives the GCash settlement-success metric. Previously only
        // PENDING was surfaced, so FAILED/EXPIRED/CANCELLED payments — the
        // ones that actually need chasing — were invisible.
        $statusRows = DB::table('transactions')
            ->select('status', DB::raw('COUNT(*) as status_count'))
            ->whereBetween('created_at', [$dateFrom, $dateTo])
            ->groupBy('status')
            ->pluck('status_count', 'status');

        // Statuses the app can actually produce. REFUNDED is deliberately not
        // here: nothing in the product initiates a refund, so it would be a
        // permanently-zero tile. It is still reachable in theory via a
        // provider-side refund webhook, so it (or any other unexpected
        // status) is appended below when a row genuinely has one — hidden
        // when zero, never hidden when it exists.
        $expectedStatuses = ['PAID', 'PENDING', 'PROCESSING', 'FAILED', 'CANCELLED', 'EXPIRED'];

        $statusBreakdown = [];
        foreach ($expectedStatuses as $s) {
            $statusBreakdown[$s] = (int) ($statusRows[$s] ?? 0);
        }
        foreach ($statusRows as $status => $count) {
            if (! in_array($status, $expectedStatuses, true) && (int) $count > 0) {
                $statusBreakdown[$status] = (int) $count;
            }
        }

        // Gateway-settled attempts only — cash never goes through this
        // lifecycle, so including it would flatter the success rate.
        $gcashAttempts = (int) DB::table('transactions')
            ->where('payment_method', 'GCASH')
            ->whereIn('status', ['PAID', 'FAILED', 'CANCELLED', 'EXPIRED'])
            ->whereBetween('created_at', [$dateFrom, $dateTo])
            ->count();
        $gcashSettled = $current['gcash_count'];

        // ── Payment split (counts + sums), now including VOUCHER ───────────
        $paymentSplit = [
            'cash' => ['count' => $current['cash_count'], 'total' => $cashTotal],
            'gcash' => ['count' => $current['gcash_count'], 'total' => $gcashTotal],
            'voucher' => ['count' => $voucherCount, 'total' => 0.0],
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
            ->get()
            ->keyBy('date');

        // Zero-fill every calendar day in the window. The grouped query only
        // returns days that had transactions, so a chart built straight from
        // it silently closed the gaps — 12 active days out of 30 rendered as
        // 12 adjacent bars implying continuous trade. Days with no trade are
        // the most operationally interesting ones, so they must be present.
        $dailySeries = [];
        for ($d = (clone $dateFrom)->startOfDay(); $d->lte($dateTo); $d->addDay()) {
            $key = $d->toDateString();
            $row = $dailyRows->get($key);
            $dailySeries[] = [
                'date'  => $key,
                'cash'  => $row ? (float) $row->cash : 0.0,
                'gcash' => $row ? (float) $row->gcash : 0.0,
                'total' => $row ? (float) $row->total : 0.0,
                'count' => $row ? (int) $row->count : 0,
            ];
        }

        // ── Hour-of-day demand profile ─────────────────────────────────────
        // Aggregated across the whole window; drives the peak-hours chart.
        // Every hour 0-23 is present so the chart has a stable x-axis.
        //
        // Hour extraction is driver-specific: MySQL has HOUR(), SQLite (used
        // by the test suite) does not and needs strftime.
        $driver = DB::connection()->getDriverName();
        $hourExpr = match ($driver) {
            'sqlite' => "CAST(strftime('%H', created_at) AS INTEGER)",
            'pgsql'  => 'EXTRACT(HOUR FROM created_at)',
            default  => 'HOUR(created_at)',
        };

        $hourRows = DB::table('transactions')
            ->select(DB::raw("{$hourExpr} as hour"), DB::raw('COUNT(*) as ride_count'), DB::raw('SUM(final_amount) as revenue'))
            ->where('status', 'PAID')
            ->whereBetween('created_at', [$dateFrom, $dateTo])
            ->groupBy(DB::raw($hourExpr))
            ->get()
            ->keyBy(fn ($row) => (int) $row->hour);

        $hourlySeries = [];
        for ($h = 0; $h < 24; $h++) {
            $row = $hourRows->get($h);
            $hourlySeries[] = [
                'hour'    => $h,
                'count'   => $row ? (int) $row->ride_count : 0,
                'revenue' => $row ? (float) $row->revenue : 0.0,
            ];
        }

        // ── Remittance summary ─────────────────────────────────────────────
        // Remittances use a 'date' column (not created_at) — that's the
        // business date the shift was remitted on. NOTE: transaction totals
        // above are windowed on created_at, so a shift running past midnight
        // can land in a different bucket than its fares. The two are related
        // but do not reconcile exactly; the UI labels them accordingly.
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

        // ── Top Pickup Points (aggregate PAID transactions by pickup_name) ──
        // Each PAID transaction has a `pickup_name` (the fare point name the
        // conductor selected). We count how many passengers boarded at each
        // pickup point in the date window, sorted descending. Limited to top 10.
        $pickupPoints = DB::table('transactions')
            ->select('pickup_name', DB::raw('COUNT(*) as pickup_count'))
            ->where('status', 'PAID')
            ->whereNotNull('pickup_name')
            ->where('pickup_name', '!=', '')
            ->whereBetween('created_at', [$dateFrom, $dateTo])
            ->groupBy('pickup_name')
            ->orderByDesc('pickup_count')
            ->limit(10)
            ->get()
            ->map(fn ($row) => [
                'name'  => $row->pickup_name,
                'count' => (int) $row->pickup_count,
            ])
            ->toArray();

        // ── Demand Heatmap Zones (aggregate PAID transactions with coordinates) ──
        // Join transactions with fare_points to get the GPS coordinates of each
        // pickup location. Group by fare_point to cluster demand by location.
        // The intensity is computed from the pickup_count:
        //   - >= 50 pickups  → Critical (red)
        //   - >= 20 pickups  → High (orange)
        //   - >= 5 pickups   → Moderate (yellow)
        //   - < 5 pickups    → Low (green)
        $heatmapZones = DB::table('transactions')
            ->join('fare_points', 'transactions.pickup_stop_id', '=', 'fare_points.id')
            ->select(
                'fare_points.name as zone_name',
                'fare_points.latitude',
                'fare_points.longitude',
                DB::raw('COUNT(*) as commuter_count')
            )
            ->where('transactions.status', 'PAID')
            ->whereNotNull('fare_points.latitude')
            ->whereNotNull('fare_points.longitude')
            ->whereBetween('transactions.created_at', [$dateFrom, $dateTo])
            ->groupBy('fare_points.id', 'fare_points.name', 'fare_points.latitude', 'fare_points.longitude')
            ->orderByDesc('commuter_count')
            ->limit(15)
            ->get()
            ->map(function ($row) {
                $count = (int) $row->commuter_count;
                $intensity = $count >= 50 ? 'Critical' : ($count >= 20 ? 'High' : ($count >= 5 ? 'Moderate' : 'Low'));
                $color = $count >= 50 ? 'bg-red-500' : ($count >= 20 ? 'bg-orange-500' : ($count >= 5 ? 'bg-yellow-500' : 'bg-green-500'));
                return [
                    'zone'      => $row->zone_name,
                    'commuters' => $count,
                    'intensity' => $intensity,
                    'color'     => $color,
                    'lat'       => (float) $row->latitude,
                    'lng'       => (float) $row->longitude,
                ];
            })
            ->toArray();

        $prevTotalFares = $previous['cash_total'] + $previous['gcash_total'];

        return [
            'date_range' => [
                'from' => $dateFrom->toDateString(),
                'to'   => $dateTo->toDateString(),
                'days' => $windowDays,
            ],
            // The window immediately before this one, so the UI can label
            // what the deltas are actually being compared against.
            'previous_range' => [
                'from' => $prevFrom->toDateString(),
                'to'   => $prevTo->toDateString(),
            ],
            'totals' => [
                'total_fares'      => $totalFares,
                'cash_total'       => $cashTotal,
                'gcash_total'      => $gcashTotal,
                // Rides settled for money (excludes free voucher rides), so
                // this is directly comparable to cash_count + gcash_count.
                'paid_count'       => $current['cash_count'] + $current['gcash_count'],
                // Every PAID row including voucher rides = bodies carried.
                'total_passengers' => $current['passenger_count'],
                'pending_count'    => $pendingCount,
                'voucher_count'    => $voucherCount,
                // Mean revenue per paying ride. Normalises the headline total
                // so a busy-but-cheap window is distinguishable from a quiet
                // one. Guarded against divide-by-zero on an empty window.
                'avg_fare'         => $current['cash_count'] + $current['gcash_count'] > 0
                    ? round($totalFares / ($current['cash_count'] + $current['gcash_count']), 2)
                    : 0.0,
            ],
            // Same shape as `totals`, for the preceding window. The frontend
            // derives percentage deltas from these rather than the backend
            // pre-computing them, so it can format "no prior data" itself.
            'previous_totals' => [
                'total_fares'   => $prevTotalFares,
                'cash_total'    => $previous['cash_total'],
                'gcash_total'   => $previous['gcash_total'],
                'paid_count'    => $previous['cash_count'] + $previous['gcash_count'],
                'avg_fare'      => $previous['cash_count'] + $previous['gcash_count'] > 0
                    ? round($prevTotalFares / ($previous['cash_count'] + $previous['gcash_count']), 2)
                    : 0.0,
            ],
            'payment_split' => $paymentSplit,
            'daily_series'  => $dailySeries,
            'hourly_series' => $hourlySeries,
            'status_breakdown' => $statusBreakdown,
            'gcash_health' => [
                'attempts'     => $gcashAttempts,
                'settled'      => $gcashSettled,
                'failed'       => $statusBreakdown['FAILED'],
                'expired'      => $statusBreakdown['EXPIRED'],
                'cancelled'    => $statusBreakdown['CANCELLED'],
                'success_rate' => $gcashAttempts > 0
                    ? round(($gcashSettled / $gcashAttempts) * 100, 1)
                    : null,
            ],
            'remittances' => [
                'total_remitted'   => $totalRemitted,
                'total_collected'  => $totalCollected,
                'total_shortage'   => $totalShortage,
                'count'            => $remittanceCount,
                // Shortage as a share of what was collected. An absolute peso
                // figure alone can't distinguish ₱500 short on ₱600 from ₱500
                // short on ₱600,000.
                'shortage_rate'    => $totalCollected > 0
                    ? round(($totalShortage / $totalCollected) * 100, 2)
                    : 0.0,
            ],
            'fleet' => [
                'active_vehicles'   => $activeVehicles,
                'total_vehicles'    => $totalVehicles,
                'active_conductors' => $activeConductors,
                'total_conductors'  => $totalConductors,
            ],
            'pickup_points' => $pickupPoints,
            'heatmap_zones' => $heatmapZones,
        ];
    }

    /**
     * Revenue + ride counts for PAID transactions inside one window.
     *
     * Extracted so the current and immediately-preceding windows can be
     * aggregated identically for period-over-period deltas.
     *
     * @return array{cash_total: float, gcash_total: float, cash_count: int, gcash_count: int, voucher_count: int, paid_count: int}
     */
    private function aggregateTransactionWindow(Carbon $from, Carbon $to): array
    {
        // One grouped query rather than six independent aggregates — the old
        // code cloned the base builder and hit the table once per figure.
        $rows = DB::table('transactions')
            ->select(
                'payment_method',
                DB::raw('COUNT(*) as method_count'),
                DB::raw('SUM(final_amount) as method_total'),
                DB::raw('SUM(total_passengers) as passenger_count')
            )
            ->where('status', 'PAID')
            ->whereBetween('created_at', [$from, $to])
            ->groupBy('payment_method')
            ->get()
            ->keyBy('payment_method');

        $countFor = fn (string $m) => (int) ($rows->get($m)->method_count ?? 0);
        $totalFor = fn (string $m) => (float) ($rows->get($m)->method_total ?? 0);
        $passengersFor = fn (string $m) => (int) ($rows->get($m)->passenger_count ?? 0);

        return [
            'cash_total'    => $totalFor('CASH'),
            'gcash_total'   => $totalFor('GCASH'),
            'cash_count'    => $countFor('CASH'),
            'gcash_count'   => $countFor('GCASH'),
            'voucher_count' => $countFor('VOUCHER'),
            'paid_count'    => $countFor('CASH') + $countFor('GCASH') + $countFor('VOUCHER'),
            'passenger_count' => $passengersFor('CASH') + $passengersFor('GCASH') + $passengersFor('VOUCHER'),
        ];
    }

    // ═══════════════════════════════════════════════════════════════════
    // USER MANAGEMENT (S5-T3)
    // ═══════════════════════════════════════════════════════════════════

    /**
     * GET /admin/users — paginated, role-filterable, searchable list.
     */
    public function listUsers(array $filters): LengthAwarePaginator
    {
        $perPage = (int) ($filters['per_page'] ?? 15);
        $perPage = max(1, min($perPage, 100));

        $query = User::query()
            ->with($this->profileEagerLoads());

        if (! empty($filters['active_only'])) {
            $query->where(function ($activeQuery) {
                $activeQuery
                    ->whereDoesntHave('commuterProfile')
                    ->orWhereHas('commuterProfile', function ($profileQuery) {
                        $profileQuery->whereNotIn('account_status', ['PENDING', 'REJECTED']);
                    });
            });
        }

        if (! empty($filters['role'])) {
            $query->where('role', $filters['role']);
        }

        if (! empty($filters['search'])) {
            $this->applySearch($query, trim($filters['search']));
        }

        if (! empty($filters['account_status'])) {
            if ($filters['account_status'] === 'SUSPENDED') {
                $query->where(function (Builder $statusQuery) {
                    $statusQuery->whereHas('activeSuspension')
                        ->orWhereHas('commuterProfile', fn (Builder $profile) => $profile->where('account_status', 'SUSPENDED'));
                });
            } else {
                $query->whereDoesntHave('activeSuspension')
                    ->where(function (Builder $statusQuery) {
                        $statusQuery->whereDoesntHave('commuterProfile')
                            ->orWhereHas('commuterProfile', fn (Builder $profile) => $profile->whereIn('account_status', ['ACTIVE', 'APPROVED']));
                    });
            }
        }

        $sort = $filters['sort'] ?? 'recent';
        if ($sort === 'oldest') {
            $query->orderBy('created_at', 'asc');
        } elseif ($sort === 'alphabetical') {
            $query
                ->orderByRaw("COALESCE(
                    (SELECT surname FROM commuter_profiles WHERE commuter_profiles.id = users.id),
                    (SELECT last_name FROM conductor_profiles WHERE conductor_profiles.id = users.id),
                    users.email
                ) ASC")
                ->orderBy('email', 'asc');
        } else {
            $query->orderBy('created_at', 'desc');
        }

        return $query->paginate($perPage)
            ->withQueryString()
            ->through(fn (User $user) => $this->present($user));
    }

    /**
     * GET /admin/users/{id} — a single user with its profile.
     */
    public function getUser(string $id): ?array
    {
        $user = User::with($this->profileEagerLoads())->find($id);
        return $user ? $this->present($user) : null;
    }

    /**
     * PUT /admin/users/{id} — update the editable profile fields.
     */
    public function updateUser(string $id, array $data, User $actingAdmin): ?array
    {
        $user = User::with($this->profileEagerLoads())->find($id);

        if (! $user) {
            return null;
        }

        $profile = $this->profileOf($user);

        if (! $profile) {
            throw ValidationException::withMessages([
                'user' => ['This user has no profile and cannot be edited.'],
            ]);
        }

        if (array_key_exists('first_name', $data)) {
            $profile->first_name = $data['first_name'];
        }
        if (array_key_exists('middle_name', $data)) {
            $profile->middle_name = $data['middle_name'];
        }
        if (array_key_exists('last_name', $data)) {
            $lastNameColumn = $user->isCommuter() ? 'surname' : 'last_name';
            $profile->{$lastNameColumn} = $data['last_name'];
        }

        $commuterOnly = array_intersect_key($data, array_flip(['account_status', 'contact_number']));

        if (! empty($commuterOnly) && ! $user->isCommuter()) {
            throw ValidationException::withMessages([
                'account_status' => ['Account status and contact number can only be set on commuter accounts.'],
            ]);
        }

        if (array_key_exists('account_status', $data)) {
            if ($user->id === $actingAdmin->id && $data['account_status'] === 'SUSPENDED') {
                throw ValidationException::withMessages([
                    'account_status' => ['You cannot suspend your own account.'],
                ]);
            }
            $profile->account_status = $data['account_status'];
        }

        if (array_key_exists('contact_number', $data)) {
            $profile->contact_number = $data['contact_number'];
        }

        if ($profile->isDirty()) {
            $profile->save();
        }

        return $this->present($user->setRelation($this->relationName($user), $profile));
    }

    /**
     * DELETE /admin/users/{id} — soft-delete a user account.
     */
    public function deleteUser(string $id, User $actingAdmin): bool
    {
        $user = User::find($id);

        if (! $user) {
            return false;
        }

        if ($user->id === $actingAdmin->id) {
            throw ValidationException::withMessages([
                'user' => ['You cannot delete your own account.'],
            ]);
        }

        if ($user->isAdmin() && $this->activeAdminCount() <= 1) {
            throw ValidationException::withMessages([
                'user' => ['Cannot delete the last administrator account.'],
            ]);
        }

        $user->delete();

        return true;
    }

    public function suspendUser(string $id, array $data, User $actingAdmin): array
    {
        $user = User::with($this->profileEagerLoads())->find($id);

        if (! $user) {
            abort(404, 'User not found.');
        }

        if ($user->id === $actingAdmin->id) {
            throw ValidationException::withMessages([
                'user' => ['You cannot suspend your own account.'],
            ]);
        }

        $endsAt = ! empty($data['is_permanent'])
            ? null
            : Carbon::now()->addDays((int) $data['duration_days']);

        DB::transaction(function () use ($user, $data, $actingAdmin, $endsAt) {
            UserSuspension::where('user_id', $user->id)
                ->whereNull('lifted_at')
                ->update([
                    'lifted_at' => now(),
                    'lifted_by' => $actingAdmin->id,
                ]);

            UserSuspension::create([
                'user_id' => $user->id,
                'reason_code' => $data['reason_code'],
                'reason' => $data['reason'],
                'starts_at' => now(),
                'ends_at' => $endsAt,
                'is_permanent' => (bool) ($data['is_permanent'] ?? false),
                'suspended_by' => $actingAdmin->id,
            ]);

            $user->tokens()->delete();
        });

        return $this->present($user->fresh()->load($this->profileEagerLoads()));
    }

    public function unsuspendUser(string $id, User $actingAdmin): array
    {
        $user = User::with($this->profileEagerLoads())->find($id);

        if (! $user) {
            abort(404, 'User not found.');
        }

        DB::transaction(function () use ($user, $actingAdmin) {
            UserSuspension::where('user_id', $user->id)
                ->whereNull('lifted_at')
                ->update([
                    'lifted_at' => now(),
                    'lifted_by' => $actingAdmin->id,
                ]);

            if ($user->isCommuter() && $user->commuterProfile?->account_status === 'SUSPENDED') {
                $user->commuterProfile->update(['account_status' => 'ACTIVE']);
            }
        });

        return $this->present($user->fresh()->load($this->profileEagerLoads()));
    }

    public function suspensionHistory(string $id): array
    {
        $user = User::findOrFail($id);

        return $user->suspensions()
            ->latest('starts_at')
            ->get()
            ->map(fn (UserSuspension $suspension) => $this->presentSuspension($suspension))
            ->all();
    }

    // ── Internals ────────────────────────────────────────────────

    private function profileEagerLoads(): array
    {
        return [
            'adminProfile:id,first_name,middle_name,last_name',
            'conductorProfile:id,first_name,middle_name,last_name,generated_username',
            'commuterProfile:id,first_name,middle_name,surname,contact_number,commuter_type,account_status,verified_at,username',
            'activeSuspension',
        ];
    }

    private function applySearch($query, string $term): void
    {
        $like = '%' . $term . '%';

        $query->where(function ($q) use ($like) {
            $q->where('email', 'like', $like)
                ->orWhereHas('adminProfile', fn ($p) => $p
                    ->where('first_name', 'like', $like)
                    ->orWhere('last_name', 'like', $like))
                ->orWhereHas('conductorProfile', fn ($p) => $p
                    ->where('first_name', 'like', $like)
                    ->orWhere('last_name', 'like', $like)
                    ->orWhere('generated_username', 'like', $like))
                ->orWhereHas('commuterProfile', fn ($p) => $p
                    ->where('first_name', 'like', $like)
                    ->orWhere('surname', 'like', $like)
                    ->orWhere('username', 'like', $like));
        });
    }

    private function relationName(User $user): string
    {
        return match ($user->role) {
            UserRole::ADMIN => 'adminProfile',
            UserRole::CONDUCTOR => 'conductorProfile',
            UserRole::COMMUTER => 'commuterProfile',
        };
    }

    private function profileOf(User $user)
    {
        return $user->{$this->relationName($user)};
    }

    private function activeAdminCount(): int
    {
        return User::where('role', UserRole::ADMIN->value)->count();
    }

    private function present(User $user): array
    {
        $commuter = $user->commuterProfile;

        $suspension = $user->activeSuspension;

        return [
            'id'             => $user->id,
            'email'          => $user->email,
            'role'           => $user->role->value,
            'name'           => $user->getDisplayName(),
            'account_status' => $suspension ? 'SUSPENDED' : $commuter?->account_status,
            'commuter_type'  => $commuter?->commuter_type,
            'contact_number' => $commuter?->contact_number,
            'verified_at'    => optional($commuter?->verified_at)->toIso8601String(),
            'created_at'     => optional($user->created_at)->toIso8601String(),
            'suspension'     => $suspension ? $this->presentSuspension($suspension) : null,
        ];
    }

    private function presentSuspension(UserSuspension $suspension): array
    {
        return [
            'id' => $suspension->id,
            'reason_code' => $suspension->reason_code,
            'reason' => $suspension->reason,
            'starts_at' => $suspension->starts_at?->toIso8601String(),
            'ends_at' => $suspension->ends_at?->toIso8601String(),
            'is_permanent' => $suspension->is_permanent,
            'lifted_at' => $suspension->lifted_at?->toIso8601String(),
        ];
    }

    public static function isToggleableStatus(string $status): bool
    {
        return in_array($status, self::ADMIN_TOGGLEABLE_STATUSES, true);
    }

    // ═══════════════════════════════════════════════════════════════════
    // REGISTRATION REVIEW (S5-T15)
    // ═══════════════════════════════════════════════════════════════════

    /**
     * GET /admin/registrations — list PENDING commuter accounts awaiting review.
     *
     * Returns commuters with account_status=PENDING, including their uploaded
     * valid ID (id_image_url), applied_type (the discount tier they requested),
     * and identifying fields so the admin can verify the ID matches the tier.
     */
    public function listPendingRegistrations(array $filters = []): LengthAwarePaginator
    {
        $perPage = max(1, min((int) ($filters['per_page'] ?? 15), 100));

        return User::where('role', UserRole::COMMUTER)
            ->whereHas('commuterProfile', function ($q) {
                $q->where('account_status', 'PENDING');
            })
            ->when($filters['applied_type'] ?? null, function (Builder $query, string $type) {
                $query->whereHas('commuterProfile', fn (Builder $profile) => $profile->where('applied_type', $type));
            })
            ->when($filters['search'] ?? null, function (Builder $query, string $search) {
                $this->applySearch($query, trim($search));
            })
            ->with(['commuterProfile:id,first_name,middle_name,surname,birthdate,gender,email,contact_number,commuter_type,applied_type,account_status,id_image_url,verified_at,rejection_reason,username,language_preference'])
            ->orderBy('created_at', 'asc') // oldest first — FIFO review queue
            ->paginate($perPage)
            ->through(function (User $user) {
                $c = $user->commuterProfile;
                $history = $this->registrationHistoryPayload($user->email, $c?->contact_number);
                return [
                    'id'              => $user->id,
                    'email'           => $user->email,
                    'first_name'      => $c?->first_name,
                    'middle_name'     => $c?->middle_name,
                    'surname'         => $c?->surname,
                    'birthdate'       => $c?->birthdate?->toDateString(),
                    'gender'          => $c?->gender,
                    'contact_number'  => $c?->contact_number,
                    'username'        => $c?->username,
                    'applied_type'    => $c?->applied_type,
                    'id_image_url'    => $this->registrationIdUrl($c?->id_image_url),
                    'account_status'  => $c?->account_status,
                    'language_preference' => $c?->language_preference,
                    'verified_at'     => $c?->verified_at?->toIso8601String(),
                    'rejection_reason'=> $c?->rejection_reason,
                    // How many times this applicant's identity (email/contact)
                    // has previously been rejected — surfaced so admins can spot
                    // repeat submissions approaching the cooldown threshold.
                    'rejection_count' => $this->registrationGuard->rejectionCountFor(
                        $user->email,
                        $c?->contact_number,
                    ),
                    'rejection_history' => $history['history'],
                    'blocked_until' => $history['blocked_until'],
                    'created_at'      => optional($user->created_at)->toIso8601String(),
                ];
            });
    }

    /**
     * GET /admin/registrations/rejected — list REJECTED commuter accounts.
     *
     * Rejected accounts are soft-deleted (their email is rewritten to
     * 'rejected+{timestamp}@chatco.local' so the canonical email frees up
     * for re-registration). We use withTrashed() to include them.
     *
     * Returns the same shape as listPendingRegistrations so the frontend
     * can reuse the RejectedUser table component.
     */
    public function listRejectedRegistrations(array $filters = []): LengthAwarePaginator
    {
        $perPage = max(1, min((int) ($filters['per_page'] ?? 15), 100));

        return User::withTrashed()
            ->where('role', UserRole::COMMUTER)
            ->whereHas('commuterProfile', function ($q) {
                $q->where('account_status', 'REJECTED');
            })
            ->when($filters['applied_type'] ?? null, function (Builder $query, string $type) {
                $query->whereHas('commuterProfile', fn (Builder $profile) => $profile->where('applied_type', $type));
            })
            ->when($filters['search'] ?? null, function (Builder $query, string $search) {
                $term = '%' . trim($search) . '%';
                $query->whereHas('commuterProfile', fn (Builder $profile) => $profile
                    ->where('first_name', 'like', $term)
                    ->orWhere('surname', 'like', $term)
                    ->orWhere('email', 'like', $term)
                    ->orWhere('contact_number', 'like', $term)
                    ->orWhere('rejection_reason', 'like', $term));
            })
            ->with(['commuterProfile:id,first_name,middle_name,surname,birthdate,gender,email,contact_number,commuter_type,applied_type,account_status,id_image_url,verified_at,rejection_reason,username,language_preference'])
            ->orderBy('updated_at', 'desc') // most recently rejected first
            ->paginate($perPage)
            ->through(function (User $user) {
                $c = $user->commuterProfile;
                $history = $this->registrationHistoryPayload($c?->email, $c?->contact_number);
                return [
                    'id'              => $user->id,
                    'email'           => $c?->email ?? $user->email,
                    'first_name'      => $c?->first_name,
                    'middle_name'     => $c?->middle_name,
                    'surname'         => $c?->surname,
                    'birthdate'       => $c?->birthdate?->toDateString(),
                    'gender'          => $c?->gender,
                    'contact_number'  => $c?->contact_number,
                    'username'        => $c?->username,
                    'applied_type'    => $c?->applied_type,
                    'id_image_url'    => $this->registrationIdUrl($c?->id_image_url),
                    'account_status'  => $c?->account_status,
                    'language_preference' => $c?->language_preference,
                    'verified_at'     => $c?->verified_at?->toIso8601String(),
                    'rejection_reason'=> $c?->rejection_reason,
                    'rejection_count' => count($history['history']),
                    'rejection_history' => $history['history'],
                    'blocked_until' => $history['blocked_until'],
                    'created_at'      => optional($user->created_at)->toIso8601String(),
                    'rejected_at'     => optional($user->deleted_at)->toIso8601String(),
                ];
            });
    }

    private function registrationHistoryPayload(?string $email, ?string $contact): array
    {
        $history = $this->registrationGuard->historyFor($email, $contact);
        $activeBlock = $history->first(
            fn ($rejection) => $rejection->blocked_until?->isFuture()
        );

        return [
            'history' => $history->map(fn ($rejection) => [
                'reason' => $rejection->reason,
                'attempt_number' => $rejection->attempt_number,
                'blocked_until' => $rejection->blocked_until?->toIso8601String(),
                'rejected_at' => $rejection->created_at?->toIso8601String(),
            ])->values()->all(),
            'blocked_until' => $activeBlock?->blocked_until?->toIso8601String(),
        ];
    }

    /**
     * Return a short-lived URL for a private registration ID.
     * Existing absolute URLs are retained for backwards compatibility.
     */
    private function registrationIdUrl(?string $path): ?string
    {
        if (! $path || filter_var($path, FILTER_VALIDATE_URL)) {
            return $path;
        }

        $disk = config('filesystems.uploads.private_id_disk', 'r2_private');

        if ($disk === 'r2_private') {
            return Storage::disk($disk)->temporaryUrl(
                $path,
                now()->addMinutes(10)
            );
        }

        return Storage::disk($disk)->url($path);
    }

    /**
     * GET /admin/users/{id}/activity — build a user activity timeline.
     *
     * Instead of a separate audit_logs table, this reuses existing data
     * sources to build a chronological timeline of the user's activity:
     *   - Account creation + verification (for commuters)
     *   - Recent transactions (for commuters with passenger_id bound)
     *   - Recent shift logs (for conductors)
     *   - Recent feedback received (for conductors/drivers)
     *
     * Each entry has: id, timestamp, action, details.
     */
    public function getUserActivity(string $id): array
    {
        $user = User::with(['commuterProfile', 'conductorProfile', 'adminProfile'])->find($id);

        if (! $user) {
            abort(404, 'User not found');
        }

        $events = [];

        // Account creation
        $events[] = [
            'id'        => 'created',
            'timestamp' => optional($user->created_at)->toIso8601String(),
            'action'    => 'Account Created',
            'details'   => "Role: {$user->role->value}",
        ];

        // Commuter-specific events
        if ($user->commuterProfile) {
            $c = $user->commuterProfile;

            if ($c->verified_at) {
                $events[] = [
                    'id'        => 'verified',
                    'timestamp' => $c->verified_at->toIso8601String(),
                    'action'    => 'Account Verified',
                    'details'   => "Commuter type: {$c->commuter_type}",
                ];
            }

            if ($c->account_status === 'REJECTED' && $c->rejection_reason) {
                $events[] = [
                    'id'        => 'rejected',
                    'timestamp' => optional($user->deleted_at)->toIso8601String(),
                    'action'    => 'Registration Rejected',
                    'details'   => "Reason: {$c->rejection_reason}",
                ];
            }

            // Recent transactions (payment history)
            $transactions = Transaction::where('passenger_id', $c->id)
                ->orderBy('created_at', 'desc')
                ->limit(10)
                ->get();

            foreach ($transactions as $txn) {
                $events[] = [
                    'id'        => "txn-{$txn->transaction_id}",
                    'timestamp' => optional($txn->created_at)->toIso8601String(),
                    'action'    => 'Payment',
                    'details'   => "{$txn->payment_method} ₱{$txn->final_amount} — {$txn->pickup_name} → {$txn->dropoff_name} ({$txn->status})",
                ];
            }
        }

        // Conductor-specific events
        if ($user->conductorProfile) {
            $shiftLogs = ShiftLog::where('conductor_id', $user->conductorProfile->id)
                ->orderBy('time_in', 'desc')
                ->limit(10)
                ->get();

            foreach ($shiftLogs as $log) {
                $events[] = [
                    'id'        => "shift-{$log->shift_id}",
                    'timestamp' => optional($log->time_in)->toIso8601String(),
                    'action'    => $log->status === 'ACTIVE' ? 'Shift Started' : 'Shift Ended',
                    'details'   => "Unit: {$log->unit_number} — {$log->driver_name}",
                ];
            }
        }

        // Sort all events by timestamp, newest first
        usort($events, function ($a, $b) {
            $ta = $a['timestamp'] ? strtotime($a['timestamp']) : 0;
            $tb = $b['timestamp'] ? strtotime($b['timestamp']) : 0;
            return $tb - $ta;
        });

        return $events;
    }

    /**
     * POST /admin/registrations/{id}/approve — approve a pending registration.
     *
     * - Copies applied_type → commuter_type (the validated discount tier)
     * - Sets verified_at = now
     * - Sets account_status = APPROVED
     * - Clears rejection_reason
     *
     * The commuter can now log in and receives that tier's fare discount.
     *
     * @throws ValidationException if the user is not a PENDING commuter
     */
    public function approveRegistration(string $id): array
    {
        $user = User::with('commuterProfile')->find($id);

        if (! $user || ! $user->commuterProfile) {
            abort(404, 'Registration not found.');
        }

        $profile = $user->commuterProfile;

        if ($profile->account_status !== 'PENDING') {
            throw ValidationException::withMessages([
                'account_status' => ['This registration has already been processed (status: ' . $profile->account_status . ').'],
            ]);
        }

        $profile->update([
            'commuter_type'     => $profile->applied_type ?? 'REGULAR',
            'account_status'    => 'APPROVED',
            'verified_at'       => now(),
            'rejection_reason'  => null,
        ]);

        $fresh = $profile->fresh();

        // Send approval email to the commuter (best-effort — don't fail
        // the approval if the email can't be sent).
        $this->sendApprovalEmail($user, $fresh);

        return [
            'id'              => $user->id,
            'email'           => $user->email,
            'name'            => $user->getDisplayName(),
            'commuter_type'   => $fresh->commuter_type,
            'applied_type'    => $fresh->applied_type,
            'account_status'  => 'APPROVED',
            'verified_at'     => $fresh->verified_at?->toIso8601String(),
            'rejection_reason'=> null,
        ];
    }

    /**
     * POST /admin/registrations/{id}/reject — reject a pending registration.
     *
     * - Sets account_status = REJECTED + rejection_reason
     * - SOFT-DELETES the user + profile so the email frees up for re-registration
     *   (per S5-T14: a previously rejected email can register again)
     *
     * @throws ValidationException if the user is not a PENDING commuter
     */
    public function rejectRegistration(string $id, string $reason): array
    {
        $user = User::with('commuterProfile')->find($id);

        if (! $user || ! $user->commuterProfile) {
            abort(404, 'Registration not found.');
        }

        $profile = $user->commuterProfile;

        if ($profile->account_status !== 'PENDING') {
            throw ValidationException::withMessages([
                'account_status' => ['This registration has already been processed (status: ' . $profile->account_status . ').'],
            ]);
        }

        // Record this rejection as a strike against the applicant's identity
        // (email + contact number) BEFORE the canonical email is rewritten.
        // Once the configured threshold is reached, this stamps a cooldown
        // (blocked_until) that AuthService::register / onsite store() enforce,
        // temporarily pausing re-registration. See App\Services\RegistrationGuard.
        $strike = $this->registrationGuard->recordRejection(
            email: $user->email,
            contact: $profile->contact_number,
            reason: $reason,
            rejectedUserId: $user->id,
            rejectedByAdminId: auth()->id(),
        );

        // Send rejection email to the commuter BEFORE rewriting the email
        // (best-effort — don't fail the rejection if the email can't be sent).
        // The strike carries the attempt number + any cooldown so the email can
        // tell the commuter whether they may re-register immediately.
        $this->sendRejectionEmail($user, $profile, $reason, $strike);

        // Rewrite the email to a unique placeholder BEFORE soft-deleting.
        // This frees the canonical email for re-registration (the users.email
        // column has a DB-level unique index that includes soft-deleted rows).
        // Key the placeholder on the user id (guaranteed unique) rather than a
        // timestamp — the same applicant can be rejected several times in quick
        // succession (they re-register between rejections), and a second-
        // precision timestamp would collide against the unique index.
        $placeholderEmail = 'rejected+' . $user->id . '@chatco.local';
        $user->update(['email' => $placeholderEmail]);

        // Free the username too. commuter_profiles.username has a DB-level
        // unique index, and the profile row is NOT soft-deleted (only the
        // User is), so the rejected applicant's username would otherwise stay
        // locked forever — blocking them (or anyone) from reusing it on a
        // fresh registration. Rewrite it to a unique placeholder keyed on the
        // user id (guaranteed unique, fits the 50-char column). The original
        // username isn't needed on a dead account — admins identify rejected
        // applicants by name/contact in the Rejected tab.
        $placeholderUsername = 'rejected_' . $user->id;

        $profile->update([
            'account_status'   => 'REJECTED',
            'rejection_reason' => $reason,
            'username'         => $placeholderUsername,
        ]);

        // Soft-delete the user (cascades to commuter_profile via shared PK).
        $user->delete();

        return [
            'id'               => $user->id,
            'email'            => $user->email, // placeholder
            'account_status'   => 'REJECTED',
            'rejection_reason' => $reason,
            'attempt_number'   => $strike->attempt_number,
            'blocked_until'    => $strike->blocked_until?->toIso8601String(),
        ];
    }

    // ── Email helpers ──────────────────────────────────────────────

    /**
     * Default body copy for the approval email, used when an admin has never
     * saved `account_approved_template`. Deliberately message-only: the fare
     * type, verification date, and login button are rendered as UI by the
     * Blade view, so repeating them here would just duplicate the email.
     *
     * Keep in sync with initialAccountApprovedTemplate in the frontend's
     * settings-data.ts — the settings page writes its own default to the DB
     * on the first save, and the two shouldn't disagree.
     */
    private const DEFAULT_APPROVED_TEMPLATE =
        "Hi {name},\n\n"
        . "Great news — we've reviewed the ID you submitted and your CHATCO commuter account is now approved and active.\n\n"
        . "Log in with the email and password you registered with, and you're ready to ride.";

    /** Default body copy for the rejection email. See DEFAULT_APPROVED_TEMPLATE. */
    private const DEFAULT_REJECTED_TEMPLATE =
        "Hi {name},\n\n"
        . "Thanks for signing up with CHATCO. We've finished reviewing the ID attached to your commuter registration, "
        . "and unfortunately we weren't able to approve it this time.";

    /**
     * Send an approval notification email to the commuter.
     *
     * The prose comes from the admin-editable `account_approved_template`
     * setting; AccountApprovedMail wraps it in the branded HTML shell. The
     * fare-type row is suppressed when the admin's own template already prints
     * the type, so the commuter never reads it twice.
     *
     * Best-effort: errors are logged but never thrown — a mail outage must not
     * roll back an approval the admin already committed.
     */
    private function sendApprovalEmail(User $user, $profile): void
    {
        try {
            $template = Setting::where('key', 'account_approved_template')->value('value')
                ?: self::DEFAULT_APPROVED_TEMPLATE;

            $commuterType = $this->commuterTypeLabel($profile->commuter_type ?? 'REGULAR');
            $name = trim($profile->first_name . ' ' . $profile->surname);

            // {commuterName} / {rejectionReason} are the names the admin
            // settings page advertises; {name} / {reason} are the originals.
            // Both are accepted so a template saved under either vocabulary
            // still renders — an unsubstituted "{commuterName}" would otherwise
            // ship straight to the commuter's inbox.
            $body = strtr($template, [
                '{name}'          => $name,
                '{commuterName}'  => $name,
                '{commuter_type}' => $commuterType,
                '{commuterType}'  => $commuterType,
            ]);

            Mail::to($user->email)->send(new AccountApprovedMail(
                body: $body,
                name: $name,
                email: $user->email,
                commuterType: $commuterType,
                verifiedAt: ($profile->verified_at ?? now())
                    ->timezone(config('app.timezone'))
                    ->format('M j, Y'),
                showCommuterType: ! $this->templateMentions($template, ['commuter_type', 'commuterType']),
            ));
        } catch (\Throwable $e) {
            Log::error('Failed to send approval email', [
                'error' => $e->getMessage(),
                'user_id' => $user->id,
            ]);
        }
    }

    /**
     * Send a rejection notification email to the commuter.
     *
     * Reads the `account_rejected_template` setting for the prose; the reason
     * callout, the "what to do next" block, and the cooldown banner are UI
     * rendered by AccountRejectedMail — each suppressed when the admin's
     * template already carries the matching placeholder inline.
     *
     * Best-effort: errors are logged but never thrown.
     */
    private function sendRejectionEmail(User $user, $profile, string $reason, ?\App\Models\RegistrationRejection $strike = null): void
    {
        try {
            $template = Setting::where('key', 'account_rejected_template')->value('value')
                ?: self::DEFAULT_REJECTED_TEMPLATE;

            // Tell the commuter what happens next: either re-register freely, or
            // (once the cooldown threshold is hit) wait out the pause.
            $isBlocked = (bool) ($strike && $strike->blocked_until);

            if ($isBlocked) {
                $retryDate = $strike->blocked_until
                    ->timezone(config('app.timezone'))
                    ->format('M j, Y \a\t g:i A');
                $nextSteps = "Because this registration has now been rejected {$strike->attempt_number} times, "
                    . "new sign-ups with this email or contact number are temporarily paused until {$retryDate} "
                    . "for security. Please try again after that date.";
            } else {
                $nextSteps = 'Fix what the reason above points to, then sign up again — there is no waiting period.';
            }

            $name = trim($profile->first_name . ' ' . $profile->surname);

            // See sendApprovalEmail() for why both placeholder vocabularies
            // are substituted.
            $body = strtr($template, [
                '{name}'            => $name,
                '{commuterName}'    => $name,
                '{reason}'          => $reason,
                '{rejectionReason}' => $reason,
                '{next_steps}'      => $nextSteps,
                '{nextSteps}'       => $nextSteps,
            ]);

            Mail::to($user->email)->send(new AccountRejectedMail(
                body: $body,
                reason: $reason,
                nextSteps: $nextSteps,
                isBlocked: $isBlocked,
                showReason: ! $this->templateMentions($template, ['reason', 'rejectionReason']),
                showNextSteps: ! $this->templateMentions($template, ['next_steps', 'nextSteps']),
            ));
        } catch (\Throwable $e) {
            Log::error('Failed to send rejection email', [
                'error' => $e->getMessage(),
                'user_id' => $user->id,
            ]);
        }
    }

    /**
     * Whether an admin's template already prints one of these placeholders.
     *
     * Drives the "don't say it twice" rule: if the prose contains {reason},
     * the email skips its own reason callout. Checked against the RAW template
     * (before substitution), since afterwards the placeholder is gone.
     *
     * @param  string[]  $placeholders  Names without braces.
     */
    private function templateMentions(string $template, array $placeholders): bool
    {
        foreach ($placeholders as $placeholder) {
            if (str_contains($template, '{' . $placeholder . '}')) {
                return true;
            }
        }

        return false;
    }

    /** Human-readable label for a fare tier, for display in emails. */
    private function commuterTypeLabel(string $type): string
    {
        return match (strtoupper($type)) {
            'STUDENT' => 'Student',
            'SENIOR'  => 'Senior citizen',
            'PWD'     => 'PWD',
            default   => 'Regular',
        };
    }
}
