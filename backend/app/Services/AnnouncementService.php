<?php

namespace App\Services;

use App\Events\AnnouncementCreated;
use App\Models\Announcement;
use App\Models\AnnouncementRead;
use App\Models\User;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Support\Facades\DB;

/**
 * Sprint 6 (T4) — Announcements business logic.
 *
 * Admin CRUD:
 *   - create(admin, data)   → publishes a new announcement (status=ACTIVE)
 *   - update(admin, id, data) → partial update (title/message/type/status)
 *   - archive(admin, id)    → status=ARCHIVED (idempotent)
 *   - listForAdmin(filters) → all announcements (incl. ARCHIVED) for admin QA
 *
 * User-facing (any authenticated role):
 *   - listForUser(user, filters) → ACTIVE announcements with is_read flag
 *   - markRead(user, id)         → upsert announcement_reads (idempotent)
 *   - unreadCount(user)          → count for the bell badge
 *
 * The is_read flag is resolved per-authenticated-user via a leftJoin on
 * announcement_reads — not via a model accessor — so pagination stays
 * efficient.
 */
class AnnouncementService
{
    private const STATUS_ACTIVE   = 'ACTIVE';
    private const STATUS_ARCHIVED = 'ARCHIVED';

    /** How long an ARCHIVED announcement stays before pruneArchived() soft-deletes it. */
    private const ARCHIVE_RETENTION_DAYS = 30;

    /**
     * User-facing feed: ACTIVE announcements, newest first, with is_read.
     * Includes broadcasts (user_id IS NULL) plus rows targeted at this user.
     * Supports ?unread_only=1 to filter to unread only.
     */
    public function listForUser(User $user, array $filters, int $perPage = 15): LengthAwarePaginator
    {
        $query = Announcement::where('status', self::STATUS_ACTIVE)
            ->where(function ($q) use ($user) {
                $q->whereNull('announcements.user_id')
                  ->orWhere('announcements.user_id', $user->id);
            })
            ->select('announcements.*')
            ->selectRaw(
                'CASE WHEN announcement_reads.user_id IS NOT NULL THEN 1 ELSE 0 END AS is_read'
            )
            ->leftJoin('announcement_reads', function ($join) use ($user) {
                $join->on('announcements.id', '=', 'announcement_reads.announcement_id')
                     ->where('announcement_reads.user_id', '=', $user->id);
            })
            ->orderByDesc('announcements.created_at');

        if (! empty($filters['unread_only'])) {
            $query->whereNull('announcement_reads.user_id');
        }

        $paginator = $query->paginate($perPage);

        // Cast is_read to bool for clean JSON output.
        $paginator->getCollection()->transform(function (Announcement $item) {
            $item->is_read = (bool) ($item->is_read ?? false);
            return $item;
        });

        return $paginator;
    }

    /**
     * Admin list: ALL announcements (incl. ARCHIVED) for QA review.
     * Supports ?search= (matches title or message) so search stays correct
     * across pages instead of being limited to whatever page is loaded;
     * ?date= (an exact Y-m-d) for the date-picker; and ?date_range=
     * (today/last_7_days/this_month/all) for the quick-range dropdown. The
     * two date filters are mutually exclusive on the frontend, but if both
     * somehow arrive, the exact ?date= wins since it's the more specific ask.
     */
    public function listForAdmin(array $filters, int $perPage = 15): LengthAwarePaginator
    {
        return $this->adminListQuery($filters)
            ->with('creator')
            ->paginate($perPage);
    }

    /**
     * Count admin-list rows using the same filters as listForAdmin(), without
     * eager-loading the creator relation or fetching a page of rows — powers
     * the admin header's Active/Archived totals, which previously ran a full
     * paginate(1) (count query + row query + creator eager-load) per number.
     */
    public function countForAdmin(array $filters): int
    {
        return $this->adminListQuery($filters)->count();
    }

