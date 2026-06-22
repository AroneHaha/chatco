<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/**
 * App\Models\Transaction
 *
 * S4-T1: Finalized for cash + GCash fare persistence.
 *
 * Payment flow:
 *   - CASH:  inserted with status=PAID immediately (fare matrix lookup,
 *            no fare_point UUIDs). pickup_stop_id/dropoff_stop_id are NULL.
 *            Cash is physically remitted at end of shift.
 *   - GCASH: inserted with status=PENDING + a unique qr_token (opaque,
 *            NOT the transaction_id). Conductor generates the QR;
 *            commuter scans it to claim (sets passenger_id). Commuter
 *            authorizes via PayMongo SANDBOX; webhook flips status to
 *            PAID and sets paid_at. GCash is record-only -- NOT
 *            physically remitted.
 *   - FAILED: PayMongo authorize failed; row kept for audit.
 *
 * No wallet / balance anywhere in the schema.
 */
class Transaction extends Model
{
    use HasFactory;

    public $incrementing = false;
    protected $keyType = 'string';
    protected $primaryKey = 'transaction_id';

    /**
     * Mass-assignable attributes.
     *
     * S4-T1 added: status, paymongo_intent_id, paymongo_checkout_url,
     * qr_token, paid_at. (payment_method was already fillable.)
     */
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
        // ─── S4-T1 additions ──────────────────────────────────────────
        'status',
        'paymongo_intent_id',
        'paymongo_checkout_url',
        'qr_token',
        'paid_at',
        // ─── S4 hardening ─────────────────────────────────────────────
        'idempotency_key',
    ];

    /**
     * Attribute casts.
     *
     * S4-T1 added: paid_at => datetime. All money columns already cast
     * to decimal:2 (final_amount, base_fare, discount_amount, distance,
     * succeeding_km).
     */
    protected function casts(): array
    {
        return [
            'final_amount' => 'decimal:2',
            'distance' => 'decimal:2',
            'base_fare' => 'decimal:2',
            'succeeding_km' => 'decimal:2',
            'discount_amount' => 'decimal:2',
            // ─── S4-T1 additions ──────────────────────────────────────────
            'paid_at' => 'datetime',
        ];
    }

    // ─── Relationships ──────────────────────────────────────────────

    /**
     * The shift this transaction belongs to.
     * FK: transactions.shift_id -> shift_logs.shift_id
     */
    public function shiftLog()
    {
        return $this->belongsTo(ShiftLog::class, 'shift_id', 'shift_id');
    }

    /**
     * The commuter who claimed this transaction (null for cash fares
     * and unclaimed GCash transactions).
     * FK: transactions.passenger_id -> commuter_profiles.id
     */
    public function passenger()
    {
        return $this->belongsTo(CommuterProfile::class, 'passenger_id');
    }

    /**
     * Pickup fare point (nullable -- cash fares have no fare_point UUID).
     * FK: transactions.pickup_stop_id -> fare_points.id
     */
    public function pickupStop()
    {
        return $this->belongsTo(FarePoint::class, 'pickup_stop_id');
    }

    /**
     * Dropoff fare point (nullable -- cash fares have no fare_point UUID).
     * FK: transactions.dropoff_stop_id -> fare_points.id
     */
    public function dropoffStop()
    {
        return $this->belongsTo(FarePoint::class, 'dropoff_stop_id');
    }

    /**
     * The voucher applied to this transaction (if any).
     * FK: transactions.voucher_id -> vouchers.id
     */
    public function voucher()
    {
        return $this->belongsTo(Voucher::class);
    }

    // ─── Query Scopes (S4-T1) ───────────────────────────────────────

    /**
     * Scope: cash transactions only.
     * Used by S4-T2 earnings breakdown to compute physically-remitted cash.
     *
     * @param  Builder  $query
     */
    public function scopeCash(Builder $query): void
    {
        $query->where('payment_method', 'CASH');
    }

    /**
     * Scope: GCash transactions only.
     * Used by S4-T2 earnings breakdown to compute record-only GCash totals.
     *
     * @param  Builder  $query
     */
    public function scopeGcash(Builder $query): void
    {
        $query->where('payment_method', 'GCASH');
    }

    /**
     * Scope: paid transactions only (cash + GCash combined).
     * Used by S4-T2 earnings breakdown to compute total realized revenue.
     *
     * @param  Builder  $query
     */
    public function scopePaid(Builder $query): void
    {
        $query->where('status', 'PAID');
    }
}
