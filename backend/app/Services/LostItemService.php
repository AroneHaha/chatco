<?php

namespace App\Services;

use App\Models\Claim;
use App\Models\CommuterProfile;
use App\Models\LostItem;
use App\Models\LostItemPhoto;
use App\Models\LostItemWatchlist;
use App\Models\User;
use App\Support\LostFound\LostFoundException;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

/**
 * Sprint 6 (T3) — Lost & Found business logic.
 *
 * Item lifecycle (status column on lost_items):
 *   AVAILABLE  → item reported by admin, no claims yet (or all claims rejected)
 *   CLAIMED    → at least one PENDING claim exists
 *   APPROVED   → a claim was APPROVED; awaiting handover (release)
 *   RELEASED   → an APPROVED claim was released; released_to + released_at set
 *   CLOSED     → admin closes the item after handover is complete
 *   EXPIRED    → AVAILABLE for EXPIRY_DAYS with no claim; auto-archived by
 *                `lost-items:expire` (reactivate() can bring it back)
 *
 * Claim lifecycle (status column on claims):
 *   PENDING    → submitted by a commuter, awaiting admin review
 *   APPROVED   → admin approved; awaiting release (handover)
 *   REJECTED   → admin rejected (from PENDING or APPROVED); rejection_reason recorded
 *
 * Two-stage approve workflow (revised S6 scope):
 *   1. Admin reviews claim: approve OR reject (PENDING → APPROVED/REJECTED)
 *   2. If approved: admin releases the item (APPROVED → RELEASED) OR may reject
 *      if something later invalidates the approval (APPROVED → REJECTED).
 *
 * State-transition guards throw LostFoundException → mapped to 422/409 in
 * the controller. All mutations run inside a DB transaction to keep the
 * item + claim + auto-reject side-effects atomic.
 */
class LostItemService
{
    private const ITEM_AVAILABLE = 'AVAILABLE';
    private const ITEM_CLAIMED = 'CLAIMED';
    private const ITEM_APPROVED = 'APPROVED';
    private const ITEM_RELEASED = 'RELEASED';
    private const ITEM_CLOSED = 'CLOSED';
    private const ITEM_EXPIRED = 'EXPIRED';

    private const CLAIM_PENDING = 'PENDING';
    private const CLAIM_APPROVED = 'APPROVED';
    private const CLAIM_REJECTED = 'REJECTED';

    /** Days an AVAILABLE, unclaimed item can sit before lost-items:expire archives it. */
    public const EXPIRY_DAYS = 30;

    /** Max photos per item (position 0-2; 0 is the thumbnail). */
    private const MAX_PHOTOS = 3;

    public function __construct(
        private readonly AnnouncementService $announcementService,
    ) {}

    /**
     * Paginated browse list for any authenticated role.
     * Filters: status, category, search (item_name/description).
     * Eager-loads vehicle. Does NOT expose claimant info (privacy).
     */
    public function listItems(array $filters, int $perPage = 15): LengthAwarePaginator
    {
        $query = LostItem::with(['vehicle', 'photos'])
            // Expired items are archived, not deleted — they stay visible to
            // admins under a dedicated filter, but drop out of the commuter
            // browse list entirely (nothing to claim, nothing to see).
            ->where('status', '!=', self::ITEM_EXPIRED)
            ->orderByDesc('created_at');

        if (! empty($filters['status'])) {
            $query->where('status', $filters['status']);
        }
        if (! empty($filters['category'])) {
            $query->where('category', $filters['category']);
        }
        if (! empty($filters['search'])) {
            $search = $filters['search'];
            $query->where(function ($q) use ($search) {
                $q->where('item_name', 'like', "%{$search}%")
                    ->orWhere('description', 'like', "%{$search}%");
            });
        }

        return $query->paginate($perPage);
    }

