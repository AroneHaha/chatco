<?php

namespace App\Models;

use App\Enums\PassengerType;
use Illuminate\Database\Eloquent\Model;

class TransactionPassenger extends Model
{
    protected $fillable = [
        'transaction_id',
        'passenger_type',
        'quantity',
        'unit_fare',
        'unit_discount_amount',
        'subtotal',
    ];

    protected function casts(): array
    {
        return [
            'passenger_type' => PassengerType::class,
            'quantity' => 'integer',
            'unit_fare' => 'decimal:2',
            'unit_discount_amount' => 'decimal:2',
            'subtotal' => 'decimal:2',
        ];
    }

    public function transaction()
    {
        return $this->belongsTo(Transaction::class, 'transaction_id', 'transaction_id');
    }
}
