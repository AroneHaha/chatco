<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * A recorded overspeeding episode for the admin monitoring history.
 * One row per continuous stretch above the limit within a shift — a shift
 * can have multiple rows. `ended_at` is null while the episode is still
 * open (conductor still over the limit as of `last_logged_at`).
 */
class OverspeedEvent extends Model
{
    protected $fillable = [
        'shift_id',
        'conductor_id',
        'driver_id',
        'vehicle_id',
        'conductor_name',
        'driver_name',
        'unit_number',
        'plate_number',
        'top_speed',
        'threshold',
        'latitude',
        'longitude',
        'accuracy_m',
        'date',
        'last_logged_at',
        'ended_at',
    ];

    protected function casts(): array
    {
        return [
            'top_speed' => 'integer',
            'threshold' => 'integer',
            'date' => 'date',
            'last_logged_at' => 'datetime',
            'ended_at' => 'datetime',
        ];
    }
}
