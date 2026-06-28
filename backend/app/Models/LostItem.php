<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
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
    ];

    protected $casts = [
        'released_at' => 'datetime',
        'closed_at'   => 'datetime',
    ];

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

    public function releasedTo()
    {
        return $this->belongsTo(CommuterProfile::class, 'released_to');
    }

    public function closedBy()
    {
        return $this->belongsTo(User::class, 'closed_by');
    }
}
