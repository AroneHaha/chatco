<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class GcashPaymentIntent extends Model
{
    use HasFactory;

    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'amount',
        'amount_in_centavos',
        'currency',
        'status',
        'payment_method',
        'commuter_id',
        'commuter_name',
        'pickup_point',
        'dropoff_point',
        'vehicle_id',
        'conductor_id',
        'shift_id',
        'paymongo_payment_id',
        'redirect_url',
    ];

    protected function casts(): array
    {
        return [
            'amount' => 'decimal:2',
            'amount_in_centavos' => 'integer',
            'pickup_point' => 'integer',
            'dropoff_point' => 'integer',
        ];
    }

    public function commuter()
    {
        return $this->belongsTo(CommuterProfile::class, 'commuter_id');
    }

    public function vehicle()
    {
        return $this->belongsTo(Vehicle::class);
    }

    public function conductor()
    {
        return $this->belongsTo(ConductorProfile::class, 'conductor_id');
    }

    public function shiftLog()
    {
        return $this->belongsTo(ShiftLog::class, 'shift_id', 'shift_id');
    }
}