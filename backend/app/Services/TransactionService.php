<?php

namespace App\Services;

use App\Models\ShiftLog;
use App\Models\Transaction;
use App\Models\User;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Str;

/**
 * TransactionService — sole gatekeeper for ALL fare/payment business logic.
 *
 * Controllers stay thin; this service handles:
 *   - Cash fare recording (immediate PAID)
 *   - GCash fare initiation (PENDING + binding QR)
 *   - GCash claim (commuter scans QR, binds passenger_id)
 *   - GCash confirmation (webhook flips PENDING → PAID)
 *   - Shift transaction listing
 *   - Cash vs GCash earnings breakdown
 *
 * Payment flow (S4 clarified):
 *   - CASH:  recorded IMMEDIATELY as PAID. Cash is physically remitted at
 *            end of shift. No fare_point UUIDs (fare read from matrix).
 *   - GCASH: conductor initiates (PENDING + opaque qr_token). Commuter
 *            scans QR to claim (sets passenger_id). PayMongo webhook
 *            confirms (flips to PAID + paid_at). GCash is RECORD-ONLY --
 *            NOT physically remitted.
 *   - NO wallet / balance anywhere.
 *
 * Idempotency (recordCashFare):
 *   Uses a natural key: same shift_id + final_amount + pickup_name +
 *   dropoff_name within a 60-second window. If a matching PAID
 *   transaction exists, returns it instead of creating a duplicate.
 *   This handles accidental double-clicks (the common case) without
 *   requiring a schema change or frontend-generated idempotency_key.
 */
class TransactionService
{
    /**
     * Idempotency window in seconds. Two cash fares with the same
     * shift + amount + pickup + dropoff within this window are treated
     * as a duplicate submit and the existing transaction is returned.
     */
    private const IDEMPOTENCY_WINDOW_SECONDS = 60;

    /**
     * GCash transactions are claimable for this many minutes after
     * creation. After that, claimGcash returns 410 Gone.
     */
    private const GCASH_CLAIM_TTL_MINUTES = 5;

    public function __construct(
        private PaymentService $paymentService
    ) {}

    // ─── Cash Flow ──────────────────────────────────────────────────

    /**
     * Record a cash fare immediately as PAID.
     *
     * Idempotent: if a matching transaction exists (same shift + amount +
     * pickup + dropoff within the idempotency window), returns it instead
     * of creating a duplicate.
     *
     * @param  User    $conductor  The conductor recording the fare
     * @param  array   $data       {
     *     final_amount:    float (required) -- the fare charged
     *     base_fare:        float (optional) -- matrix base fare
     *     distance:         float (optional) -- km between pickup/dropoff
     *     discount_amount:  float (optional) -- discount applied
     *     pickup_name:      string (optional) -- human-readable pickup
     *     dropoff_name:     string (optional) -- human-readable dropoff
     *     passenger_name:   string (optional) -- passenger display name
     *     passenger_role:   string (optional) -- REGULAR/STUDENT/SENIOR/PWD
     * }
     *
     * @return Transaction  The created (or existing) PAID transaction
     *
     * @throws \Symfony\Component\HttpKernel\Exception\HttpException
     *         422 if conductor has no active shift
     */
    public function recordCashFare(User $conductor, array $data): Transaction
    {
        $shift = $this->resolveConductorActiveShift($conductor);

        $finalAmount    = (float) ($data['final_amount'] ?? 0);
        $pickupName     = $data['pickup_name'] ?? null;
        $dropoffName    = $data['dropoff_name'] ?? null;

        // ─── Idempotency check ──────────────────────────────────────
        // Natural key: shift + amount + pickup + dropoff within 60s window
        $existing = Transaction::query()
            ->where('shift_id', $shift->shift_id)
            ->where('payment_method', 'CASH')
            ->where('final_amount', $finalAmount)
            ->where('pickup_name', $pickupName)
            ->where('dropoff_name', $dropoffName)
            ->where('status', 'PAID')
            ->where('created_at', '>=', now()->subSeconds(self::IDEMPOTENCY_WINDOW_SECONDS))
            ->first();

        if ($existing) {
            return $existing;
        }

        // ─── Persist with denormalized conductor/vehicle/driver info ──
        return Transaction::create([
            'transaction_id'   => $this->generateTransactionId(),
            'shift_id'         => $shift->shift_id,
            'payment_method'   => 'CASH',
            'status'           => 'PAID',
            'final_amount'     => $finalAmount,
            'base_fare'        => isset($data['base_fare']) ? (float) $data['base_fare'] : null,
            'distance'         => isset($data['distance']) ? (float) $data['distance'] : null,
            'discount_amount'  => isset($data['discount_amount']) ? (float) $data['discount_amount'] : null,
            'pickup_name'      => $pickupName,
            'dropoff_name'     => $dropoffName,
            'passenger_name'   => $data['passenger_name'] ?? null,
            'passenger_role'   => $data['passenger_role'] ?? null,
            // Denormalized from shift_log for fast reporting without JOINs
            'conductor_name'   => $shift->conductor_name,
            'unit_number'      => $shift->unit_number,
            'driver_name'      => $shift->driver_name,
            // Cash has no fare_point UUIDs (S4-T1 made these nullable)
            'pickup_stop_id'   => null,
            'dropoff_stop_id'  => null,
            'paid_at'          => now(),
        ]);
    }

