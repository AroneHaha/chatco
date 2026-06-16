<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class VehicleLocation extends Model
{
    use HasFactory;

    protected $table = 'vehicle_locations';

    protected $primaryKey = 'vehicle_id';

    public $incrementing = false;

    protected $keyType = 'string';

    const CREATED_AT = null;

    protected $fillable = [
        'vehicle_id',
        'conductor_id',
        'lat',
        'lng',
        'speed',
        'heading',
        'capacity_status',
    ];

    protected function casts(): array
    {
        return [
            'lat' => 'decimal:7',
            'lng' => 'decimal:7',
            'speed' => 'decimal:2',
            'heading' => 'decimal:2',
            'updated_at' => 'datetime',
        ];
    }

    public function vehicle()
    {
        return $this->belongsTo(Vehicle::class, 'vehicle_id');
    }

    public function conductor()
    {
        return $this->belongsTo(User::class, 'conductor_id');
    }
}