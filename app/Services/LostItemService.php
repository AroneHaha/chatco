<?php

namespace App\Services;

use App\Models\Claim;
use App\Models\ClaimPhoto;
use App\Models\ClaimRejectionAudit;
use App\Models\CommuterProfile;
use App\Models\LostItem;
use App\Models\LostItemPhoto;
use App\Models\LostItemWatchlist;
use App\Models\User;
use App\Support\LostFound\LostFoundException;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

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

    private const CLAIM_RELEASED = 'RELEASED';

    /** Days an AVAILABLE, unclaimed item can sit before lost-items:expire archives it. */
    public const EXPIRY_DAYS = 30;

    /** Max photos per item (position 0-2; 0 is the thumbnail). */
    private const MAX_PHOTOS = 3;

    /** Max final rejected claims a commuter may have for the same item. */
    private const MAX_REJECTIONS_PER_COMMUTER_ITEM = 3;

    /** Days before expiry that watchers get the one-time "about to expire" notice. */
    public const EXPIRY_REMINDER_DAYS = 3;

    /** Recorded on an approved claim the claimant never collected (see rejectNoShows()). */
    public const NO_SHOW_REASON = 'Did not proceed with claiming the item by the scheduled pickup date';

    /** Shown to the claimant when the admin leaves the pickup reminder blank. */
    public const DEFAULT_PICKUP_REMINDER = 'Bring a valid ID and the proof of ownership you submitted.';

    /** Posted-within windows accepted by the commuter list endpoints' `range` filter. */
    public const TIME_RANGES = ['today', 'week', 'month', 'year'];

    public function __construct(
        private readonly AnnouncementService $announcementService,
        private readonly MediaStorageService $mediaStorage,
    ) {}

    /**
     * Paginated browse list for any authenticated role.
     * Filters: status, category, search (item_name/description/vehicle crew).
     * Eager-loads vehicle. Does NOT expose claimant info (privacy).
     */
    public function listItems(array $filters, int $perPage = 15): LengthAwarePaginator
    {
        $visibleStatuses = [self::ITEM_AVAILABLE, self::ITEM_CLAIMED];

        $query = LostItem::with(['vehicle', 'photos'])
            // Expired items are archived, not deleted — they stay visible to
            // admins under a dedicated filter, but drop out of the commuter
            // browse list entirely (nothing to claim, nothing to see).
            ->whereIn('status', $visibleStatuses)
            ->orderByDesc('created_at');

        if (! empty($filters['status'])) {
            $query->where('status', $filters['status']);
        }
        if (! empty($filters['category'])) {
            $query->where('category', $filters['category']);
        }
        if (! empty($filters['date'])) {
            $query->whereDate('created_at', $filters['date']);
        }
        $this->applyRangeFilter($query, $filters['range'] ?? null);
        if (! empty($filters['search'])) {
            $this->applySearchFilter($query, $filters['search']);
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
        $query = LostItem::with(['vehicle', 'photos', 'claims.claimant', 'claims.reviewer', 'claims.photos', 'releasedTo', 'closedBy'])
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
        if (! empty($filters['date'])) {
            $query->whereDate('created_at', $filters['date']);
        }
        if (! empty($filters['search'])) {
            $this->applySearchFilter($query, $filters['search']);
        }

        return $query->paginate($perPage);
    }

    /**
     * Single-item detail for ANY authenticated role (commuter/conductor
     * browse + the admin item-detail view both call this). Deliberately does
     * NOT eager-load `claims` or `releasedTo` — both relate back to
     * CommuterProfile, which has no $hidden array, so loading them here would
     * serialize other people's claimant PII (email, contact, birthdate,
     * government-ID photo, etc.) straight into a response reachable by any
     * commuter, not just admins. Same privacy posture as listItems() above.
     * Admins get full claim + claimant detail through the dedicated
     * ADMIN-only listForAdmin()/claimsForItem() paths instead.
     */
    public function show(string $itemId): LostItem
    {
        try {
            return LostItem::with(['vehicle', 'photos', 'closedBy'])->findOrFail($itemId);
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

        return $item->fresh(['vehicle', 'photos', 'claims.claimant', 'claims.reviewer']);
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
            throw LostFoundException::invalid('This item already has the maximum of '.self::MAX_PHOTOS.' photos');
        }

        $url = $this->mediaStorage->storeLostAndFoundImage($file, $item->id);

        try {
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
        } catch (\Throwable $e) {
            $this->mediaStorage->deletePublicUrl($url);
            throw $e;
        }

        return $item->fresh(['vehicle', 'photos', 'claims.claimant', 'claims.reviewer']);
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

        return $item->fresh(['vehicle', 'photos', 'claims.claimant', 'claims.reviewer']);
    }

    /**
     * Commuter claims an item. Only allowed when item status is AVAILABLE
     * or CLAIMED (i.e. not APPROVED/RELEASED/CLOSED). Creates a PENDING claim
     * and flips item → CLAIMED if it was AVAILABLE.
     *
     * @throws LostFoundException Item not found, or not claimable.
     */
    /**
     * @param  UploadedFile[]  $images  Optional proof-of-ownership photos (max 3, validated by ClaimLostItemRequest).
     */
    public function claim(User $commuter, string $itemId, array $data, array $images = []): Claim
    {
        // Lean fetch — this only ever reads $item->status/id, not any of
        // show()'s eager-loaded relations (vehicle, photos, claims.claimant,
        // releasedTo, closedBy), so there's no reason to pay for them here.
        $item = $this->findItemOrFail($itemId);

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

        $rejectedCount = Claim::where('item_id', $item->id)
            ->where('claimant_id', $profile->id)
            ->where('status', self::CLAIM_REJECTED)
            ->count();

        if ($rejectedCount >= self::MAX_REJECTIONS_PER_COMMUTER_ITEM) {
            throw LostFoundException::itemNotClaimable(
                'You have reached the maximum number of rejected claims for this item'
            );
        }

        // Uploaded before the transaction (network call to R2), same as
        // addPhoto(); deleted again below if the claim fails to save.
        $imageUrls = [];
        try {
            foreach ($images as $image) {
                $imageUrls[] = $this->mediaStorage->storeLostAndFoundClaimImage($image, $item->id);
            }

            return DB::transaction(function () use ($item, $commuter, $profile, $data, $imageUrls): Claim {
                $claim = Claim::create([
                    'item_id' => $item->id,
                    'claimant_id' => $profile->id,
                    'claimant_name' => trim($profile->first_name.' '.$profile->surname),
                    'claimant_contact' => $data['claimant_contact'] ?? $profile->contact_number,
                    'claimant_email' => $data['claimant_email'] ?? $commuter->email ?? $profile->email,
                    'status' => self::CLAIM_PENDING,
                    'proof' => $data['proof'] ?? null,
                ]);

                foreach ($imageUrls as $position => $url) {
                    ClaimPhoto::create([
                        'claim_id' => $claim->id,
                        'url' => $url,
                        'position' => $position,
                    ]);
                }

                // Flip AVAILABLE → CLAIMED so other commuters see it's being
                // reviewed. Multiple claims are allowed until one is approved.
                if ($item->status === self::ITEM_AVAILABLE) {
                    $item->update(['status' => self::ITEM_CLAIMED]);
                }

                return $claim->load(['item', 'photos']);
            });
        } catch (\Throwable $e) {
            foreach ($imageUrls as $url) {
                $this->mediaStorage->deletePublicUrl($url);
            }
            throw $e;
        }
    }

    /**
     * Admin-assisted claim for a walk-in claimant without a CHATCO account.
     * The nullable claimant_id clearly distinguishes this record while the
     * retained name/contact/proof preserves accountability.
     */
    public function createManualClaim(User $admin, string $itemId, array $data): Claim
    {
        // Lean fetch — see the comment in claim() above.
        $item = $this->findItemOrFail($itemId);

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
    public function myClaims(User $commuter, int $perPage = 10, ?string $status = null, ?string $date = null, ?string $search = null, ?string $range = null, ?string $category = null): LengthAwarePaginator
    {
        /** @var CommuterProfile $profile */
        $profile = $commuter->commuterProfile;
        if (! $profile) {
            throw LostFoundException::notFound('Commuter profile');
        }

        $query = Claim::with('item.vehicle')
            ->where('claimant_id', $profile->id)
            ->orderByDesc('created_at');

        if ($status) {
            $query->where('status', $status);
        }
        if ($date) {
            $query->whereHas('item', fn ($itemQuery) => $itemQuery->whereDate('created_at', $date));
        }
        if ($range) {
            $query->whereHas('item', fn ($itemQuery) => $this->applyRangeFilter($itemQuery, $range));
        }
        if ($category) {
            $query->whereHas('item', fn ($itemQuery) => $itemQuery->where('category', $category));
        }
        if ($search) {
            $query->whereHas('item', fn ($itemQuery) => $this->applySearchFilter($itemQuery, $search));
        }

        return $query->paginate($perPage);
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
    public function myWatchlist(User $commuter, int $perPage = 15, ?string $date = null, ?string $search = null, ?string $range = null, ?string $category = null): LengthAwarePaginator
    {
        $visibleStatuses = [self::ITEM_AVAILABLE, self::ITEM_CLAIMED];

        /** @var CommuterProfile $profile */
        $profile = $commuter->commuterProfile;
        if (! $profile) {
            throw LostFoundException::notFound('Commuter profile');
        }

        return LostItemWatchlist::with(['item.vehicle'])
            ->where('commuter_id', $profile->id)
            ->whereHas('item', function ($query) use ($visibleStatuses, $date, $search, $range, $category) {
                $query->whereIn('status', $visibleStatuses);
                if ($category) {
                    $query->where('category', $category);
                }
                if ($date) {
                    $query->whereDate('created_at', $date);
                }
                $this->applyRangeFilter($query, $range);
                if ($search) {
                    $this->applySearchFilter($query, $search);
                }
            })
            ->orderByDesc('created_at')
            ->paginate($perPage);
    }

    // ── Admin: claim review ────────────────────────────────────

    /**
     * List all claims for an item (admin only).
     */
    public function claimsForItem(string $itemId): array
    {
        // Only the existence check + id are needed here; show() would also
        // eager-load vehicle/photos/closedBy that this list never returns.
        $item = $this->findItemOrFail($itemId);

        return $item->claims()
            ->with('claimant', 'reviewer', 'photos')
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
     * `$pickup` (pickup_location, pickup_at, pickup_reminder) tells the
     * claimant where and when to collect the item. It's required for
     * account claimants, who only learn it through the app, and optional
     * for walk-in claimants, who are already at the desk.
     *
     * @param  array{pickup_location?: ?string, pickup_at?: ?string, pickup_reminder?: ?string}  $pickup
     *
     * @throws LostFoundException Claim not found, not PENDING, item CLOSED, or pickup details missing.
     */
    public function approveClaim(User $admin, string $itemId, string $claimId, array $pickup = []): Claim
    {
        return DB::transaction(function () use ($admin, $itemId, $claimId, $pickup): Claim {
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

            $pickupLocation = trim((string) ($pickup['pickup_location'] ?? '')) ?: null;
            $pickupAt = ! empty($pickup['pickup_at']) ? Carbon::parse($pickup['pickup_at']) : null;
            if ($claim->claimant_id && (! $pickupLocation || ! $pickupAt)) {
                throw LostFoundException::invalid('Set a pickup location, date and time before approving this claim');
            }
            $pickupReminder = $pickupLocation
                ? (trim((string) ($pickup['pickup_reminder'] ?? '')) ?: self::DEFAULT_PICKUP_REMINDER)
                : null;

            $now = now();

            // Approve this claim.
            $claim->update([
                'status' => self::CLAIM_APPROVED,
                'reviewed_by' => $admin->id,
                'reviewed_at' => $now,
                'approved_at' => $now,
                'pickup_location' => $pickupLocation,
                'pickup_at' => $pickupAt,
                'pickup_reminder' => $pickupReminder,
            ]);

            // Move item to APPROVED stage (awaiting release/handover).
            $item->update([
                'status' => self::ITEM_APPROVED,
            ]);

            // Auto-reject other pending claims on the same item.
            $autoRejectedClaims = Claim::where('item_id', $item->id)
                ->where('id', '!=', $claim->id)
                ->where('status', self::CLAIM_PENDING)
                ->get();

            foreach ($autoRejectedClaims as $autoRejectedClaim) {
                $rejectedAt = now();
                $autoRejectedClaim->update([
                    'status' => self::CLAIM_REJECTED,
                    'reviewed_by' => $admin->id,
                    'reviewed_at' => $rejectedAt,
                    'rejected_at' => $rejectedAt,
                    'rejection_reason' => 'Another claim was approved',
                ]);

                $this->recordRejectionAudit(
                    $autoRejectedClaim,
                    $admin,
                    self::CLAIM_PENDING,
                    self::CLAIM_REJECTED,
                    'Another claim was approved',
                );
            }

            // Walk-in claimants (claimant_id null) have no CHATCO account to notify.
            if ($claim->claimant_id) {
                $when = $pickupAt->copy()->timezone(config('app.timezone'))->format('M j, Y \\a\\t g:i A');
                $this->announcementService->notifyUser(
                    $claim->claimant_id,
                    'claim_approved',
                    'Claim Approved',
                    "Your claim on \"{$item->item_name}\" was approved. Pick it up at {$pickupLocation} on {$when}. {$pickupReminder}",
                    $item->id,
                );
            }

            // Everyone else who saved this item: it's off the board now.
            $this->notifyWatchers(
                $item,
                'saved_item_taken',
                'Saved Item Matched',
                "\"{$item->item_name}\" was matched with a claimant and is no longer open for claims. We'll let you know if it becomes available again.",
                $claim->claimant_id,
            );

            return $claim->setRelation('item', $item)->load(['claimant', 'reviewer']);
        });
    }

    /**
     * Admin releases an approved claim (Stage 2 of the 2-stage workflow).
     *
     * Sets item → RELEASED with released_to + released_at. The claim stays
     * RELEASED with its own released_at timestamp. This records the actual
     * handover to the commuter on the claim as well as the item.
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

            $now = now();

            $item->update([
                'status' => self::ITEM_CLOSED,
                'released_to' => $claim->claimant_id,
                'released_at' => $now,
                'closed_by' => $admin->id,
                'closed_at' => $now,
            ]);

            $claim->update([
                'status' => self::CLAIM_RELEASED,
                'released_at' => $now,
            ]);

            if ($claim->claimant_id) {
                $this->announcementService->notifyUser(
                    $claim->claimant_id,
                    'claim_released',
                    'Item Returned',
                    "\"{$item->item_name}\" has been marked as returned to you. Thanks for using CHATCO Lost & Found!"
                );
            }

            // Reuse the rows already in memory instead of fresh() re-reading
            // the claim and item; closedBy is the acting admin (closed_by_name).
            $item->setRelation('closedBy', $admin);

            return $claim->setRelation('item', $item)->load(['claimant', 'reviewer']);
        });
    }

    /**
     * Admin rejects a claim. Works on both PENDING and APPROVED claims
     * (post-approval reversal — "if something later invalidates the approval").
     * Either way the claim ends in a terminal REJECTED state — it is never
     * treated as active again, so the commuter is free to submit a new claim
     * on the same item (subject to the MAX_REJECTIONS_PER_COMMUTER_ITEM cap,
     * which counts REJECTED claims and therefore now also counts a rejection
     * that happened post-approval).
     *
     * The item reverts to AVAILABLE if no other PENDING claims remain, or
     * CLAIMED if other commuters still have a PENDING claim on it.
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

            $previousStatus = $claim->status;
            $previousItemStatus = $item->status;
            $now = now();

            // Terminal in both cases — a PENDING claim rejected outright, or
            // an APPROVED claim reversed post-approval, both end up REJECTED
            // and stop being "active" for this commuter/item.
            $claim->update([
                'status' => self::CLAIM_REJECTED,
                'reviewed_by' => $admin->id,
                'reviewed_at' => $now,
                'rejected_at' => $now,
                'rejection_reason' => $reason,
            ]);

            $this->recordRejectionAudit($claim, $admin, $previousStatus, self::CLAIM_REJECTED, $reason);

            $this->reopenItemAfterRejection($item, $claim, $previousItemStatus);

            if ($claim->claimant_id) {
                $reasonSuffix = $reason ? " Reason: {$reason}." : '';
                $rejectedCount = Claim::where('item_id', $claim->item_id)
                    ->where('claimant_id', $claim->claimant_id)
                    ->where('status', self::CLAIM_REJECTED)
                    ->count();
                $retryText = $rejectedCount >= self::MAX_REJECTIONS_PER_COMMUTER_ITEM
                    ? ' You have reached the rejection limit for this item.'
                    : " You're welcome to review the item again and submit a new claim with more specific proof.";
                $this->announcementService->notifyUser(
                    $claim->claimant_id,
                    'claim_rejected',
                    'Claim Rejected',
                    "Your claim on \"{$item->item_name}\" was not approved.{$reasonSuffix}{$retryText}"
                );
            }

            return $claim->fresh(['item', 'claimant', 'reviewer']);
        });
    }

    /**
     * Auto-rejects approved claims whose claimant never collected the item:
     * the pickup day (app timezone) has ended and the admin neither released
     * nor rejected the claim. Called daily by `lost-items:expire`.
     *
     * The claim ends REJECTED with no_show_at set and NO_SHOW_REASON, so it
     * reads as "did not proceed" rather than an admin rejection. There is no
     * rescheduling: the item goes back on the board (with a fresh expiry
     * window, so it doesn't get archived before anyone can re-claim it), and
     * the claimant has to claim again online or as a walk-in at the office.
     * Like any rejection it counts toward MAX_REJECTIONS_PER_COMMUTER_ITEM.
     *
     * @return int Number of claims auto-rejected.
     */
    public function rejectNoShows(): int
    {
        $claimIds = Claim::where('status', self::CLAIM_APPROVED)
            ->whereNotNull('pickup_at')
            ->where('pickup_at', '<', now()->startOfDay())
            ->pluck('id');

        $rejected = 0;
        foreach ($claimIds as $claimId) {
            if ($this->rejectNoShow($claimId)) {
                $rejected++;
            }
        }

        return $rejected;
    }

    /**
     * One claim per transaction, re-checked under a row lock: the admin may
     * have released or rejected it between the sweep's query and this point,
     * and in that case it's left alone.
     */
    private function rejectNoShow(string $claimId): bool
    {
        return DB::transaction(function () use ($claimId): bool {
            $claim = Claim::whereKey($claimId)->lockForUpdate()->first();
            if (! $claim || $claim->status !== self::CLAIM_APPROVED) {
                return false;
            }

            $item = LostItem::whereKey($claim->item_id)->lockForUpdate()->first();
            if (! $item || $item->status !== self::ITEM_APPROVED) {
                return false;
            }

            $now = now();
            // reviewed_by/reviewed_at keep pointing at the approving admin;
            // no_show_at is what marks this rejection as system-made.
            $claim->update([
                'status' => self::CLAIM_REJECTED,
                'rejected_at' => $now,
                'rejection_reason' => self::NO_SHOW_REASON,
                'no_show_at' => $now,
            ]);

            $this->recordRejectionAudit($claim, null, self::CLAIM_APPROVED, self::CLAIM_REJECTED, self::NO_SHOW_REASON);
            $this->reopenItemAfterRejection($item, $claim, self::ITEM_APPROVED, restartExpiryWindow: true);

            if ($claim->claimant_id) {
                $when = $claim->pickup_at->copy()->timezone(config('app.timezone'))->format('M j, Y');
                $rejectedCount = Claim::where('item_id', $claim->item_id)
                    ->where('claimant_id', $claim->claimant_id)
                    ->where('status', self::CLAIM_REJECTED)
                    ->count();
                $nextStep = $rejectedCount >= self::MAX_REJECTIONS_PER_COMMUTER_ITEM
                    ? ' You have reached the claim limit for this item online, but you can still claim it in person at the office.'
                    : ' If it is yours, submit a new claim in the app or visit the office to claim it in person.';
                $this->announcementService->notifyUser(
                    $claim->claimant_id,
                    'claim_rejected',
                    'Claim Not Completed',
                    "You didn't collect \"{$item->item_name}\" on the scheduled pickup date ({$when}), so this claim was closed.{$nextStep}",
                    $item->id,
                );
            }

            return true;
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
            ->whereRaw('COALESCE(available_since, created_at) < ?', [$cutoff])
            ->update([
                'status' => self::ITEM_EXPIRED,
                'expired_at' => now(),
            ]);
    }

    /**
     * One-time heads-up to commuters who saved an item that will expire
     * within EXPIRY_REMINDER_DAYS. Called by `lost-items:expire` right after
     * expireStale(), so already-expired items are never included.
     *
     * Each watchlist row is reminded at most once per availability window:
     * expiry_reminded_at is compared against the item's current
     * COALESCE(available_since, created_at), so a reactivated item (fresh
     * available_since) can trigger a new reminder later. One insert per item
     * for the notices and one update for the markers, however many watchers.
     *
     * @return int Number of watchers reminded.
     */
    public function remindExpiringWatchedItems(): int
    {
        $now = now();
        $windowStart = $now->copy()->subDays(self::EXPIRY_DAYS - self::EXPIRY_REMINDER_DAYS);

        $rows = DB::table('lost_item_watchlists as w')
            ->join('lost_items as i', 'i.id', '=', 'w.item_id')
            ->where('i.status', self::ITEM_AVAILABLE)
            ->whereRaw('COALESCE(i.available_since, i.created_at) <= ?', [$windowStart])
            ->where(function ($query) {
                $query->whereNull('w.expiry_reminded_at')
                    ->orWhereRaw('w.expiry_reminded_at < COALESCE(i.available_since, i.created_at)');
            })
            ->select('w.id as watch_id', 'w.commuter_id', 'i.id as item_id', 'i.item_name', 'i.available_since', 'i.created_at')
            ->get();

        if ($rows->isEmpty()) {
            return 0;
        }

        foreach ($rows->groupBy('item_id') as $itemId => $watchers) {
            $first = $watchers->first();
            $until = Carbon::parse($first->available_since ?? $first->created_at)
                ->addDays(self::EXPIRY_DAYS)
                ->timezone(config('app.timezone'))
                ->format('M j');
            $this->announcementService->notifyUsers(
                $watchers->pluck('commuter_id')->unique(),
                'saved_item_expiring',
                'Saved Item Expiring Soon',
                "\"{$first->item_name}\" leaves Lost & Found on {$until}. Claim it before then if it's yours.",
                (string) $itemId,
            );
        }

        DB::table('lost_item_watchlists')
            ->whereIn('id', $rows->pluck('watch_id'))
            ->update(['expiry_reminded_at' => $now]);

        return $rows->count();
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
            'available_since' => now(),
        ]);

        return $item->fresh(['vehicle', 'photos']);
    }

    // ── Private helpers ────────────────────────────────────────

    /**
     * Lean item fetch for internal guards that only need the row itself
     * (claim eligibility checks) — avoids show()'s heavy eager loads
     * (vehicle, photos, claims.claimant, releasedTo, closedBy) when nothing
     * but status/id is actually needed.
     */
    private function findItemOrFail(string $itemId): LostItem
    {
        try {
            return LostItem::findOrFail($itemId);
        } catch (ModelNotFoundException) {
            throw LostFoundException::notFound('Item');
        }
    }

    /**
     * Apply the free-text search filter shared by every Lost & Found list
     * query (browse, admin list, my-claims, my-watchlist) — matches
     * item_name/description/plate_number/driver_name/conductor_name.
     *
     * NOTE — indexing caveat: this uses a leading-wildcard LIKE ('%term%'),
     * which cannot use a B-tree index on any of these columns no matter
     * what's indexed, so MySQL falls back to scanning every row the other
     * filters (status/category/date) leave as candidates. That's fine at
     * current volumes. If lost_items grows into the hundreds of thousands
     * of rows and this scan shows up in slow-query logs, the fix is a
     * dedicated search strategy — e.g. a MySQL FULLTEXT index on these
     * columns, or Laravel Scout + Meilisearch/Elasticsearch — not another
     * regular index, since a regular index can't help a leading-wildcard
     * LIKE.
     */
    private function applySearchFilter(Builder $query, string $search): void
    {
        $query->where(function (Builder $q) use ($search) {
            $q->where('item_name', 'like', "%{$search}%")
                ->orWhere('description', 'like', "%{$search}%")
                ->orWhere('plate_number', 'like', "%{$search}%")
                ->orWhere('driver_name', 'like', "%{$search}%")
                ->orWhere('conductor_name', 'like', "%{$search}%");
        });
    }

    /**
     * After a claim is rejected (by an admin or as a no-show), put the item
     * back in the state its remaining claims call for: CLAIMED if other
     * PENDING claims exist, otherwise AVAILABLE so anyone can claim it again.
     * When this reverses an approval the item reappears on the board, so the
     * commuters who saved it are told (except the rejected claimant).
     *
     * $restartExpiryWindow resets available_since so a returning item gets a
     * full EXPIRY_DAYS to be re-claimed instead of being archived on the next
     * expiry run because it was first reported long ago.
     */
    private function reopenItemAfterRejection(LostItem $item, Claim $claim, string $previousItemStatus, bool $restartExpiryWindow = false): void
    {
        $pendingCount = Claim::where('item_id', $item->id)
            ->where('status', self::CLAIM_PENDING)
            ->count();
        $nextStatus = $pendingCount > 0 ? self::ITEM_CLAIMED : self::ITEM_AVAILABLE;

        $changes = $item->status !== $nextStatus ? ['status' => $nextStatus] : [];
        if ($restartExpiryWindow && $nextStatus === self::ITEM_AVAILABLE) {
            $changes['available_since'] = now();
        }
        if ($changes) {
            $item->update($changes);
        }

        if ($previousItemStatus === self::ITEM_APPROVED) {
            $this->notifyWatchers(
                $item,
                'saved_item_back',
                'Saved Item Available Again',
                "\"{$item->item_name}\" is open for claims again. Take another look if it might be yours.",
                $claim->claimant_id,
            );
        }
    }

    /**
     * Notify every commuter watching $item (one bulk insert), optionally
     * skipping the commuter the change is about, who gets their own, more
     * specific claim notice. watchlists.commuter_id is the user id
     * (commuter_profiles share their user's primary key).
     */
    private function notifyWatchers(LostItem $item, string $type, string $title, string $message, ?string $exceptCommuterId = null): void
    {
        $watcherIds = LostItemWatchlist::where('item_id', $item->id)
            ->when($exceptCommuterId, fn ($query) => $query->where('commuter_id', '!=', $exceptCommuterId))
            ->pluck('commuter_id');

        if ($watcherIds->isNotEmpty()) {
            $this->announcementService->notifyUsers($watcherIds, $type, $title, $message, $item->id);
        }
    }

    /**
     * Limit a lost_items query to items posted within a rolling window that
     * ends now: today (since midnight), week (last 7 days), month (last 30
     * days) or year (last 365 days), each counted in whole days in the app
     * timezone so "today" is always fully included. A plain `>=` on
     * created_at (not whereDate) keeps the comparison index-friendly. Null
     * is a no-op; the controller rejects any value outside TIME_RANGES.
     */
    private function applyRangeFilter(Builder $query, ?string $range): void
    {
        $since = match ($range) {
            'today' => now()->startOfDay(),
            'week' => now()->startOfDay()->subDays(6),
            'month' => now()->startOfDay()->subDays(29),
            'year' => now()->startOfDay()->subDays(364),
            default => null,
        };

        if ($since) {
            $query->where('created_at', '>=', $since);
        }
    }

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

    /** $admin is null for system rejections (no-show sweep). */
    private function recordRejectionAudit(
        Claim $claim,
        ?User $admin,
        string $previousStatus,
        string $resultingStatus,
        ?string $reason,
    ): void {
        ClaimRejectionAudit::create([
            'claim_id' => $claim->id,
            'item_id' => $claim->item_id,
            'claimant_id' => $claim->claimant_id,
            'rejected_by' => $admin?->id,
            'previous_status' => $previousStatus,
            'resulting_status' => $resultingStatus,
            'rejection_reason' => $reason,
        ]);
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
