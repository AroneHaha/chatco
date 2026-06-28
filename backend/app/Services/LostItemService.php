<?php

namespace App\Services;

use App\Models\Claim;
use App\Models\CommuterProfile;
use App\Models\LostItem;
use App\Models\User;
use App\Support\LostFound\LostFoundException;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Support\Facades\DB;

/**
 * Sprint 6 (T3) — Lost & Found business logic.
 *
 * Item lifecycle (status column on lost_items):
 *   AVAILABLE  → item reported by admin, no claims yet (or all claims rejected)
 *   CLAIMED    → at least one PENDING claim exists
 *   RELEASED   → a claim was APPROVED; released_to + released_at set
 *   CLOSED     → admin closes the item after handover is complete
 *
 * Claim lifecycle (status column on claims):
 *   PENDING    → submitted by a commuter, awaiting admin review
 *   APPROVED   → admin approved; parent item → RELEASED, other pending claims
 *                on the same item are auto-rejected
 *   REJECTED   → admin rejected; rejection_reason recorded
 *
 * State-transition guards throw LostFoundException → mapped to 422/409 in
 * the controller. All mutations run inside a DB transaction to keep the
 * item + claim + auto-reject side-effects atomic.
 */
class LostItemService
{
    private const ITEM_AVAILABLE = 'AVAILABLE';
    private const ITEM_CLAIMED   = 'CLAIMED';
    private const ITEM_RELEASED  = 'RELEASED';
    private const ITEM_CLOSED    = 'CLOSED';

    private const CLAIM_PENDING  = 'PENDING';
    private const CLAIM_APPROVED = 'APPROVED';
    private const CLAIM_REJECTED = 'REJECTED';

    /**
     * Paginated browse list for any authenticated role.
     * Filters: status, category, search (item_name/description).
     * Eager-loads vehicle. Does NOT expose claimant info (privacy).
     */
    public function listItems(array $filters, int $perPage = 15): LengthAwarePaginator
    {
        $query = LostItem::with('vehicle')
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
     */
    public function listForAdmin(array $filters, int $perPage = 15): LengthAwarePaginator
    {
        $query = LostItem::with(['vehicle', 'claims.claimant', 'releasedTo', 'closedBy'])
            ->orderByDesc('created_at');

        if (! empty($filters['status'])) {
            $query->where('status', $filters['status']);
        }
        if (! empty($filters['category'])) {
            $query->where('category', $filters['category']);
        }

        return $query->paginate($perPage);
    }

    public function show(string $itemId): LostItem
    {
        try {
            return LostItem::with(['vehicle', 'claims.claimant'])->findOrFail($itemId);
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
            'item_name'          => $data['item_name'],
            'description'        => $data['description'],
            'image_url'          => $data['image_url'] ?? null,
            'plate_number'       => $data['plate_number'] ?? null,
            'driver_name'        => $data['driver_name'] ?? null,
            'conductor_name'     => $data['conductor_name'] ?? null,
            'vehicle_id'         => $data['vehicle_id'] ?? null,
            'estimated_time_lost'=> $data['estimated_time_lost'] ?? null,
            'category'           => $data['category'] ?? null,
            'reported_by_id'     => $admin->id,
            'reported_by_role'   => $admin->role->value,
            'reporter_name'      => $this->adminDisplayName($admin),
            'status'             => self::ITEM_AVAILABLE,
        ]);
    }

    /**
     * Commuter claims an item. Only allowed when item status is AVAILABLE
     * or CLAIMED (i.e. not RELEASED/CLOSED). Creates a PENDING claim and
     * flips item → CLAIMED if it was AVAILABLE.
     *
     * @throws LostFoundException  Item not found, or not claimable.
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
                'item_id'         => $item->id,
                'claimant_id'     => $profile->id,
                'claimant_name'   => trim($profile->first_name . ' ' . $profile->surname),
                'claimant_contact'=> $data['claimant_contact'] ?? null,
                'claimant_email'  => $data['claimant_email'] ?? $commuter->email,
                'status'          => self::CLAIM_PENDING,
                'proof'           => $data['proof'] ?? null,
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
     * Admin approves a claim. Sets claim → APPROVED, item → RELEASED with
     * released_to + released_at. All OTHER pending claims on the same item
     * are auto-rejected (with reason 'Another claim was approved') so the
     * audit trail shows why they closed.
     *
     * @throws LostFoundException  Claim not found, not PENDING, or belongs to a non-CLAIMED item.
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
                'status'       => self::CLAIM_APPROVED,
                'reviewed_by'  => $admin->id,
                'reviewed_at'  => now(),
            ]);

            // Release the item to this claimant.
            $item->update([
                'status'      => self::ITEM_RELEASED,
                'released_to' => $claim->claimant_id,
                'released_at' => now(),
            ]);

            // Auto-reject other pending claims on the same item.
            Claim::where('item_id', $item->id)
                ->where('id', '!=', $claim->id)
                ->where('status', self::CLAIM_PENDING)
                ->update([
                    'status'           => self::CLAIM_REJECTED,
                    'reviewed_by'      => $admin->id,
                    'reviewed_at'      => now(),
                    'rejection_reason' => 'Another claim was approved',
                ]);

            return $claim->fresh(['item', 'claimant', 'reviewer']);
        });
    }

    /**
     * Admin rejects a claim. Sets claim → REJECTED with optional reason.
     * If the rejected claim was the last pending one, the item reverts to
     * AVAILABLE so other commuters can still claim it.
     *
     * @throws LostFoundException  Claim not found or not PENDING.
     */
    public function rejectClaim(User $admin, string $itemId, string $claimId, ?string $reason): Claim
    {
        return DB::transaction(function () use ($admin, $itemId, $claimId, $reason): Claim {
            $claim = $this->loadClaimForItem($itemId, $claimId);

            if ($claim->status !== self::CLAIM_PENDING) {
                throw LostFoundException::claimNotReviewable(
                    "Claim is already {$claim->status}"
                );
            }

            $claim->update([
                'status'           => self::CLAIM_REJECTED,
                'reviewed_by'      => $admin->id,
                'reviewed_at'      => now(),
                'rejection_reason' => $reason,
            ]);

            // If no pending claims remain, revert item to AVAILABLE.
            $pendingCount = Claim::where('item_id', $claim->item_id)
                ->where('status', self::CLAIM_PENDING)
                ->count();
            if ($pendingCount === 0 && $claim->item->status === self::ITEM_CLAIMED) {
                $claim->item->update(['status' => self::ITEM_AVAILABLE]);
            }

            return $claim->fresh(['item', 'claimant', 'reviewer']);
        });
    }

    /**
     * Admin closes a released item after the handover is complete.
     *
     * @throws LostFoundException  Item not RELEASED.
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
            'status'    => self::ITEM_CLOSED,
            'closed_by' => $admin->id,
            'closed_at' => now(),
        ]);

        return $item->fresh(['vehicle', 'releasedTo', 'closedBy']);
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

    private function adminDisplayName(User $admin): string
    {
        $profile = $admin->adminProfile;
        if ($profile) {
            return trim($profile->first_name . ' ' . $profile->last_name);
        }
        return $admin->email;
    }
}
