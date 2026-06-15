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
        'id',
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
    ];

    protected function casts(): array
    {
        return [
            'speed' => 'integer',
            'latitude' => 'decimal:7',
            'longitude' => 'decimal:7',
            'last_location_update' => 'datetime',
        ];
    }

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

    public function shiftLogs()
    {
        return $this->hasMany(ShiftLog::class);
    }

    public function transactions()
    {
        return $this->hasMany(Transaction::class);
    }
}