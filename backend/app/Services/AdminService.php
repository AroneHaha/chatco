<?php

namespace App\Services;

use App\Enums\UserRole;
use App\Models\User;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
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
     * @throws ValidationException 404 is handled by the controller (null).
     * @return array<string, mixed>|null
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
     * @return array<string, mixed>|null    null when the user does not exist
     *
     * @throws ValidationException  on business-rule violations (422)
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
     * @throws ValidationException  on guard violations (422)
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
            'id'             => $user->id,
            'email'          => $user->email,
            'role'           => $user->role->value,
            'name'           => $user->getDisplayName(),
            'account_status' => $commuter?->account_status,
            'commuter_type'  => $commuter?->commuter_type,
            'contact_number' => $commuter?->contact_number,
            'verified_at'    => optional($commuter?->verified_at)->toIso8601String(),
            'created_at'     => optional($user->created_at)->toIso8601String(),
        ];
    }

    /**
     * Whether a status string is one an admin may toggle a commuter to.
     */
    public static function isToggleableStatus(string $status): bool
    {
        return in_array($status, self::ADMIN_TOGGLEABLE_STATUSES, true);
    }
}
