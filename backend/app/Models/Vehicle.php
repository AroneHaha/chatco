<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Model;

class Vehicle extends Model
{
    use HasFactory, SoftDeletes;

    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'id',
        'unit_number',
        'plate_number',
        'route_id',
        'driver_id',
        'conductor_id',
        'speed',
        'capacity_status',
        'status',
        'latitude',
        'longitude',
        'last_location_update',
    ];

    protected function casts(): array
    {
        return [
            'last_location_update' => 'datetime',
            'latitude'            => 'decimal:8',
            'longitude'           => 'decimal:8',
        ];
    }

    public function route()
    {
        return $this->belongsTo(Route::class, 'route_id', 'id');
    }

    public function driver()
    {
        return $this->belongsTo(Driver::class, 'driver_id', 'id');
    }

    public function conductor()
    {
        return $this->belongsTo(ConductorProfile::class, 'conductor_id', 'id');
    }
}