<?php

namespace App\Services;

use App\Enums\ActivityLogCategory;
use App\Models\ActivityLog;
use App\Models\User;
use BackedEnum;
use DateTimeInterface;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

/**
 * Audit trail — one row per admin action, commuter account change, or
 * automatic system event (shift auto-end, SOS raised, items expired…).
 *
 * record() is mostly called from the controller layer right after a mutating
 * action succeeds, where $request->user() is the actor. System events pass no
 * actor and show as "System". It never throws: a logging failure must never
 * break the real action that triggered it.
 */
class ActivityLogService
{
    /** Values for the "Done by" filter; SYSTEM is an entry with no actor. */
    public const ACTOR_ROLES = ['ADMIN', 'COMMUTER', 'CONDUCTOR', 'SYSTEM'];

    /** Most rows one export returns; the response also carries the full count. */
    public const EXPORT_LIMIT = 5000;

    /** A changed value longer than this (e.g. an email template) is shortened. */
    private const CHANGE_VALUE_LIMIT = 200;

    /**
     * @param  list<array{field: string, from: ?string, to: ?string}>  $changes
     *         Before/after values, usually from diff().
     */
    public function record(ActivityLogCategory $category, string $description, ?User $actor = null, array $changes = []): void
    {
        try {
            ActivityLog::create([
                'category' => $category->value,
                'description' => Str::limit($description, 500, ''),
                'changes' => $changes === [] ? null : $changes,
                'actor_id' => $actor?->id,
                'actor_name' => $actor?->getDisplayName(),
                'actor_role' => $actor ? $actor->role->value : 'SYSTEM',
            ]);
        } catch (\Throwable $e) {
            Log::error('ActivityLogService::record failed', [
                'category' => $category->value,
                'description' => $description,
                'actor_id' => $actor?->id,
                'exception' => $e->getMessage(),
            ]);
        }
    }

    /**
     * Field-level changes between two snapshots of the same record.
     *
     * $fields maps each snapshot key to the label admins see ("contact" =>
     * "Contact number"); keys missing from $fields are ignored, so a snapshot
     * can carry extra data. Values are compared after normalizing (dates,
     * booleans, enums, "17" vs "17.00"), so only real changes are returned.
     *
     * @param  array<string, mixed>  $before
     * @param  array<string, mixed>  $after
     * @param  array<string, string>  $fields
     * @return list<array{field: string, from: ?string, to: ?string}>
     */
    public static function diff(array $before, array $after, array $fields): array
    {
        $changes = [];
        foreach ($fields as $key => $label) {
            $from = self::displayValue($before[$key] ?? null);
            $to = self::displayValue($after[$key] ?? null);
            if (! self::sameValue($from, $to)) {
                $changes[] = ['field' => $label, 'from' => $from, 'to' => $to];
            }
        }

        return $changes;
    }

    /**
     * Where a change to someone's own account belongs: an admin's under
     * Admin Account, a commuter's under Members, a conductor's under
     * Personnel — the same categories admins already filter those people by.
     */
    public static function accountCategory(User $user): ActivityLogCategory
    {
        return match (true) {
            $user->isAdmin() => ActivityLogCategory::ACCOUNT,
            $user->isConductor() => ActivityLogCategory::PERSONNEL,
            default => ActivityLogCategory::MEMBER,
        };
    }

    /** "Status, Contact number" — the changed field labels, for a description. */
    public static function changedFields(array $changes): string
    {
        return implode(', ', array_column($changes, 'field'));
    }

    public function listForAdmin(array $filters, int $perPage = 30): LengthAwarePaginator
    {
        return $this->adminListQuery($filters)->paginate($perPage);
    }

    /**
     * Every row matching the filters, newest first, capped at EXPORT_LIMIT.
     *
     * @return array{data: Collection<int, ActivityLog>, total: int}
     */
    public function exportForAdmin(array $filters): array
    {
        $query = $this->adminListQuery($filters);

        return [
            'data' => (clone $query)->limit(self::EXPORT_LIMIT)->get(),
            'total' => $query->toBase()->getCountForPagination(),
        ];
    }

    /**
     * Supports ?category= (exact match); ?search= (matches the activity
     * description OR the actor's name); ?actor_role= (ADMIN, COMMUTER,
     * CONDUCTOR or SYSTEM); ?date= (an exact Y-m-d) for the date-picker; and
     * ?date_range= (today/last_7_days/last_30_days/all) for the quick-range
     * dropdown. The two date filters are mutually exclusive on the frontend,
     * but if both somehow arrive, the exact ?date= wins since it's the more
     * specific ask.
     */
    private function adminListQuery(array $filters): Builder
    {
        // Actions can share a timestamp; the ID keeps page boundaries stable.
        $query = ActivityLog::query()->orderByDesc('created_at')->orderByDesc('id');

        if (! empty($filters['category'])) {
            $query->where('category', $filters['category']);
        }

        if (! empty($filters['actor_role']) && in_array($filters['actor_role'], self::ACTOR_ROLES, true)) {
            $query->where('actor_role', $filters['actor_role']);
        }

        if (! empty($filters['search'])) {
            $search = $filters['search'];
            $query->where(function ($q) use ($search) {
                $q->where('description', 'like', "%{$search}%")
                  ->orWhere('actor_name', 'like', "%{$search}%");
            });
        }

        if (! empty($filters['date'])) {
            $query->whereDate('created_at', $filters['date']);
        } else {
            $bounds = $this->dateRangeBounds($filters['date_range'] ?? null);
            if ($bounds !== null) {
                $query->whereBetween('created_at', $bounds);
            }
        }

        return $query;
    }

    /**
     * Resolve a named date-range filter into a [start, end] Carbon pair for
     * whereBetween. Deliberately NOT the same set as AnnouncementService's
     * dateRangeBounds() (today/last_7_days/this_month) — this page's own
     * quick-range dropdown offers last_30_days instead of this_month.
     * Returns null for 'all' (or anything unrecognized) so the caller
     * applies no filter.
     */
    private function dateRangeBounds(?string $range): ?array
    {
        $now = now();

        return match ($range) {
            'today' => [$now->copy()->startOfDay(), $now->copy()->endOfDay()],
            'last_7_days' => [$now->copy()->subDays(6)->startOfDay(), $now->copy()->endOfDay()],
            'last_30_days' => [$now->copy()->subDays(29)->startOfDay(), $now->copy()->endOfDay()],
            default => null,
        };
    }

    /** A value as admins read it: null for empty, text otherwise. */
    private static function displayValue(mixed $value): ?string
    {
        if ($value instanceof BackedEnum) {
            $value = $value->value;
        }
        if ($value === null || $value === '' || $value === []) {
            return null;
        }
        if (is_bool($value)) {
            return $value ? 'Yes' : 'No';
        }
        if ($value instanceof DateTimeInterface) {
            return $value->format('H:i:s') === '00:00:00'
                ? $value->format('Y-m-d')
                : $value->format('Y-m-d H:i');
        }
        if (is_array($value)) {
            $value = implode(', ', array_map(fn ($item) => is_scalar($item) ? (string) $item : json_encode($item), $value));
        }

        return Str::limit(trim((string) $value), self::CHANGE_VALUE_LIMIT);
    }

    /** "17" and "17.00" are the same fare; anything else compares as text. */
    private static function sameValue(?string $a, ?string $b): bool
    {
        if (is_numeric($a) && is_numeric($b)) {
            return (float) $a === (float) $b;
        }

        return $a === $b;
    }
}
