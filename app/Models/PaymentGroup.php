<?php

namespace App\Models;

use App\Enums\PaymentMethod;
use Illuminate\Database\Eloquent\Model;

class PaymentGroup extends Model
{
    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = [
        'id', 'reference_number', 'shift_id', 'payment_method', 'pickup_name', 'dropoff_name',
        'passenger_breakdown', 'passenger_count', 'total_amount',
        'payer_id', 'payer_name', 'idempotency_key',
    ];

    protected function casts(): array
    {
        return [
            'payment_method' => PaymentMethod::class,
            'passenger_breakdown' => 'array',
            'passenger_count' => 'integer',
            'total_amount' => 'decimal:2',
        ];
    }

    public function transactions()
    {
        return $this->hasMany(Transaction::class, 'group_id')->orderBy('group_position');
    }

    public function payer()
    {
        return $this->belongsTo(CommuterProfile::class, 'payer_id');
    }
}
