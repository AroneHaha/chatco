<?php

namespace App\Services;

use App\Enums\ActivityLogCategory;
use App\Models\ActivityLog;
use App\Models\User;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

/**
 * Admin audit trail — one row per admin-mutating action across the panel.
 *
 * record() is called from the controller layer (not threaded through every
 * service method) right after each mutating action succeeds — every admin
 * route already sits behind auth:sanctum+role:ADMIN, so $request->user() is
 * always available there regardless of whether the underlying service
 * method accepts an actor param. It never throws: a logging failure must
 * never break the real admin action that triggered it.
 */
class ActivityLogService
{
    public function record(ActivityLogCategory $category, string $description, ?User $actor = null): void
    {
        try {
            ActivityLog::create([
                'category' => $category->value,
                'description' => Str::limit($description, 500, ''),
                'actor_id' => $actor?->id,
                'actor_name' => $actor?->getDisplayName(),
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

    public function listForAdmin(array $filters, int $perPage = 30): LengthAwarePaginator
    {
        return $this->adminListQuery($filters)->paginate($perPage);
    }

    /**
     * Supports ?category= (exact match); ?search= (matches the activity
     * description OR the admin's name — the search box's placeholder reads
     * "Search activity or admin name…"); ?date= (an exact Y-m-d) for the
     * date-picker; and ?date_range= (today/last_7_days/last_30_days/all) for
     * the quick-range dropdown. The two date filters are mutually exclusive
     * on the frontend, but if both somehow arrive, the exact ?date= wins
     * since it's the more specific ask.
     */
    private function adminListQuery(array $filters): Builder
    {
        $query = ActivityLog::query()->orderByDesc('created_at');

        if (! empty($filters['category'])) {
            $query->where('category', $filters['category']);
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
}
