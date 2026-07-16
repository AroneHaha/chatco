<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class SharedRideLink extends Model
{
    use HasFactory;

    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'commuter_id',
        'token',
        'lat',
        'lng',
        'expires_at',
        'last_updated_at',
        'is_active',
    ];

    protected $casts = [
        'expires_at' => 'datetime',
        'last_updated_at' => 'datetime',
        'lat' => 'decimal:7',
        'lng' => 'decimal:7',
        'is_active' => 'boolean',
    ];

    protected static function booted(): void
    {
        static::creating(function (SharedRideLink $link) {
            if (empty($link->id)) {
                $link->id = (string) Str::uuid();
            }
            if (empty($link->token)) {
                $link->token = 'trk_' . Str::random(24);
            }
        });
    }

    public function commuter()
    {
        return $this->belongsTo(CommuterProfile::class, 'commuter_id');
    }

    public function isExpired(): bool
    {
        return $this->expires_at?->isPast() ?? true;
    }
}