    /**
     * Admin list — includes claims + releasedTo for full audit visibility.
     *
     * `status` filters to a single exact status (existing behaviour).
     * `statuses` (array) filters to any of several — powers the admin
     * "History" tab (RELEASED + CLOSED) without a dedicated endpoint.
     */
    public function listForAdmin(array $filters, int $perPage = 15): LengthAwarePaginator
    {
        $query = LostItem::with(['vehicle', 'photos', 'claims.claimant', 'releasedTo', 'closedBy'])
            ->orderByDesc('created_at');

        if (! empty($filters['status'])) {
            $query->where('status', $filters['status']);
        }
        if (! empty($filters['statuses']) && is_array($filters['statuses'])) {
            $query->whereIn('status', $filters['statuses']);
        }
        if (! empty($filters['category'])) {
            $query->where('category', $filters['category']);
        }

        return $query->paginate($perPage);
    }

    public function show(string $itemId): LostItem
    {
        try {
            return LostItem::with(['vehicle', 'photos', 'claims.claimant', 'releasedTo', 'closedBy'])->findOrFail($itemId);
        } catch (ModelNotFoundException) {
            throw LostFoundException::notFound('Item');
        }
    }

    /**
     * Admin creates a lost item. Status starts as AVAILABLE.
     */
    public function create(User $admin, array $data): LostItem
    {
        return LostItem::create([
            'item_name' => $data['item_name'],
            'description' => $data['description'],
            'image_url' => $data['image_url'] ?? null,
            'plate_number' => $data['plate_number'] ?? null,
            'driver_name' => $data['driver_name'] ?? null,
            'conductor_name' => $data['conductor_name'] ?? null,
            'vehicle_id' => $data['vehicle_id'] ?? null,
            'estimated_time_lost' => $data['estimated_time_lost'] ?? null,
            'category' => $data['category'] ?? null,
            'reported_by_id' => $admin->id,
            'reported_by_role' => $admin->role->value,
            'reporter_name' => $this->adminDisplayName($admin),
            'status' => self::ITEM_AVAILABLE,
        ]);
    }

    /**
     * Admin edits a previously reported item's descriptive fields. Blocked
     * once the item is CLOSED — that's a finalized historical record.
     * Photos, status, and the claim/release audit trail are untouched here.
     *
     * @throws LostFoundException Item not found, or item is CLOSED.
     */
    public function update(string $itemId, array $data): LostItem
    {
        $item = $this->show($itemId);

        if ($item->status === self::ITEM_CLOSED) {
            throw LostFoundException::invalid('Cannot edit a closed item');
        }

        $item->update(array_filter([
            'item_name' => $data['item_name'] ?? null,
            'description' => $data['description'] ?? null,
            'plate_number' => $data['plate_number'] ?? null,
            'driver_name' => $data['driver_name'] ?? null,
            'conductor_name' => $data['conductor_name'] ?? null,
            'vehicle_id' => array_key_exists('vehicle_id', $data) ? $data['vehicle_id'] : null,
            'estimated_time_lost' => $data['estimated_time_lost'] ?? null,
            'category' => $data['category'] ?? null,
        ], fn ($v) => $v !== null));

        return $item->fresh(['vehicle', 'photos', 'claims.claimant']);
    }

    /**
     * Admin adds a photo to a lost item (up to MAX_PHOTOS). Appended at the
     * next open position — position 0 is kept mirrored onto
     * lost_items.image_url so every existing single-image read site (grid
     * cards, claim modals) keeps working without changes.
     *
     * @throws LostFoundException Item not found, or already at MAX_PHOTOS.
     */
    public function addPhoto(string $itemId, UploadedFile $file): LostItem
    {
        $item = $this->show($itemId);
        $existing = $item->photos()->count();

        if ($existing >= self::MAX_PHOTOS) {
            throw LostFoundException::invalid('This item already has the maximum of ' . self::MAX_PHOTOS . ' photos');
        }

        $mediaDisk = config('filesystems.uploads.public_media_disk', 'r2_public');
        $extension = $file->getClientOriginalExtension() ?: 'jpg';
        $filename = "{$itemId}-" . time() . "-" . Str::random(8) . ".{$extension}";
        $path = $file->storeAs('lost-items', $filename, $mediaDisk);
        $url = Storage::disk($mediaDisk)->url($path);

        DB::transaction(function () use ($item, $url, $existing): void {
            LostItemPhoto::create([
                'item_id' => $item->id,
                'url' => $url,
                'position' => $existing,
            ]);

            if ($existing === 0) {
                $item->update(['image_url' => $url]);
            }
        });

        return $item->fresh(['vehicle', 'photos', 'claims.claimant']);
    }

