<?php

namespace App\Services;

use App\Enums\UserRole;
use App\Models\Remittance;
use App\Models\ShiftLog;
use App\Models\User;
use App\Models\Vehicle;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Admin user-management business logic (S5-T3).
 *
 * Backs the admin Users screen: list (filter by role + search, paginated),
 * view, update, and soft-delete user accounts. There is intentionally NO
 * impersonation / user-switching capability here.
 *
 * Scope of "update": account_status (commuter suspend/reactivate),
 * contact_number (commuter) and the profile name. Role, email and password
 * are deliberately NOT editable through this endpoint:
 *   - role    : a true role change requires migrating to a different profile
 *               type (e.g. minting conductor credentials) — out of scope and
 *               unsafe to do generically; belongs in a dedicated flow.
 *   - email   : the login identity (unique, used by Sanctum) — immutable here.
 *   - password: never administrable; users rotate their own (S5-T1).
 */
class AdminService
{
    /** Account statuses an admin may toggle a commuter between. */
    private const ADMIN_TOGGLEABLE_STATUSES = ['ACTIVE', 'SUSPENDED'];

    /**
     * GET /admin/users — paginated, role-filterable, searchable list.
     *
     * Eager-loads the three profile relations in a fixed number of queries
     * (no N+1) and returns a presenter-mapped paginator so pagination meta is
     * preserved while secrets (password/token) never leave the service.
     *
     * @param  array{role?: string|null, search?: string|null, per_page?: int}  $filters
     */
    public function listUsers(array $filters): LengthAwarePaginator
    {
        $perPage = (int) ($filters['per_page'] ?? 15);
        $perPage = max(1, min($perPage, 100)); // clamp to protect the DB

        $query = User::query()
            ->with($this->profileEagerLoads())
            ->orderBy('created_at', 'desc');

        if (! empty($filters['role'])) {
            $query->where('role', $filters['role']);
        }

        if (! empty($filters['search'])) {
            $this->applySearch($query, trim($filters['search']));
        }

        return $query->paginate($perPage)
            ->withQueryString()
            ->through(fn (User $user) => $this->present($user));
    }

    /**
     * GET /admin/users/{id} — a single user with its profile.
     *
     * @return array<string, mixed>|null
     *
     * @throws ValidationException 404 is handled by the controller (null).
     */
    public function getUser(string $id): ?array
    {
        $user = User::with($this->profileEagerLoads())->find($id);

        return $user ? $this->present($user) : null;
    }

