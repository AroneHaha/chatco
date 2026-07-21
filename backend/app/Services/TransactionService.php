<?php

namespace App\Services;

use App\Enums\PaymentMethod;
use App\Enums\PaymentStatus;
use App\Models\ShiftLog;
use App\Models\Transaction;
use App\Models\User;
use App\Support\Payments\PaymentGatewayException;
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
 *   Dedupes ONLY on the client-supplied idempotency_key (a fresh UUID per
 *   "record fare" action, unique-indexed at the DB layer). A replayed
 *   request returns the existing row; distinct fares are always kept.
 *   NOTE: it deliberately does NOT use a natural key (shift+amount+pickup+
 *   dropoff) — multiple passengers paying the same fare for the same
 *   segment within seconds is normal and must each be recorded.
 */
class TransactionService
{
    public function __construct(
        private PaymentService $paymentService
    ) {}

    /**
     * Minutes a conductor-generated GCash binding QR / PENDING transaction
     * stays claimable (config-driven). After that, claimGcash returns 410.
     */
    private function claimTtlMinutes(): int
    {
        return (int) config('payments.gcash_claim_ttl_minutes', 10);
    }

    /**
     * How long a printed cash receipt's QR stays claimable, in hours.
     */
    private function receiptTtlHours(): int
    {
        return (int) config('payments.cash_receipt_ttl_hours', 6);
    }

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

        $paymentMethod  = $data['payment_method'] ?? 'CASH';
        $finalAmount    = (float) ($data['final_amount'] ?? 0);
        $pickupName     = $data['pickup_name'] ?? null;
        $dropoffName    = $data['dropoff_name'] ?? null;
        $idempotencyKey = $data['idempotency_key'] ?? null;

        // ─── Idempotency check ──────────────────────────────────────
        if ($idempotencyKey) {
            $existing = Transaction::where('idempotency_key', $idempotencyKey)->first();
            if ($existing) {
                return $existing;
            }
        }

        // ─── Voucher validation (if payment_method is VOUCHER) ──────
        // The conductor enters the voucher code shown by the commuter.
        // We validate it exists, is AVAILABLE, and hasn't expired. On
        // success: mark it USED + bind the commuter's passenger_id +
        // set final_amount=0 (free ride).
        $voucherId = null;
        $passengerId = $data['passenger_id'] ?? null;
        $passengerName = $data['passenger_name'] ?? null;

        if ($paymentMethod === PaymentMethod::VOUCHER->value) {
            $voucherCode = $data['voucher_code'] ?? null;
            if (! $voucherCode) {
                abort(422, 'Voucher code is required for voucher payments.');
            }

            $voucher = \App\Models\Voucher::where('code', $voucherCode)->first();
            if (! $voucher) {
                abort(422, 'Voucher code not found.');
            }

            if ($voucher->status !== 'AVAILABLE') {
                abort(422, "This voucher is {$voucher->status} and cannot be used.");
            }

            if ($voucher->expires_at && $voucher->expires_at->isPast()) {
                abort(422, 'This voucher has expired.');
            }

            // Mark the voucher as USED + bind the commuter.
            $voucher->update(['status' => 'USED']);
            $voucherId = $voucher->id;
            $passengerId = $voucher->commuter_id;

            // Look up the commuter's name for the denormalized field.
            if ($passengerId) {
                $commuterProfile = \App\Models\CommuterProfile::find($passengerId);
                if ($commuterProfile) {
                    $passengerName = trim($commuterProfile->first_name . ' ' . $commuterProfile->surname);
                }
            }

            // Free ride — override the amount to 0.
            $finalAmount = 0;
        }

        // ─── Receipt binding token (CASH only) ──────────────────────
        // Cash involves no account, so the ride would never reach a commuter's
        // reward cycle. Mint the same kind of opaque token the GCash QR uses;
        // the printed receipt carries it, and the commuter can scan it later
        // (POST /commuter/receipts/claim) to bind the ride to their account.
        //
        // Skipped when a passenger is already bound (VOUCHER rides, or a
        // conductor-attributed fare) — there is nothing left to claim.
        $receiptToken = null;
        if ($paymentMethod === PaymentMethod::CASH->value && $passengerId === null) {
            $receiptToken = Str::random(32);
        }