    /**
     * Admin removes a photo from a lost item. Remaining photos are
     * re-compacted to stay at contiguous positions 0..n-1, and
     * lost_items.image_url is re-synced to whatever now sits at position 0
     * (null if the item has no photos left).
     *
     * @throws LostFoundException Item or photo not found.
     */
    public function deletePhoto(string $itemId, string $photoId): LostItem
    {
        $item = $this->show($itemId);
        $photo = $item->photos()->where('id', $photoId)->first();

        if (! $photo) {
            throw LostFoundException::notFound('Photo');
        }

        $mediaDisk = config('filesystems.uploads.public_media_disk', 'r2_public');

        DB::transaction(function () use ($item, $photo, $mediaDisk): void {
            $oldPath = $this->extractPathFromUrl($photo->url);
            $oldDisk = str_contains($photo->url, '/storage/') ? 'public' : $mediaDisk;
            if ($oldPath && Storage::disk($oldDisk)->exists($oldPath)) {
                Storage::disk($oldDisk)->delete($oldPath);
            }
            $photo->delete();

            $remaining = $item->photos()->orderBy('position')->get();
            foreach ($remaining->values() as $index => $remainingPhoto) {
                if ($remainingPhoto->position !== $index) {
                    $remainingPhoto->update(['position' => $index]);
                }
            }

            $item->update(['image_url' => $remaining->first()->url ?? null]);
        });

        return $item->fresh(['vehicle', 'photos', 'claims.claimant']);
    }

    /**
     * Commuter claims an item. Only allowed when item status is AVAILABLE
     * or CLAIMED (i.e. not APPROVED/RELEASED/CLOSED). Creates a PENDING claim
     * and flips item → CLAIMED if it was AVAILABLE.
     *
     * @throws LostFoundException Item not found, or not claimable.
     */
    public function claim(User $commuter, string $itemId, array $data): Claim
    {
        $item = $this->show($itemId);

        if (! in_array($item->status, [self::ITEM_AVAILABLE, self::ITEM_CLAIMED], true)) {
            throw LostFoundException::itemNotClaimable(
                "This item is {$item->status} and cannot be claimed"
            );
        }

        /** @var CommuterProfile $profile */
        $profile = $commuter->commuterProfile;
        if (! $profile) {
            throw LostFoundException::notFound('Commuter profile');
        }

        return DB::transaction(function () use ($item, $commuter, $profile, $data): Claim {
            $claim = Claim::create([
                'item_id' => $item->id,
                'claimant_id' => $profile->id,
                'claimant_name' => trim($profile->first_name.' '.$profile->surname),
                'claimant_contact' => $data['claimant_contact'] ?? $profile->contact_number,
                'claimant_email' => $data['claimant_email'] ?? $commuter->email ?? $profile->email,
                'status' => self::CLAIM_PENDING,
                'proof' => $data['proof'] ?? null,
            ]);

            // Flip AVAILABLE → CLAIMED so other commuters see it's being
            // reviewed. Multiple claims are allowed until one is approved.
            if ($item->status === self::ITEM_AVAILABLE) {
                $item->update(['status' => self::ITEM_CLAIMED]);
            }

            return $claim->load('item');
        });
    }

