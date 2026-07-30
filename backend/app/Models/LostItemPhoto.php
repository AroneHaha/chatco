<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

/**
 * One of up to 3 photos on a lost item. `position` 0 is the thumbnail —
 * LostItemService keeps lost_items.image_url synced to it so every existing
 * single-image read site (grid cards, claim modals, etc.) keeps working.
 */
class LostItemPhoto extends Model
{
    use HasFactory;

    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'item_id',
        'url',
        'position',
    ];

    protected $casts = [
        'position' => 'integer',
    ];

    protected static function booted(): void
    {
        static::creating(function (LostItemPhoto $photo) {
            if (empty($photo->id)) {
                $photo->id = (string) Str::uuid();
            }
        });
    }

    public function item()
    {
        return $this->belongsTo(LostItem::class, 'item_id');
    }
}
