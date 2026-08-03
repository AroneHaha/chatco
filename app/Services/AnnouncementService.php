<?php

namespace App\Services;

use App\Models\Announcement;
use App\Models\AnnouncementRead;
use App\Models\User;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
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
     */
    public function listForAdmin(array $filters, int $perPage = 15): LengthAwarePaginator
    {
        $query = Announcement::with('creator')
            ->orderByDesc('created_at');

        if (! empty($filters['status'])) {
            $query->where('status', $filters['status']);
        }

        return $query->paginate($perPage);
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
        return Announcement::create([
            'title'      => $data['title'],
            'message'    => $data['message'],
            'type'       => $data['type'] ?? null,
            'status'     => $data['status'] ?? self::STATUS_ACTIVE,
            'created_by' => $admin->id,
        ]);
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
     * already-archived item is a no-op.
     */
    public function archive(string $id): Announcement
    {
        $announcement = $this->show($id);

        if ($announcement->status !== self::STATUS_ARCHIVED) {
            $announcement->update(['status' => self::STATUS_ARCHIVED]);
        }

        return $announcement->fresh('creator');
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
     */
    public function unreadCount(User $user): int
    {
        return Announcement::where('status', self::STATUS_ACTIVE)
            ->where(function ($q) use ($user) {
                $q->whereNull('user_id')->orWhere('user_id', $user->id);
            })
            ->whereNotExists(function ($query) use ($user) {
                $query->select(DB::raw(1))
                      ->from('announcement_reads')
                      ->whereColumn('announcement_reads.announcement_id', 'announcements.id')
                      ->where('announcement_reads.user_id', $user->id);
            })
            ->count();
    }
}