    /**
     * Admin-assisted claim for a walk-in claimant without a CHATCO account.
     * The nullable claimant_id clearly distinguishes this record while the
     * retained name/contact/proof preserves accountability.
     */
    public function createManualClaim(User $admin, string $itemId, array $data): Claim
    {
        $item = $this->show($itemId);

        if (! in_array($item->status, [self::ITEM_AVAILABLE, self::ITEM_CLAIMED], true)) {
            throw LostFoundException::itemNotClaimable(
                "This item is {$item->status} and cannot be claimed"
            );
        }

        return DB::transaction(function () use ($admin, $item, $data): Claim {
            $claim = Claim::create([
                'item_id' => $item->id,
                'claimant_id' => null,
                'claimant_name' => trim($data['claimant_name']),
                'claimant_contact' => $data['claimant_contact'] ?? null,
                'claimant_email' => $data['claimant_email'] ?? null,
                'status' => self::CLAIM_PENDING,
                'proof' => trim($data['proof'])." [Recorded by {$admin->email}]",
            ]);

            if ($item->status === self::ITEM_AVAILABLE) {
                $item->update(['status' => self::ITEM_CLAIMED]);
            }

            return $claim->load('item');
        });
    }

    /**
     * The commuter's own claims, newest first, with the item eager-loaded.
     *
     * Powers the commuter Lost & Found "My Claims" tab + the per-card claim
     * badges, so claim state survives reloads instead of living in React
     * state. Capped at the latest 100 claims — far above the 3-pending cap
     * the UI enforces.
     *
     * @throws LostFoundException Commuter profile missing.
     */
    public function myClaims(User $commuter): array
    {
        /** @var CommuterProfile $profile */
        $profile = $commuter->commuterProfile;
        if (! $profile) {
            throw LostFoundException::notFound('Commuter profile');
        }

        return Claim::with('item.vehicle')
            ->where('claimant_id', $profile->id)
            ->orderByDesc('created_at')
            ->limit(100)
            ->get()
            ->all();
    }

    /**
     * Commuter cancels (withdraws) their own PENDING claim.
     *
     * The claim row is deleted — a withdrawal, not a review, so no REJECTED
     * audit row is left behind. If the item was CLAIMED and no other pending
     * claims remain, it reverts to AVAILABLE so other commuters can claim it.
     *
     * APPROVED/REJECTED claims cannot be cancelled (the review has already
     * happened); the guards below throw → 422 in the controller.
     *
     * @throws LostFoundException Claim not found / not owned / not PENDING.
     */
    public function cancelClaim(User $commuter, string $claimId): void
    {
        /** @var CommuterProfile $profile */
        $profile = $commuter->commuterProfile;
        if (! $profile) {
            throw LostFoundException::notFound('Commuter profile');
        }

        DB::transaction(function () use ($profile, $claimId): void {
            $claim = Claim::where('id', $claimId)
                ->where('claimant_id', $profile->id)
                ->with('item')
                ->first();

            if (! $claim) {
                throw LostFoundException::notFound('Claim');
            }

            if ($claim->status !== self::CLAIM_PENDING) {
                throw LostFoundException::claimNotReviewable(
                    "Only PENDING claims can be cancelled (current: {$claim->status})"
                );
            }

            $item = $claim->item;
            $claim->delete();

            // If this was the item's last pending claim, make it claimable again.
            if ($item && $item->status === self::ITEM_CLAIMED) {
                $remaining = Claim::where('item_id', $item->id)
                    ->where('status', self::CLAIM_PENDING)
                    ->count();
                if ($remaining === 0) {
                    $item->update(['status' => self::ITEM_AVAILABLE]);
                }
            }
        });
    }

    // ── Watchlist ──────────────────────────────────────────────

