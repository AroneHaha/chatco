<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

/**
 * Sprint 6 (T5) — SOS alert from a commuter OR conductor in distress.
 *
 * Created via POST /api/v1/commuter/sos or /api/v1/conductor/sos. The
 * sender_role column ('COMMUTER' | 'CONDUCTOR') discriminates the source;
 * exactly one of commuter_id / conductor_id is populated. Status lifecycle:
 *   ACTIVE → ACKNOWLEDGED (admin sees it) → RESOLVED (admin closes)
 *
 * The alert is a notification + audit record only — no emergency dispatch,
 * no payments, no account mutation. Rate-limited per sender.
 */
class SosAlert extends Model
{
    use HasFactory;

    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'sender_role',
        'commuter_id',
        'conductor_id',
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

    public function conductor()
    {
        return $this->belongsTo(ConductorProfile::class, 'conductor_id');
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