    /**
     * Shared filter logic for the admin list + its count. Supports ?search=
     * (matches title or message) so search stays correct across pages
     * instead of being limited to whatever page is loaded; ?date= (an exact
     * Y-m-d) for the date-picker; and ?date_range= (today/last_7_days/
     * this_month/all) for the quick-range dropdown. The two date filters are
     * mutually exclusive on the frontend, but if both somehow arrive, the
     * exact ?date= wins since it's the more specific ask.
     */
    private function adminListQuery(array $filters): Builder
    {
        $query = Announcement::query()->orderByDesc('created_at');

        if (! empty($filters['status'])) {
            $query->where('status', $filters['status']);
        }

        if (! empty($filters['type'])) {
            $query->where('type', $filters['type']);
        }

        if (! empty($filters['search'])) {
            $search = $filters['search'];
            $query->where(function ($q) use ($search) {
                $q->where('title', 'like', "%{$search}%")
                  ->orWhere('message', 'like', "%{$search}%");
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
     * Resolve a named date-range filter (as used by the admin announcements
     * dropdown) into a [start, end] Carbon pair for whereBetween. Mirrors
     * AdminService::fleetShiftHistoryRangeBounds()'s today/last_7_days/
     * this_month semantics. Returns null for 'all' (or anything unrecognized)
     * so the caller applies no filter.
     */
    private function dateRangeBounds(?string $range): ?array
    {
        $now = now();

        return match ($range) {
            'today' => [$now->copy()->startOfDay(), $now->copy()->endOfDay()],
            'last_7_days' => [$now->copy()->subDays(6)->startOfDay(), $now->copy()->endOfDay()],
            'this_month' => [$now->copy()->startOfMonth(), $now->copy()->endOfMonth()],
            default => null,
        };
    }

    public function show(string $id): Announcement
    {
        try {
            return Announcement::with('creator')->findOrFail($id);
        } catch (ModelNotFoundException) {
            throw new \RuntimeException('Announcement not found');
        }
    }

    public function create(User $admin, array $data): Announcement
    {
        $announcement = Announcement::create([
            'title'      => $data['title'],
            'message'    => $data['message'],
            'type'       => $data['type'] ?? null,
            'status'     => $data['status'] ?? self::STATUS_ACTIVE,
            'created_by' => $admin->id,
        ]);

        // Only ACTIVE, broadcast-to-everyone announcements are worth pushing
        // in real time — an admin creating one pre-archived (rare, but the
        // 'status' field allows it) shouldn't ping every commuter's feed.
        if ($announcement->status === self::STATUS_ACTIVE) {
            event(new AnnouncementCreated($announcement));
        }

        return $announcement;
    }

    /**
     * System-generated, single-recipient announcement (e.g. a Lost & Found
     * claim status update). Not part of the admin CRUD surface — callers are
     * other services, not controllers.
     */
    public function notifyUser(string $userId, string $type, string $title, string $message): Announcement
    {
        return Announcement::create([
            'user_id' => $userId,
            'type'    => $type,
            'title'   => $title,
            'message' => $message,
            'status'  => self::STATUS_ACTIVE,
        ]);
    }

    public function update(string $id, array $data): Announcement
    {
        $announcement = $this->show($id);

        $announcement->update(array_filter($data, fn ($v) => $v !== null, ARRAY_FILTER_USE_KEY));

        return $announcement->fresh('creator');
    }

    /**
     * Archive an announcement (status=ARCHIVED). Idempotent — archiving an
     * already-archived item is a no-op, so `archived_at` keeps its original
     * timestamp rather than resetting the 30-day retention clock.
     */
    public function archive(string $id): Announcement
    {
        $announcement = $this->show($id);

        if ($announcement->status !== self::STATUS_ARCHIVED) {
            $announcement->update([
                'status' => self::STATUS_ARCHIVED,
                'archived_at' => now(),
            ]);
        }

        return $announcement->fresh('creator');
    }

    /**
     * Soft-delete ARCHIVED announcements whose 30-day retention window has
     * passed. Called by the `announcements:prune-archived` scheduled command
     * (daily). Soft-delete only — rows stay recoverable in the database, they
     * just drop out of every query (admin list included) via the model's
     * SoftDeletes trait.
     */
    public function pruneArchived(): int
    {
        $cutoff = now()->subDays(self::ARCHIVE_RETENTION_DAYS);

        return Announcement::where('status', self::STATUS_ARCHIVED)
            ->where('archived_at', '<', $cutoff)
            ->delete();
    }

    /**
     * Mark an announcement as read for the authenticated user. Idempotent —
     * re-reading just refreshes read_at.
     */
    public function markRead(User $user, string $id): void
    {
        // Verify the announcement exists + is ACTIVE (can't read an archived one).
        $announcement = $this->show($id);

        DB::table('announcement_reads')->upsert(
            [
                'announcement_id' => $announcement->id,
                'user_id'         => $user->id,
                'read_at'         => now(),
            ],
            ['announcement_id', 'user_id'],
            ['read_at']
        );
    }

    /**
     * Count of ACTIVE announcements the user has NOT read — for the bell badge.
     * Includes broadcasts (user_id IS NULL) plus rows targeted at this user.
     *
     * @param  array  $types  Optional — when non-empty, scopes the count to
     *   these `type` values (e.g. the Lost & Found claim-update badge passes
     *   ['claim_approved', 'claim_rejected', 'claim_released']).
     */
    public function unreadCount(User $user, array $types = []): int
    {
        return $this->unreadQuery($user, $types)->count();
    }

    /**
     * Mark every currently-unread ACTIVE announcement visible to the user as
     * read, optionally scoped to `$types` (e.g. only the Lost & Found
     * claim-update rows when the commuter opens the Claims tab). A single
     * bulk insert rather than one upsert per row — correct even when there
     * are more unread rows than any single feed page holds.
     *
     * @return int  The number of rows newly marked as read.
     */
    public function markAllRead(User $user, array $types = []): int
    {
        $ids = $this->unreadQuery($user, $types)->pluck('announcements.id');

        if ($ids->isEmpty()) {
            return 0;
        }

        $now = now();
        DB::table('announcement_reads')->insertOrIgnore(
            $ids->map(fn (string $id) => [
                'announcement_id' => $id,
                'user_id' => $user->id,
                'read_at' => $now,
            ])->all()
        );

        return $ids->count();
    }

    /** Shared "ACTIVE, visible to $user, not yet read, optionally type-filtered" query. */
    private function unreadQuery(User $user, array $types = []): Builder
    {
        $query = Announcement::where('status', self::STATUS_ACTIVE)
            ->where(function ($q) use ($user) {
                $q->whereNull('user_id')->orWhere('user_id', $user->id);
            })
            ->whereNotExists(function ($query) use ($user) {
                $query->select(DB::raw(1))
                      ->from('announcement_reads')
                      ->whereColumn('announcement_reads.announcement_id', 'announcements.id')
                      ->where('announcement_reads.user_id', $user->id);
            });

        if (! empty($types)) {
            $query->whereIn('type', $types);
        }

        return $query;
    }
}
