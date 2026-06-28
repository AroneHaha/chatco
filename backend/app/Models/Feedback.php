<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

/**
 * Sprint 6 — Commuter feedback for a shift.
 *
 * Created via POST /api/v1/commuter/feedback. The commuter scans the unit QR
 * (POST /api/v1/qr/scan), which resolves today's shift_id + driver +
 * conductor for that vehicle, then submits a rating + optional comment. The
 * record is visible on both the driver's and conductor's profiles.
 */
class Feedback extends Model
{
    use HasFactory;

    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'shift_id',
        'vehicle_id',
        'driver_id',
        'conductor_id',
        'commuter_id',
        'rating',
        'category',
        'comment',
    ];

    protected function casts(): array
    {
        return [
            'rating' => 'integer',
        ];
    }

    protected static function booted(): void
    {
        static::creating(function (Feedback $feedback) {
            if (empty($feedback->id)) {
                $feedback->id = (string) Str::uuid();
            }
        });
    }

    public function shift()
    {
        return $this->belongsTo(ShiftLog::class, 'shift_id', 'shift_id');
    }

    public function vehicle()
    {
        return $this->belongsTo(Vehicle::class);
    }

    public function driver()
    {
        return $this->belongsTo(Driver::class);
    }

    public function conductor()
    {
        // shift_logs.conductor_id references conductor_profiles.id
        return $this->belongsTo(ConductorProfile::class, 'conductor_id');
    }

    public function commuter()
    {
        return $this->belongsTo(CommuterProfile::class, 'commuter_id');
    }
}
