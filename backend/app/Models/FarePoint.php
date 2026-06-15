<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class FarePoint extends Model
{
    use HasFactory;

    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'id',
        'route_id',
        'name',
        'latitude',
        'longitude',
        'fare_from_origin',
    ];

    protected function casts(): array
    {
        return [
            'latitude'         => 'decimal:8',
            'longitude'        => 'decimal:8',
            'fare_from_origin' => 'decimal:2',
        ];
    }

    public function route()
    {
        return $this->belongsTo(Route::class, 'route_id', 'id');
    }
}