    /**
     * Add an item to the commuter's watchlist. Idempotent — if already
     * watching, returns the existing entry without error.
     */
    public function addToWatchlist(User $commuter, string $itemId): LostItemWatchlist
    {
        $item = $this->show($itemId);

        /** @var CommuterProfile $profile */
        $profile = $commuter->commuterProfile;
        if (! $profile) {
            throw LostFoundException::notFound('Commuter profile');
        }

        try {
            return LostItemWatchlist::firstOrCreate(
                [
                    'item_id' => $item->id,
                    'commuter_id' => $profile->id,
                ],
            );
        } catch (UniqueConstraintViolationException) {
            // Race condition — another request already created it. Fetch.
            return LostItemWatchlist::where('item_id', $item->id)
                ->where('commuter_id', $profile->id)
                ->firstOrFail();
        }
    }

    /**
     * Remove an item from the commuter's watchlist. Idempotent — no error
     * if not watching.
     */
    public function removeFromWatchlist(User $commuter, string $itemId): void
    {
        /** @var CommuterProfile $profile */
        $profile = $commuter->commuterProfile;
        if (! $profile) {
            return;
        }

        LostItemWatchlist::where('item_id', $itemId)
            ->where('commuter_id', $profile->id)
            ->delete();
    }

    /**
     * List the commuter's watchlist with item details, newest first.
     */
    public function myWatchlist(User $commuter, int $perPage = 15): LengthAwarePaginator
    {
        /** @var CommuterProfile $profile */
        $profile = $commuter->commuterProfile;
        if (! $profile) {
            throw LostFoundException::notFound('Commuter profile');
        }

        return LostItemWatchlist::with(['item.vehicle'])
            ->where('commuter_id', $profile->id)
            ->orderByDesc('created_at')
            ->paginate($perPage);
    }

    // ── Admin: claim review ────────────────────────────────────

    /**
     * List all claims for an item (admin only).
     */
    public function claimsForItem(string $itemId): array
    {
        $item = $this->show($itemId);

        return $item->claims()
            ->with('claimant', 'reviewer')
            ->orderByDesc('created_at')
            ->get()
            ->all();
    }

    /**
     * Admin approves a claim (Stage 1 of the 2-stage workflow).
     *
     * Sets claim → APPROVED, item → APPROVED. Does NOT release the item —
     * the admin must call releaseClaim() to record the handover. All OTHER
     * pending claims on the same item are auto-rejected.
     *
     * @throws LostFoundException Claim not found, not PENDING, or item CLOSED.
     */
    public function approveClaim(User $admin, string $itemId, string $claimId): Claim
    {
        return DB::transaction(function () use ($admin, $itemId, $claimId): Claim {
            $claim = $this->loadClaimForItem($itemId, $claimId);

            if ($claim->status !== self::CLAIM_PENDING) {
                throw LostFoundException::claimNotReviewable(
                    "Claim is already {$claim->status}"
                );
            }

            $item = $claim->item;
            if ($item->status === self::ITEM_CLOSED) {
                throw LostFoundException::claimNotReviewable(
                    'Cannot approve a claim on a closed item'
                );
            }

            // Approve this claim.
            $claim->update([
                'status' => self::CLAIM_APPROVED,
                'reviewed_by' => $admin->id,
                'reviewed_at' => now(),
            ]);

            // Move item to APPROVED stage (awaiting release/handover).
            $item->update([
                'status' => self::ITEM_APPROVED,
            ]);

            // Auto-reject other pending claims on the same item.
            Claim::where('item_id', $item->id)
                ->where('id', '!=', $claim->id)
                ->where('status', self::CLAIM_PENDING)
                ->update([
                    'status' => self::CLAIM_REJECTED,
                    'reviewed_by' => $admin->id,
                    'reviewed_at' => now(),
                    'rejection_reason' => 'Another claim was approved',
                ]);

            // Walk-in claimants (claimant_id null) have no CHATCO account to notify.
            if ($claim->claimant_id) {
                $this->announcementService->notifyUser(
                    $claim->claimant_id,
                    'claim_approved',
                    'Claim Approved',
                    "Your claim on \"{$item->item_name}\" was approved. Bring a valid ID and the proof you submitted to the terminal office to complete the handover."
                );
            }

            return $claim->fresh(['item', 'claimant', 'reviewer']);
        });
    }

