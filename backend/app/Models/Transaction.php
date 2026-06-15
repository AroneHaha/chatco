<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Transaction extends Model
{
    use HasFactory;

    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'id',
        'commuter_id',
        'vehicle_id',
        'route_id',
        'fare_amount',
        'payment_method',
        'payment_status',
        'qr_code',
        'trip_date',
    ];

    protected function casts(): array
    {
        return [
            'fare_amount' => 'decimal:2',
            'trip_date'   => 'datetime',
        ];
    }

    public function commuter()
    {
        return $this->belongsTo(User::class, 'commuter_id', 'id');
    }

    public function vehicle()
    {
        return $this->belongsTo(Vehicle::class, 'vehicle_id', 'id');
    }

    public function route()
    {
        return $this->belongsTo(Route::class, 'route_id', 'id');
    }
}