    // ─── GCash Flow ─────────────────────────────────────────────────

    /**
     * Initiate a GCash fare: create a PENDING transaction + binding QR.
     *
     * The conductor generates this; the commuter scans the QR to claim.
     * PayMongo SANDBOX authorize happens after claim.
     *
     * @param  User    $conductor  The conductor initiating the GCash fare
     * @param  array   $data       {
     *     final_amount:    float (required) -- the fare to charge via GCash
     *     pickup_name:      string (optional)
     *     dropoff_name:     string (optional)
     *     passenger_name:   string (optional) -- usually null until claim
     * }
     *
     * @return array {
     *     transaction:  Transaction  -- the PENDING transaction row
     *     qr_token:     string       -- opaque token for the binding QR
     *     checkout_url: string|null  -- PayMongo hosted URL (null until PaymentService implemented)
     *     amount:       float        -- the amount to charge
     *     expires_at:   string       -- ISO 8601 timestamp when the QR/transaction expires
     * }
     *
     * @throws \Symfony\Component\HttpKernel\Exception\HttpException
     *         422 if conductor has no active shift
     * @throws \RuntimeException  If PaymentService::createGcashIntent() throws
     *         (currently always -- PayMongo integration is a stub)
     */
    public function initiateGcashFare(User $conductor, array $data): array
    {
        $shift = $this->resolveConductorActiveShift($conductor);

        $finalAmount = (float) ($data['final_amount'] ?? 0);
        $amountCentavos = (int) round($finalAmount * 100);

        // Generate a unique qr_token (32-char hex, opaque -- NOT the transaction_id)
        $qrToken = Str::random(32);
        $expiresAt = now()->addMinutes(self::GCASH_CLAIM_TTL_MINUTES);

        // Create the PENDING transaction first so we have the transaction_id
        // for PayMongo metadata
        $transaction = Transaction::create([
            'transaction_id'  => $this->generateTransactionId(),
            'shift_id'        => $shift->shift_id,
            'payment_method'  => 'GCASH',
            'status'          => 'PENDING',
            'final_amount'    => $finalAmount,
            'pickup_name'     => $data['pickup_name'] ?? null,
            'dropoff_name'    => $data['dropoff_name'] ?? null,
            'passenger_name'  => $data['passenger_name'] ?? null,
            'conductor_name'  => $shift->conductor_name,
            'unit_number'     => $shift->unit_number,
            'driver_name'     => $shift->driver_name,
            'pickup_stop_id'  => null,
            'dropoff_stop_id' => null,
            'qr_token'        => $qrToken,
            // paymongo_intent_id + paymongo_checkout_url set below
        ]);

        // Call PaymentService to create the PayMongo PaymentIntent.
        // Currently throws RuntimeException (stub) -- when implemented,
        // it returns ['intent_id' => ..., 'checkout_url' => ...].
        $checkoutUrl = null;
        $paymongoIntentId = null;
        try {
            $intent = $this->paymentService->createGcashIntent($amountCentavos, [
                'transaction_id' => $transaction->transaction_id,
                'shift_id'       => $shift->shift_id,
                'qr_token'       => $qrToken,
            ]);
            $paymongoIntentId = $intent['intent_id'] ?? null;
            $checkoutUrl      = $intent['checkout_url'] ?? null;

            $transaction->update([
                'paymongo_intent_id'    => $paymongoIntentId,
                'paymongo_checkout_url' => $checkoutUrl,
            ]);
            $transaction->refresh();
        } catch (\RuntimeException $e) {
            // PaymentService is a stub -- leave paymongo_intent_id + checkout_url null.
            // The transaction is still PENDING with a valid qr_token; the conductor
            // can show the QR and the commuter can claim. PayMongo authorize happens
            // later. This keeps the flow testable end-to-end without a real PayMongo key.
            // Re-throw if you want strict behavior:
            // throw $e;
        }

        return [
            'transaction'  => $transaction,
            'qr_token'     => $qrToken,
            'checkout_url' => $checkoutUrl,
            'amount'       => $finalAmount,
            'expires_at'   => $expiresAt->toIso8601String(),
        ];
    }

