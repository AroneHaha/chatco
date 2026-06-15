<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class ShiftLog extends Model
{
    use HasFactory, SoftDeletes;

    public $incrementing = false;
    protected $keyType = 'string';
    protected $primaryKey = 'shift_id';

    protected $fillable = [
        'shift_id',
        'conductor_id',
        'conductor_name',
        'driver_id',
        'driver_name',
        'vehicle_id',
        'unit_number',
        'plate_number',
        'route_id',
        'route_name',
        'time_in',
        'time_out',
        'is_active',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'time_in' => 'datetime',
            'time_out' => 'datetime',
            'is_active' => 'boolean',
        ];
    }

    public function conductor()
    {
        return $this->belongsTo(ConductorProfile::class, 'conductor_id');
    }

    public function driver()
    {
        return $this->belongsTo(Driver::class);
    }

    public function vehicle()
    {
        return $this->belongsTo(Vehicle::class);
    }

    public function route()
    {
        return $this->belongsTo(Route::class);
    }
}