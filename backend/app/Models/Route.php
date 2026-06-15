<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Route extends Model
{
    use HasFactory;

    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'id',
        'name',
        'status',
        'waypoints',
    ];

    protected function casts(): array
    {
        return [
            'waypoints' => 'array',
        ];
    }

    public function vehicles()
    {
        return $this->hasMany(Vehicle::class, 'route_id', 'id');
    }

    public function farePoints()
    {
        return $this->hasMany(FarePoint::class, 'route_id', 'id');
    }
}