    /**
     * Claim a GCash transaction by scanning the binding QR.
     *
     * Idempotent: if the same commuter already claimed it, returns the
     * transaction (no error). If a DIFFERENT commuter already claimed,
     * returns 409.
     *
     * @param  User    $commuter  The commuter scanning the QR
     * @param  string  $qrToken   The opaque token from the QR
     *
     * @return array {
     *     transaction_id:  string
     *     checkout_url:     string|null
     *     amount:           float
     *     pickup_name:      string|null
     *     dropoff_name:     string|null
     * }
     *
     * @throws \Symfony\Component\HttpKernel\Exception\HttpException
     *         404 if no transaction has this qr_token
     *         410 if transaction is not claimable (PAID, FAILED, or expired)
     *         409 if a different commuter already claimed it
     *         422 if the commuter has no commuter_profile (cannot claim)
     */
    public function claimGcash(User $commuter, string $qrToken): array
    {
        $transaction = Transaction::where('qr_token', $qrToken)->first();

        if (! $transaction) {
            abort(404, 'Transaction not found');
        }

        // 410 if not claimable: PAID, FAILED, or expired (created > TTL minutes ago)
        if ($transaction->status !== 'PENDING') {
            abort(410, 'Transaction is no longer claimable');
        }

        $createdAt = $transaction->created_at;
        if ($createdAt && $createdAt->diffInMinutes(now()) > self::GCASH_CLAIM_TTL_MINUTES) {
            abort(410, 'Transaction has expired');
        }

        // The commuter must have a commuter_profile (the passenger_id FK
        // references commuter_profiles.id, not users.id)
        $commuterProfile = $commuter->commuterProfile;
        if (! $commuterProfile) {
            abort(422, 'Commuter profile required to claim a GCash transaction');
        }

        // Idempotent: same commuter already claimed -> return the transaction
        if ($transaction->passenger_id !== null) {
            if ($transaction->passenger_id === $commuterProfile->id) {
                return $this->formatClaimResponse($transaction);
            }
            // Different commuter already claimed
            abort(409, 'Transaction already claimed by another commuter');
        }

        // Bind the commuter
        $transaction->update([
            'passenger_id'   => $commuterProfile->id,
            'passenger_name' => $commuterProfile->first_name . ' ' . $commuterProfile->surname,
        ]);
        $transaction->refresh();

        return $this->formatClaimResponse($transaction);
    }

    /**
     * Mark a transaction as PAID. Called by the PayMongo webhook.
     *
     * Idempotent: no-op if already PAID.
     *
     * @param  Transaction  $transaction
     * @return Transaction  The updated transaction
     */
    public function markPaid(Transaction $transaction): Transaction
    {
        if ($transaction->status === 'PAID') {
            return $transaction;
        }

        $transaction->update([
            'status'  => 'PAID',
            'paid_at' => now(),
        ]);
        $transaction->refresh();

        return $transaction;
    }

    /**
     * Mark a transaction as FAILED. Called by the PayMongo webhook.
     *
     * @param  Transaction  $transaction
     * @return Transaction  The updated transaction
     */
    public function markFailed(Transaction $transaction): Transaction
    {
        if ($transaction->status === 'FAILED') {
            return $transaction;
        }

        $transaction->update(['status' => 'FAILED']);
        $transaction->refresh();

        return $transaction;
    }

