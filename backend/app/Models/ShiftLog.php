<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ShiftLog extends Model
{
    use HasFactory;

    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'id',
        'conductor_id',
        'vehicle_id',
        'shift_start',
        'shift_end',
        'status',
    ];

    protected function casts(): array
    {
        return [
            'shift_start' => 'datetime',
            'shift_end'   => 'datetime',
        ];
    }

    public function conductor()
    {
        return $this->belongsTo(ConductorProfile::class, 'conductor_id', 'id');
    }

    public function vehicle()
    {
        return $this->belongsTo(Vehicle::class, 'vehicle_id', 'id');
    }
}