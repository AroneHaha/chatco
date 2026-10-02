<?php

namespace App\Models;

use App\Services\LostItemService;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;

class LostItem extends Model
{
    use HasFactory;

    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'item_name',
        'description',
        'image_url',
        'plate_number',
        'driver_name',
        'conductor_name',
        'vehicle_id',
        'estimated_time_lost',
        'category',
        'reported_by_id',
        'reported_by_role',
        'reporter_name',
        'status',
        'claimed_by',
        'released_to',
        'released_at',
        'closed_by',
        'closed_at',
        'expired_at',
        'available_since',
    ];

    protected $casts = [
        'released_at' => 'datetime',
        'closed_at' => 'datetime',
        'expired_at' => 'datetime',
        'available_since' => 'datetime',
    ];

    /** Always include these computed fields in JSON — see the accessors below. */
    protected $appends = ['closed_by_name', 'claimable_until'];

    /**
     * Auto-generate UUID on creation.
     */
    protected static function booted(): void
    {
        static::creating(function (LostItem $item) {
            if (empty($item->id)) {
                $item->id = (string) Str::uuid();
            }
        });
    }

    public function reporter()
    {
        return $this->belongsTo(User::class, 'reported_by_id');
    }

    public function vehicle()
    {
        return $this->belongsTo(Vehicle::class);
    }

    public function claims()
    {
        return $this->hasMany(Claim::class, 'item_id');
    }

    /** Up to 3 photos, ordered by position (0 = thumbnail). */
    public function photos()
    {
        return $this->hasMany(LostItemPhoto::class, 'item_id')->orderBy('position');
    }

    public function releasedTo()
    {
        return $this->belongsTo(CommuterProfile::class, 'released_to');
    }

    public function closedBy()
    {
        return $this->belongsTo(User::class, 'closed_by');
    }

    /**
     * The admin's display name for whoever closed/released this item —
     * releaseClaim() and close() both stamp `closed_by`, so this covers
     * "released by" in the admin UI without a second lookup.
     */
    public function getClosedByNameAttribute(): ?string
    {
        return $this->closedBy?->getDisplayName();
    }

    /**
     * When an unclaimed item drops out of Lost & Found — the same
     * COALESCE(available_since, created_at) + EXPIRY_DAYS cutoff that
     * LostItemService::expireStale() archives on. Only AVAILABLE items run
     * this clock (an item with a pending or approved claim never expires),
     * so it's null for every other status.
     */
    public function getClaimableUntilAttribute(): ?Carbon
    {
        if ($this->status !== 'AVAILABLE') {
            return null;
        }

        $base = $this->available_since ?? $this->created_at;

        return $base?->copy()->addDays(LostItemService::EXPIRY_DAYS);
    }

    /**
     * Commuters watching this item (watchlist entries).
     */
    public function watchlists()
    {
        return $this->hasMany(LostItemWatchlist::class, 'item_id');
    }
}