    // ─── Listing + Earnings ─────────────────────────────────────────

    /**
     * List all transactions for a shift, scoped to the conductor's own shift.
     *
     * @param  User    $conductor
     * @param  string  $shiftId
     *
     * @return Collection<Transaction>
     *
     * @throws \Symfony\Component\HttpKernel\Exception\HttpException
     *         403 if the shift does not belong to this conductor
     *         404 if the shift does not exist
     */
    public function getShiftTransactions(User $conductor, string $shiftId): Collection
    {
        $shift = $this->verifyShiftOwnership($conductor, $shiftId);

        return Transaction::where('shift_id', $shift->shift_id)
            ->orderBy('created_at', 'desc')
            ->get();
    }

    /**
     * Get the cash vs GCash earnings breakdown for a shift.
     *
     * - cash_total  = sum of final_amount where payment_method=CASH AND status=PAID
     * - gcash_total = sum of final_amount where payment_method=GCASH AND status=PAID
     * - total       = cash_total + gcash_total
     *
     * GCash only counts toward earnings after PAID (PENDING GCash is not
     * counted -- it may still FAIL). cash_total is the remit figure;
     * gcash_total is record-only (not physically remitted).
     *
     * @param  User    $conductor
     * @param  string  $shiftId
     *
     * @return array{ cash_total: float, gcash_total: float, total: float }
     *
     * @throws \Symfony\Component\HttpKernel\Exception\HttpException
     *         403 if the shift does not belong to this conductor
     *         404 if the shift does not exist
     */
    public function getShiftEarnings(User $conductor, string $shiftId): array
    {
        $shift = $this->verifyShiftOwnership($conductor, $shiftId);

        $cashTotal = (float) Transaction::query()
            ->where('shift_id', $shift->shift_id)
            ->cash()
            ->paid()
            ->sum('final_amount');

        $gcashTotal = (float) Transaction::query()
            ->where('shift_id', $shift->shift_id)
            ->gcash()
            ->paid()
            ->sum('final_amount');

        return [
            'cash_total'  => $cashTotal,
            'gcash_total' => $gcashTotal,
            'total'       => $cashTotal + $gcashTotal,
        ];
    }

    // ─── Internal Helpers ───────────────────────────────────────────

    /**
     * Resolve the conductor's currently active shift. Aborts 422 if none.
     *
     * Note: shift_logs.conductor_id FK → conductor_profiles.id, so we
     * query by $conductor->conductorProfile->id, not $conductor->id.
     */
    private function resolveConductorActiveShift(User $conductor): ShiftLog
    {
        $conductorProfileId = $conductor->conductorProfile?->id;

        if (! $conductorProfileId) {
            abort(422, 'Conductor profile required');
        }

        $shift = ShiftLog::where('conductor_id', $conductorProfileId)
            ->active()
            ->first();

        if (! $shift) {
            abort(422, 'No active shift');
        }

        return $shift;
    }

    /**
     * Verify that the given shift belongs to the given conductor.
     * Aborts 404 if shift missing, 403 if not owned.
     */
    private function verifyShiftOwnership(User $conductor, string $shiftId): ShiftLog
    {
        $shift = ShiftLog::where('shift_id', $shiftId)->first();

        if (! $shift) {
            abort(404, 'Shift not found');
        }

        $conductorProfileId = $conductor->conductorProfile?->id;
        if (! $conductorProfileId || $shift->conductor_id !== $conductorProfileId) {
            abort(403, 'Forbidden');
        }

        return $shift;
    }

    /**
     * Generate a unique transaction_id (e.g., "TXN-ABC123XYZ").
     * 20 chars max to fit the varchar(30) column with room.
     */
    private function generateTransactionId(): string
    {
        return 'TXN-' . strtoupper(Str::random(15));
    }

    /**
     * Format the claimGcash response payload.
     */
    private function formatClaimResponse(Transaction $transaction): array
    {
        return [
            'transaction_id' => $transaction->transaction_id,
            'checkout_url'   => $transaction->paymongo_checkout_url,
            'amount'         => (float) $transaction->final_amount,
            'pickup_name'    => $transaction->pickup_name,
            'dropoff_name'   => $transaction->dropoff_name,
        ];
    }
}
