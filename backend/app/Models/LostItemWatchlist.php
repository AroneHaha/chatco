<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

/**
 * Sprint 6 (T3) — A commuter's watchlist entry for a lost item.
 *
 * Created via POST /api/v1/lost-found/{itemId}/watchlist (COMMUTER).
 * Removed via DELETE /api/v1/lost-found/{itemId}/watchlist (COMMUTER).
 * Listed via GET /api/v1/commuter/watchlist (COMMUTER).
 *
 * The watchlist is a UI convenience — commuters bookmark items they think
 * may be theirs so they can track status changes. It does NOT affect claim
 * flow or item status. The unique (item_id, commuter_id) constraint prevents
 * duplicates at the DB level.
 */
class LostItemWatchlist extends Model
{
    use HasFactory;

    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'item_id',
        'commuter_id',
    ];

    protected static function booted(): void
    {
        static::creating(function (LostItemWatchlist $entry) {
            if (empty($entry->id)) {
                $entry->id = (string) Str::uuid();
            }
        });
    }

    public function item()
    {
        return $this->belongsTo(LostItem::class, 'item_id');
    }

    public function commuter()
    {
        return $this->belongsTo(CommuterProfile::class, 'commuter_id');
    }
}
