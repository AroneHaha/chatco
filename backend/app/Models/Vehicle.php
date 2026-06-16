<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Vehicle extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'unit_number',
        'plate_number',
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