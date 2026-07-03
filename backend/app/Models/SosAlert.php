<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

/**
 * Sprint 6 (T5) — SOS alert from a commuter in distress.
 *
 * Created via POST /api/v1/commuter/sos. Status lifecycle:
 *   ACTIVE → ACKNOWLEDGED (admin sees it) → RESOLVED (admin closes)
 *
 * The alert is a notification + audit record only — no emergency dispatch,
 * no payments, no account mutation. Rate-limited at 1 per 5 min per commuter.
 */
class SosAlert extends Model
{
    use HasFactory;

    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'commuter_id',
        'lat',
        'lng',
        'note',
        'status',
        'acknowledged_by',
        'acknowledged_at',
        'resolved_by',
        'resolved_at',
    ];

    protected $casts = [
        'lat'             => 'decimal:7',
        'lng'             => 'decimal:7',
        'acknowledged_at' => 'datetime',
        'resolved_at'     => 'datetime',
    ];

    protected static function booted(): void
    {
        static::creating(function (SosAlert $alert) {
            if (empty($alert->id)) {
                $alert->id = (string) Str::uuid();
            }
        });
    }

    public function commuter()
    {
        return $this->belongsTo(CommuterProfile::class, 'commuter_id');
    }

    public function acknowledger()
    {
        return $this->belongsTo(User::class, 'acknowledged_by');
    }

    public function resolver()
    {
        return $this->belongsTo(User::class, 'resolved_by');
    }
}