    /**
     * PUT /admin/users/{id} — update the editable profile fields.
     *
     * @param  array<string, mixed>  $data  validated whitelist from UpdateUserRequest
     * @return array<string, mixed>|null null when the user does not exist
     *
     * @throws ValidationException on business-rule violations (422)
     */
    public function updateUser(string $id, array $data, User $actingAdmin): ?array
    {
        $user = User::with($this->profileEagerLoads())->find($id);

        if (! $user) {
            return null;
        }

        $profile = $this->profileOf($user);

        if (! $profile) {
            // A user with no profile row is a data-integrity fault, not a
            // client error — surface it as 422 with a clear message.
            throw ValidationException::withMessages([
                'user' => ['This user has no profile and cannot be edited.'],
            ]);
        }

        // ── Name (applies to every role; commuter stores last name as `surname`) ──
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

        // ── Commuter-only fields ──
        $commuterOnly = array_intersect_key($data, array_flip(['account_status', 'contact_number']));

        if (! empty($commuterOnly) && ! $user->isCommuter()) {
            throw ValidationException::withMessages([
                'account_status' => ['Account status and contact number can only be set on commuter accounts.'],
            ]);
        }

        if (array_key_exists('account_status', $data)) {
            // Self-lockout guard (defensive — admins have no account_status,
            // but never let the acting admin suspend their own account).
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
     *
     * Guards: an admin cannot delete their own account, and the last remaining
     * active admin cannot be deleted (system would lose all admin access).
     *
     * @return bool false when the user does not exist
     *
     * @throws ValidationException on guard violations (422)
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

        $user->delete(); // soft delete — also locks the user out of auth

        return true;
    }

    // ── Internals ────────────────────────────────────────────────

    /**
     * Eager-load definitions selecting only the columns the presenter needs.
     * `id` is required on each relation for the hasOne(id -> id) hydrate.
     */
    private function profileEagerLoads(): array
    {
        return [
            'adminProfile:id,first_name,middle_name,last_name',
            'conductorProfile:id,first_name,middle_name,last_name,generated_username',
            'commuterProfile:id,first_name,middle_name,surname,contact_number,commuter_type,account_status,verified_at,username',
        ];
    }

    private function applySearch($query, string $term): void
    {
        $like = '%'.$term.'%';

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

    /**
     * Uniform user DTO for list/show/update responses. Commuter-only fields
     * (account_status, commuter_type, verified_at) are null for other roles.
     *
     * @return array<string, mixed>
     */
    private function present(User $user): array
    {
        $commuter = $user->commuterProfile;

        return [
            'id' => $user->id,
            'email' => $user->email,
            'role' => $user->role->value,
            'name' => $user->getDisplayName(),
            'account_status' => $commuter?->account_status,
            'commuter_type' => $commuter?->commuter_type,
            'contact_number' => $commuter?->contact_number,
            'verified_at' => optional($commuter?->verified_at)->toIso8601String(),
            'created_at' => optional($user->created_at)->toIso8601String(),
        ];
    }

    /**
     * Whether a status string is one an admin may toggle a commuter to.
     */
    public static function isToggleableStatus(string $status): bool
    {
        return in_array($status, self::ADMIN_TOGGLEABLE_STATUSES, true);
    }

    // ════════════════════════════════════════════════════════════════════
    // Fleet management — vehicles (S5-T4) & analytics (S5-T6)
    // ════════════════════════════════════════════════════════════════════

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
                'unit_number' => $data['unit_number'],
                'plate_number' => $data['plate_number'],
                'vehicle_type' => $data['vehicle_type'] ?? null,
                'route_id' => $data['route_id'] ?? null,
                'driver_id' => $data['driver_id'] ?? null,
                'conductor_id' => $data['conductor_id'] ?? null,
                'status' => $data['status'] ?? 'ACTIVE',
                'capacity_status' => $data['capacity_status'] ?? 'AVAILABLE',
            ])->fresh(['route', 'driver', 'conductor']);
        });
    }

    /**
     * Update an existing vehicle's mutable fields.
     *
     * @param  array  $data  Validated payload from UpdateVehicleRequest.
     *
     * @throws ModelNotFoundException If the vehicle doesn't exist.
     */
    public function updateVehicle(string $id, array $data): Vehicle
    {
        $vehicle = Vehicle::findOrFail($id);

        DB::transaction(function () use ($vehicle, $data) {
            $vehicle->update(array_filter([
                'unit_number' => $data['unit_number'] ?? null,
                'plate_number' => $data['plate_number'] ?? null,
                'vehicle_type' => array_key_exists('vehicle_type', $data) ? $data['vehicle_type'] : null,
                'route_id' => array_key_exists('route_id', $data) ? $data['route_id'] : null,
                'driver_id' => array_key_exists('driver_id', $data) ? $data['driver_id'] : null,
                'conductor_id' => array_key_exists('conductor_id', $data) ? $data['conductor_id'] : null,
                'status' => $data['status'] ?? null,
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
     * @throws ValidationException When the vehicle has an active shift.
     * @throws ModelNotFoundException If the vehicle doesn't exist.
     */
    public function deleteVehicle(string $id): void
    {
        $vehicle = Vehicle::findOrFail($id);

        if ($vehicle->active_shift_id) {
            throw ValidationException::withMessages([
                'vehicle' => [
                    'Cannot delete a vehicle that is currently on an active shift. '.
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
                'date' => $row->date,
                'cash' => (float) $row->cash,
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
                'to' => $dateTo->toDateString(),
                'days' => (int) $dateFrom->diffInDays($dateTo) + 1,
            ],
            'totals' => [
                'total_fares' => $cashTotal + $gcashTotal,
                'cash_total' => $cashTotal,
                'gcash_total' => $gcashTotal,
                'paid_count' => $paidCount,
                'pending_count' => $pendingCount,
                'total_passengers' => $totalPassengers,
            ],
            'payment_split' => $paymentSplit,
            'daily_series' => $dailySeries,
            'remittances' => [
                'total_remitted' => $totalRemitted,
                'total_collected' => $totalCollected,
                'total_shortage' => $totalShortage,
                'count' => $remittanceCount,
            ],
            'fleet' => [
                'active_vehicles' => $activeVehicles,
                'total_vehicles' => $totalVehicles,
                'active_conductors' => $activeConductors,
                'total_conductors' => $totalConductors,
            ],
        ];
    }

    /**
     * Live fleet monitoring — real-time positions of all active vehicles.
     *
     * Aggregates the latest vehicle_locations row + the active shift +
     * conductor/driver/route for every vehicle that currently has an
     * active_shift_id. Read-only — the admin dashboard polls this every
     * 5 seconds (same cadence as the commuter map).
     *
     * Staleness: any vehicle whose location has not updated in 10 minutes
     * is flagged with `is_stale = true` so the UI can visually distinguish
     * it. The `updated_at` of the location row is always returned so the
     * UI can compute its own staleness window if desired.
     *
     * No distance filter — all active units are returned (matches the
     * all-units-visible rule from the commuter map).
     *
     * @return array{
     *     generated_at: string,
     *     active_count: int,
     *     stale_count: int,
     *     vehicles: array<int, array{
     *         vehicle_id: string,
     *         unit_number: string|null,
     *         plate_number: string|null,
     *         vehicle_type: string|null,
     *         lat: string|null,
     *         lng: string|null,
     *         speed: string|null,
     *         heading: string|null,
     *         capacity_status: string,
     *         conductor_id: string|null,
     *         conductor_name: string|null,
     *         driver_name: string|null,
     *         route_name: string|null,
     *         shift_id: string|null,
     *         shift_started_at: string|null,
     *         location_updated_at: string|null,
     *         is_stale: bool
     *     }>
     * }
     */
    public function monitoring(): array
    {
        $staleThreshold = Carbon::now()->subMinutes(10);

        // Active vehicles = those with an active_shift_id (set when the
        // conductor starts a shift, cleared when they remit). We eager-load
        // the location + shift + relations to avoid N+1 on the fleet list.
        $vehicles = Vehicle::query()
            ->whereNotNull('active_shift_id')
            ->with([
                'currentLocation',
                'route',
                'driver',
                'conductor',
            ])
            ->get();

        $result = $vehicles->map(function (Vehicle $vehicle) use ($staleThreshold) {
            $location = $vehicle->currentLocation;
            $shift = $vehicle->activeShift;

            // Stale = location row missing OR location.updated_at older
            // than 10 minutes. A missing location row means the vehicle
            // started a shift but never sent a GPS ping — treat as stale.
            $locationUpdatedAt = $location?->updated_at;
            $isStale = $location === null
                || $locationUpdatedAt === null
                || $locationUpdatedAt->lt($staleThreshold);

            // Conductor name: prefer the shift_logs denormalized name
            // (set at shift start, always populated), fall back to the
            // conductor profile if available.
            $conductorName = $shift?->conductor_name;
            if ($conductorName === null && $vehicle->conductor) {
                $conductorName = trim(
                    ($vehicle->conductor->first_name ?? '').' '.
                    ($vehicle->conductor->last_name ?? '')
                ) ?: null;
            }

            return [
                'vehicle_id' => $vehicle->id,
                'unit_number' => $vehicle->unit_number,
                'plate_number' => $vehicle->plate_number,
                'vehicle_type' => $vehicle->vehicle_type,
                'lat' => $location?->lat !== null ? (string) $location->lat : null,
                'lng' => $location?->lng !== null ? (string) $location->lng : null,
                'speed' => $location?->speed !== null ? (string) $location->speed : null,
                'heading' => $location?->heading !== null ? (string) $location->heading : null,
                'capacity_status' => $location?->capacity_status?->value ?? 'AVAILABLE',
                'conductor_id' => $vehicle->conductor_id ?? $location?->conductor_id,
                'conductor_name' => $conductorName,
                'driver_name' => $shift?->driver_name ?? ($vehicle->driver ? trim(
                    ($vehicle->driver->first_name ?? '').' '.
                    ($vehicle->driver->last_name ?? '')
                ) : null),
                'route_name' => $vehicle->route?->name,
                'shift_id' => $vehicle->active_shift_id,
                'shift_started_at' => $shift?->time_in?->toDateTimeString(),
                'location_updated_at' => $locationUpdatedAt?->toDateTimeString(),
                'is_stale' => $isStale,
            ];
        })->values()->toArray();

        return [
            'generated_at' => Carbon::now()->toDateTimeString(),
            'active_count' => count($result),
            'stale_count' => count(array_filter($result, fn ($v) => $v['is_stale'])),
            'vehicles' => $result,
        ];
    }
}