        // ─── Persist with denormalized conductor/vehicle/driver info ──
        return Transaction::create([
            'transaction_id'   => $this->generateTransactionId(),
            'shift_id'         => $shift->shift_id,
            'payment_method'   => $paymentMethod,
            'status'           => PaymentStatus::PAID->value,
            'qr_token'         => $receiptToken,
            'idempotency_key'  => $idempotencyKey,
            'final_amount'     => $finalAmount,
            'base_fare'        => isset($data['base_fare']) ? (float) $data['base_fare'] : null,
            'distance'         => isset($data['distance']) ? (float) $data['distance'] : null,
            'discount_amount'  => isset($data['discount_amount']) ? (float) $data['discount_amount'] : null,
            'pickup_name'      => $pickupName,
            'dropoff_name'     => $dropoffName,
            'passenger_name'   => $passengerName,
            'passenger_role'   => $data['passenger_role'] ?? null,
            'passenger_id'     => $passengerId,
            // Denormalized from shift_log for fast reporting without JOINs
            'conductor_name'   => $shift->conductor_name,
            'unit_number'      => $shift->unit_number,
            'driver_name'      => $shift->driver_name,
            'voucher_id'       => $voucherId,
            // Cash/voucher has no fare_point UUIDs (S4-T1 made these nullable)
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
     *     checkout_url: string|null  -- gateway hosted authorize URL (null when
     *                                   no real provider is configured / fake)
     *     amount:       float        -- the amount to charge
     *     expires_at:   string       -- ISO 8601 timestamp when the QR expires
     * }
     *
     * @throws \Symfony\Component\HttpKernel\Exception\HttpException
     *         422 if conductor has no active shift; 502 on a real gateway failure
     */
    public function initiateGcashFare(User $conductor, array $data): array
    {
        $shift = $this->resolveConductorActiveShift($conductor);

        // One pending GCash payment per shift: if a still-fresh PENDING
        // transaction exists (e.g. the conductor navigated away mid-payment
        // and came back), return it instead of minting a duplicate QR. Stale
        // rows are lazily expired first, which frees the slot for a new one.
        $existing = $this->findFreshPendingGcashForShift($shift->shift_id);
        if ($existing) {
            return $this->gcashInitiationPayload($existing);
        }

        $finalAmount = (float) ($data['final_amount'] ?? 0);
        $amountCentavos = (int) round($finalAmount * 100);

        // Opaque binding token (NOT the transaction_id) embedded in the QR.
        $qrToken = Str::random(32);
        $expiresAt = now()->addMinutes($this->claimTtlMinutes());

        // Persist the PENDING transaction first so its id can be sent to the
        // gateway as correlation metadata.
        $transaction = Transaction::create([
            'transaction_id'   => $this->generateTransactionId(),
            'shift_id'         => $shift->shift_id,
            'payment_method'   => PaymentMethod::GCASH->value,
            'status'           => PaymentStatus::PENDING->value,
            'final_amount'     => $finalAmount,
            'base_fare'        => isset($data['base_fare']) ? (float) $data['base_fare'] : null,
            'distance'         => isset($data['distance']) ? (float) $data['distance'] : null,
            'discount_amount'  => isset($data['discount_amount']) ? (float) $data['discount_amount'] : null,
            'pickup_name'      => $data['pickup_name'] ?? null,
            'dropoff_name'     => $data['dropoff_name'] ?? null,
            'passenger_name'   => $data['passenger_name'] ?? null,
            'conductor_name'   => $shift->conductor_name,
            'unit_number'      => $shift->unit_number,
            'driver_name'      => $shift->driver_name,
            'pickup_stop_id'   => null,
            'dropoff_stop_id'  => null,
            'qr_token'         => $qrToken,
            'payment_provider' => $this->paymentService->gatewayName(),
        ]);

        // Create the gateway intent. The bound gateway is real when keys are
        // configured, otherwise the FakeGateway (no checkout URL). A real
        // provider failure surfaces as 502 and the orphan row is rolled back.
        try {
            $intent = $this->paymentService->createIntentFor($transaction, $amountCentavos);

            $transaction->update([
                'payment_reference'    => $intent->reference,
                'payment_checkout_url' => $intent->checkoutUrl,
            ]);
            $transaction->refresh();
        } catch (PaymentGatewayException $e) {
            $transaction->delete();
            report($e);
            abort(502, 'Unable to initiate GCash payment. Please try again.');
        }

        return [
            'transaction'  => $transaction,
            'qr_token'     => $qrToken,
            'checkout_url' => $transaction->payment_checkout_url,
            'amount'       => $finalAmount,
            'expires_at'   => $expiresAt->toIso8601String(),
        ];
    }

    /**
     * The conductor's currently-resumable PENDING GCash transaction, or null.
     *
     * Powers GET /conductor/payments/gcash/pending: when the conductor left
     * the payment screen (navigation, refresh) the frontend calls this on
     * reopen and shows the SAME QR + details instead of a new one. Returns
     * null when there is no active shift, no pending GCash row, or the row
     * just lazily expired.
     */
    public function findPendingGcashForConductor(User $conductor): ?array
    {
        $conductorProfileId = $conductor->conductorProfile?->id;
        if (! $conductorProfileId) {
            return null;
        }

        $shift = ShiftLog::where('conductor_id', $conductorProfileId)->active()->first();
        if (! $shift) {
            return null;
        }

        $transaction = $this->findFreshPendingGcashForShift($shift->shift_id);

        return $transaction ? $this->gcashInitiationPayload($transaction) : null;
    }

    /**
     * Latest PENDING GCash transaction for a shift that is still within the
     * claim TTL. Stale rows are lazily flipped to EXPIRED (through the
     * payment state machine) as a side effect, so callers never see — or
     * resume — a QR that can no longer be claimed.
     */
    private function findFreshPendingGcashForShift(string $shiftId): ?Transaction
    {
        $transaction = Transaction::where('shift_id', $shiftId)
            ->where('payment_method', PaymentMethod::GCASH->value)
            ->where('status', PaymentStatus::PENDING->value)
            ->latest('created_at')
            ->first();

        if (! $transaction) {
            return null;
        }

        $transaction = $this->paymentService->expireIfStale($transaction);

        return $transaction->status === PaymentStatus::PENDING ? $transaction : null;
    }

    /**
     * Shape a PENDING GCash transaction into the initiate-response payload
     * (same keys whether freshly created or resumed). expires_at is always
     * derived from created_at + TTL — the same clock claimGcash checks.
     */
    private function gcashInitiationPayload(Transaction $transaction): array
    {
        return [
            'transaction'  => $transaction,
            'qr_token'     => $transaction->qr_token,
            'checkout_url' => $transaction->payment_checkout_url,
            'amount'       => (float) $transaction->final_amount,
            'expires_at'   => $transaction->created_at->copy()->addMinutes($this->claimTtlMinutes())->toIso8601String(),
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

        // 410 if not claimable: not PENDING (already PAID/FAILED/etc.) or expired.
        if ($transaction->status !== PaymentStatus::PENDING) {
            abort(410, 'Transaction is no longer claimable');
        }

        $createdAt = $transaction->created_at;
        if ($createdAt && $createdAt->diffInMinutes(now()) > $this->claimTtlMinutes()) {
            // Flip the row to EXPIRED so the DB matches the 410 we return —
            // the conductor's status poll then sees EXPIRED and can restart.
            $this->paymentService->expireIfStale($transaction);
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
     * Claim a CASH ride by scanning the QR printed on the paper receipt.
     *
     * Cash rides are recorded as PAID with no passenger_id, so they never
     * reach anyone's reward cycle. Scanning the receipt binds the ride to the
     * commuter — and because GET /commuter/rewards counts PAID non-voucher
     * transactions by passenger_id, that binding IS the "+1": the progress
     * ring and the auto-generated free-ride voucher at the cycle threshold
     * both follow from it. No separate points ledger is involved.
     *
     * Deliberately mirrors claimGcash's guards, with two differences: a cash
     * row is already PAID (so PAID is the valid state here, not PENDING), and
     * the window is hours rather than minutes.
     *
     * Idempotent: the same commuter re-scanning their own receipt is a no-op
     * that reports already_claimed, so a double-scan never double-counts.
     *
     * @param  User    $commuter  The commuter scanning the receipt QR
     * @param  string  $qrToken   The opaque token printed on the receipt
     *
     * @return array {
     *     transaction_id:  string
     *     amount:          float
     *     pickup_name:     string|null
     *     dropoff_name:    string|null
     *     conductor_name:  string|null
     *     unit_number:     string|null
     *     paid_at:         string|null
     *     already_claimed: bool
     * }
     *
     * @throws \Symfony\Component\HttpKernel\Exception\HttpException
     *         404 if no transaction carries this token
     *         410 if the receipt is older than the TTL
     *         409 if another commuter already claimed it
     *         422 if the row is not a claimable cash ride, or no profile
     */
    public function claimCashReceipt(User $commuter, string $qrToken): array
    {
        $transaction = Transaction::where('qr_token', $qrToken)->first();

        if (! $transaction) {
            abort(404, 'Receipt not recognised');
        }

        // Only cash receipts are claimable this way. A GCash token belongs to
        // the live checkout flow (claimGcash) and must not be redeemable here
        // — that would bind an unpaid PENDING ride and hand out a free point.
        // NOTE: payment_method is enum-cast on the model, so this compares
        // enum-to-enum. Comparing against ->value here would always be true.
        if ($transaction->payment_method !== PaymentMethod::CASH) {
            abort(422, 'This QR is not a cash receipt');
        }

        if ($transaction->status !== PaymentStatus::PAID) {
            abort(422, 'This ride is not a completed cash payment');
        }

        // 410 once the receipt is past its window. Measured from created_at,
        // which is when the fare was recorded and the receipt printed.
        $createdAt = $transaction->created_at;
        if ($createdAt && $createdAt->copy()->addHours($this->receiptTtlHours())->isPast()) {
            abort(410, 'This receipt has expired');
        }

        // passenger_id references commuter_profiles.id, not users.id.
        $commuterProfile = $commuter->commuterProfile;
        if (! $commuterProfile) {
            abort(422, 'Commuter profile required to claim a receipt');
        }

        if ($transaction->passenger_id !== null) {
            if ($transaction->passenger_id === $commuterProfile->id) {
                return $this->formatReceiptClaimResponse($transaction, alreadyClaimed: true);
            }
            abort(409, 'This receipt has already been claimed');
        }

        $transaction->update([
            'passenger_id'   => $commuterProfile->id,
            'passenger_name' => trim($commuterProfile->first_name . ' ' . $commuterProfile->surname),
        ]);
        $transaction->refresh();

        return $this->formatReceiptClaimResponse($transaction, alreadyClaimed: false);
    }

    /**
     * Shape a claimed cash receipt for the commuter's success modal.
     */
    private function formatReceiptClaimResponse(Transaction $transaction, bool $alreadyClaimed): array
    {
        return [
            'transaction_id'  => $transaction->transaction_id,
            'amount'          => (float) $transaction->final_amount,
            'pickup_name'     => $transaction->pickup_name,
            'dropoff_name'    => $transaction->dropoff_name,
            'conductor_name'  => $transaction->conductor_name,
            'unit_number'     => $transaction->unit_number,
            'paid_at'         => $transaction->paid_at?->toIso8601String(),
            'already_claimed' => $alreadyClaimed,
        ];
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

        // Single round-trip: conditional aggregation over the
        // (shift_id, payment_method, status) composite index. Works on
        // both MySQL and SQLite. Only PAID rows count toward earnings.
        $row = Transaction::query()
            ->where('shift_id', $shift->shift_id)
            ->where('status', 'PAID')
            ->selectRaw("COALESCE(SUM(CASE WHEN payment_method = 'CASH' THEN final_amount ELSE 0 END), 0) AS cash_total")
            ->selectRaw("COALESCE(SUM(CASE WHEN payment_method = 'GCASH' THEN final_amount ELSE 0 END), 0) AS gcash_total")
            ->first();

        $cashTotal  = (float) ($row->cash_total ?? 0);
        $gcashTotal = (float) ($row->gcash_total ?? 0);

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
            'checkout_url'   => $transaction->payment_checkout_url,
            'amount'         => (float) $transaction->final_amount,
            'pickup_name'    => $transaction->pickup_name,
            'dropoff_name'   => $transaction->dropoff_name,
        ];
    }
}
