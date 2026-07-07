<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class Vehicle extends Model
{
    use HasFactory, SoftDeletes;

    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'unit_number',
        'plate_number',
        'vehicle_type',
        'route_id',
        'driver_id',
        'conductor_id',
        'status',
        'speed',
        'capacity_status',
        'latitude',
        'longitude',
        'last_location_update',
        'active_shift_id',
    ];

    protected function casts(): array
    {
        return [
            'speed' => 'integer',
            'latitude' => 'decimal:7',
            'longitude' => 'decimal:7',
            'last_location_update' => 'datetime',
            'active_shift_id' => 'string',
        ];
    }

    /**
     * Auto-generate UUID for the primary key on create.
     * The vehicles table uses a UUID PK (not auto-increment), so the
     * model must populate it before insert — matches the User/Route
     * pattern used elsewhere in the codebase.
     */
    protected static function booted(): void
    {
        static::creating(function (Vehicle $vehicle) {
            if (empty($vehicle->id)) {
                $vehicle->id = (string) Str::uuid();
            }
        });
    }

    public function route()
    {
        return $this->belongsTo(Route::class);
    }

    public function driver()
    {
        return $this->belongsTo(Driver::class);
    }

    public function conductor()
    {
        return $this->belongsTo(ConductorProfile::class, 'conductor_id');
    }


    public function activeShift()
    {
        return $this->belongsTo(ShiftLog::class, 'active_shift_id', 'shift_id');
    }


    public function currentLocation()
    {
        return $this->hasOne(VehicleLocation::class, 'vehicle_id');
    }

    public function shiftLogs()
    {
        return $this->hasMany(ShiftLog::class);
    }

    public function transactions()
    {
        return $this->hasMany(Transaction::class);
    }

    public function hasActiveShift(): bool
    {
        return ! is_null($this->active_shift_id);
    }

    public function getActiveShift(): ?ShiftLog
    {
        return $this->activeShift;
    }
}