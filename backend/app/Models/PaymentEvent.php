<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Append-only log of payment webhook events.
 *
 * Two jobs:
 *   1. Idempotency — unique(provider, event_id) means a replayed webhook is
 *      recorded (and acted on) exactly once.
 *   2. Audit — the raw payload + applied status are kept for support/debugging
 *      and for reconciling against the provider.
 *
 * Never updated after insert; the transaction holds current state.
 */
class PaymentEvent extends Model
{
    protected $fillable = [
        'provider',
        'event_id',
        'transaction_id',
        'type',
        'status',
        'payload',
    ];

    protected function casts(): array
    {
        return [
            'payload' => 'array',
        ];
    }

    public function transaction()
    {
        return $this->belongsTo(Transaction::class, 'transaction_id', 'transaction_id');
    }
}