    /**
     * Admin releases an approved claim (Stage 2 of the 2-stage workflow).
     *
     * Sets item → RELEASED with released_to + released_at. The claim stays
     * APPROVED (it was already approved in Stage 1). This records the actual
     * handover to the commuter.
     *
     * @throws LostFoundException Claim not found, not APPROVED, or item not APPROVED.
     */
    public function releaseClaim(User $admin, string $itemId, string $claimId): Claim
    {
        return DB::transaction(function () use ($admin, $itemId, $claimId): Claim {
            $claim = $this->loadClaimForItem($itemId, $claimId);

            if ($claim->status !== self::CLAIM_APPROVED) {
                throw LostFoundException::claimNotReviewable(
                    "Only APPROVED claims can be released (current: {$claim->status})"
                );
            }

            $item = $claim->item;

            if ($item->status === self::ITEM_RELEASED) {
                throw LostFoundException::claimNotReviewable(
                    'Item is already released'
                );
            }

            if ($item->status === self::ITEM_CLOSED) {
                throw LostFoundException::claimNotReviewable(
                    'Cannot release a claim on a closed item'
                );
            }

            $item->update([
                'status' => self::ITEM_RELEASED,
                'released_to' => $claim->claimant_id,
                'released_at' => now(),
            ]);

            if ($claim->claimant_id) {
                $this->announcementService->notifyUser(
                    $claim->claimant_id,
                    'claim_released',
                    'Item Returned',
                    "\"{$item->item_name}\" has been marked as returned to you. Thanks for using CHATCO Lost & Found!"
                );
            }

            return $claim->fresh(['item', 'claimant', 'reviewer']);
        });
    }

    /**
     * Admin rejects a claim. Works on both PENDING and APPROVED claims
     * (post-approval reversal — "if something later invalidates the approval").
     *
     * - Rejecting a PENDING claim: if no pending claims remain, item reverts
     *   to AVAILABLE.
     * - Rejecting an APPROVED claim: item reverts to CLAIMED if other pending
     *   claims exist, or AVAILABLE if none remain.
     *
     * @throws LostFoundException Claim not found, or already REJECTED.
     */
    public function rejectClaim(User $admin, string $itemId, string $claimId, ?string $reason): Claim
    {
        return DB::transaction(function () use ($admin, $itemId, $claimId, $reason): Claim {
            $claim = $this->loadClaimForItem($itemId, $claimId);

            if ($claim->status === self::CLAIM_REJECTED) {
                throw LostFoundException::claimNotReviewable(
                    'Claim is already rejected'
                );
            }

            // Only PENDING and APPROVED claims can be rejected.
            if (! in_array($claim->status, [self::CLAIM_PENDING, self::CLAIM_APPROVED], true)) {
                throw LostFoundException::claimNotReviewable(
                    "Cannot reject a {$claim->status} claim"
                );
            }

            // Cannot reject claims on RELEASED or CLOSED items — the item has
            // already been handed over. Post-approval rejection is only valid
            // while the item is still in the APPROVED (pre-handover) stage.
            $item = $claim->item;
            if (in_array($item->status, [self::ITEM_RELEASED, self::ITEM_CLOSED], true)) {
                throw LostFoundException::claimNotReviewable(
                    "Cannot reject a claim on a {$item->status} item"
                );
            }

            $claim->update([
                'status' => self::CLAIM_REJECTED,
                'reviewed_by' => $admin->id,
                'reviewed_at' => now(),
                'rejection_reason' => $reason,
            ]);

            // Determine the new item status based on remaining claims.
            $pendingCount = Claim::where('item_id', $claim->item_id)
                ->where('status', self::CLAIM_PENDING)
                ->count();

            if ($pendingCount > 0) {
                // Other pending claims exist → item goes back to CLAIMED.
                if ($item->status !== self::ITEM_CLAIMED) {
                    $item->update(['status' => self::ITEM_CLAIMED]);
                }
            } else {
                // No pending claims remain → item reverts to AVAILABLE.
                if ($item->status !== self::ITEM_AVAILABLE) {
                    $item->update(['status' => self::ITEM_AVAILABLE]);
                }
            }

            if ($claim->claimant_id) {
                $reasonSuffix = $reason ? " Reason: {$reason}." : '';
                $this->announcementService->notifyUser(
                    $claim->claimant_id,
                    'claim_rejected',
                    'Claim Rejected',
                    "Your claim on \"{$item->item_name}\" was not approved.{$reasonSuffix} You're welcome to review the item again and submit a new claim with more specific proof."
                );
            }

            return $claim->fresh(['item', 'claimant', 'reviewer']);
        });
    }

