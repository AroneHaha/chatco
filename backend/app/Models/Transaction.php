<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Transaction extends Model
{
    use HasFactory;

    public $incrementing = false;
    protected $keyType = 'string';
    protected $primaryKey = 'transaction_id';

    protected $fillable = [
        'transaction_id',
        'shift_id',
        'payment_method',
        'final_amount',
        'passenger_id',
        'passenger_name',
        'passenger_role',
        'pickup_stop_id',
        'dropoff_stop_id',
        'pickup_name',
        'dropoff_name',
        'distance',
        'base_fare',
        'succeeding_km',
        'discount_amount',
        'conductor_name',
        'unit_number',
        'driver_name',
        'voucher_id',
    ];

    protected function casts(): array
    {
        return [
            'final_amount' => 'decimal:2',
            'distance' => 'decimal:2',
            'base_fare' => 'decimal:2',
            'succeeding_km' => 'decimal:2',
            'discount_amount' => 'decimal:2',
        ];
    }

    public function shiftLog()
    {
        return $this->belongsTo(ShiftLog::class, 'shift_id', 'shift_id');
    }

    public function passenger()
    {
        return $this->belongsTo(CommuterProfile::class, 'passenger_id');
    }

    public function pickupStop()
    {
        return $this->belongsTo(FarePoint::class, 'pickup_stop_id');
    }

    public function dropoffStop()
    {
        return $this->belongsTo(FarePoint::class, 'dropoff_stop_id');
    }

    public function voucher()
    {
        return $this->belongsTo(Voucher::class);
    }
}