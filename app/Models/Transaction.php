<?php

namespace App\Models;

use App\Enums\PaymentMethod;
use App\Enums\PaymentStatus;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/**
 * App\Models\Transaction
 *
 * A single fare record. Payment is provider-agnostic:
 *   - CASH:  recorded immediately as PAID (fare matrix; no fare_point UUIDs).
 *            Physically remitted at end of shift.
 *   - GCASH: settled through a payment gateway. Starts PENDING with an opaque
 *            qr_token; the commuter claims it (sets passenger_id), authorizes
 *            on the provider, and a webhook drives it to PAID/FAILED. The
 *            gateway is identified by `payment_provider`; the provider intent
 *            reference is `payment_reference`. Record-only at remittance.
 *
 * No wallet / balance anywhere in the schema.
 */
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
        'status',
        'qr_token',
        'paid_at',
        'idempotency_key',
        // ─── Provider-agnostic payment columns ────────────────────────
        'payment_provider',
        'payment_reference',
        'payment_checkout_url',
        'payment_metadata',
    ];

    protected function casts(): array
    {
        return [
            'final_amount' => 'decimal:2',
            'distance' => 'decimal:2',
            'base_fare' => 'decimal:2',
            'succeeding_km' => 'decimal:2',
            'discount_amount' => 'decimal:2',
            'paid_at' => 'datetime',
            'payment_method' => PaymentMethod::class,
            'status' => PaymentStatus::class,
            'payment_metadata' => 'array',
        ];
    }

    // ─── Relationships ──────────────────────────────────────────────

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

    /**
     * Webhook events received for this transaction (audit trail).
     */
    public function paymentEvents()
    {
        return $this->hasMany(PaymentEvent::class, 'transaction_id', 'transaction_id');
    }

    // ─── Query Scopes ───────────────────────────────────────────────

    public function scopeCash(Builder $query): void
    {
        $query->where('payment_method', PaymentMethod::CASH->value);
    }

    public function scopeGcash(Builder $query): void
    {
        $query->where('payment_method', PaymentMethod::GCASH->value);
    }

    public function scopePaid(Builder $query): void
    {
        $query->where('status', PaymentStatus::PAID->value);
    }
}