    /**
     * Admin closes a released item after the handover is complete.
     *
     * @throws LostFoundException Item not RELEASED.
     */
    public function close(User $admin, string $itemId): LostItem
    {
        $item = $this->show($itemId);

        if ($item->status !== self::ITEM_RELEASED) {
            throw LostFoundException::itemNotClaimable(
                "Only RELEASED items can be closed (current status: {$item->status})"
            );
        }

        $item->update([
            'status' => self::ITEM_CLOSED,
            'closed_by' => $admin->id,
            'closed_at' => now(),
        ]);

        return $item->fresh(['vehicle', 'releasedTo', 'closedBy']);
    }

    // ── Auto-expiry ──────────────────────────────────────────────

    /**
     * Archives AVAILABLE items that have sat unclaimed for EXPIRY_DAYS.
     * Called by the `lost-items:expire` scheduled command (daily).
     *
     * Items with an active claim history (CLAIMED/APPROVED/RELEASED/CLOSED)
     * are never touched — only genuinely unclaimed items go stale. Expiring
     * is not deletion: the row, photos, and any past (rejected) claims stay
     * intact, and an admin can reactivate() the item if a claimant turns up
     * late.
     *
     * @return int Number of items expired.
     */
    public function expireStale(): int
    {
        $cutoff = now()->subDays(self::EXPIRY_DAYS);

        return LostItem::where('status', self::ITEM_AVAILABLE)
            ->where('created_at', '<', $cutoff)
            ->update([
                'status' => self::ITEM_EXPIRED,
                'expired_at' => now(),
            ]);
    }

    /**
     * Admin manually brings an EXPIRED item back to AVAILABLE — e.g. a
     * claimant shows up after the archive window closed. Not lost forever.
     *
     * @throws LostFoundException Item not found, or not currently EXPIRED.
     */
    public function reactivate(string $itemId): LostItem
    {
        $item = $this->show($itemId);

        if ($item->status !== self::ITEM_EXPIRED) {
            throw LostFoundException::invalid("Only EXPIRED items can be reactivated (current status: {$item->status})");
        }

        $item->update([
            'status' => self::ITEM_AVAILABLE,
            'expired_at' => null,
        ]);

        return $item->fresh(['vehicle', 'photos']);
    }

    // ── Private helpers ────────────────────────────────────────

    private function loadClaimForItem(string $itemId, string $claimId): Claim
    {
        try {
            return Claim::where('id', $claimId)
                ->where('item_id', $itemId)
                ->with('item')
                ->firstOrFail();
        } catch (ModelNotFoundException) {
            throw LostFoundException::notFound('Claim');
        }
    }

    private function adminDisplayName(User $admin): string
    {
        $profile = $admin->adminProfile;
        if ($profile) {
            return trim($profile->first_name.' '.$profile->last_name);
        }

        return $admin->email;
    }

    /**
     * Extract the object path from either an R2 URL or a legacy local URL.
     */
    private function extractPathFromUrl(string $url): ?string
    {
        $parts = parse_url($url);
        $path = ltrim($parts['path'] ?? '', '/');

        if (str_starts_with($path, 'storage/')) {
            $path = substr($path, strlen('storage/'));
        }

        return $path !== '' ? $path : null;
    }
}
