<?php

namespace App\Services;

use App\Enums\PaymentMethod;
use App\Enums\PaymentStatus;
use App\Models\CommuterProfile;
use App\Models\FarePoint;
use App\Models\PaymentGroup;
use App\Models\Setting;
use App\Models\ShiftLog;
use App\Models\Transaction;
use App\Models\User;
use App\Models\Voucher;
use App\Support\Payments\PaymentGatewayException;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Symfony\Component\HttpKernel\Exception\HttpException;

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
        private PaymentService $paymentService,
        private FareCalculationService $fareCalculationService,
        private RewardService $rewardService,
        private ShiftCloseoutService $shiftCloseoutService,
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
     * @param  User  $conductor  The conductor recording the fare
     * @param  array  $data  {
     *                       final_amount:    float (required) -- the fare charged
     *                       base_fare:        float (optional) -- matrix base fare
     *                       distance:         float (optional) -- km between pickup/dropoff
     *                       discount_amount:  float (optional) -- discount applied
     *                       pickup_name:      string (optional) -- human-readable pickup
     *                       dropoff_name:     string (optional) -- human-readable dropoff
     *                       passenger_name:   string (optional) -- passenger display name
     *                       passenger_role:   string (optional) -- REGULAR/STUDENT/SENIOR/PWD
     *                       }
     * @return Transaction The created (or existing) PAID transaction
     *
     * @throws HttpException
     *                       422 if conductor has no active shift
     */
    public function recordCashFare(User $conductor, array $data): Transaction
    {
        $shift = $this->resolveConductorActiveShift($conductor);

        $paymentMethod = $data['payment_method'] ?? 'CASH';

        if ($paymentMethod === PaymentMethod::VOUCHER->value) {
            return $this->recordVoucherFare($shift, $data);
        }

        $finalAmount = (float) ($data['final_amount'] ?? 0);
        $pickupName = $data['pickup_name'] ?? null;
        $dropoffName = $data['dropoff_name'] ?? null;
        $idempotencyKey = $data['idempotency_key'] ?? null;

        // ─── Idempotency check ──────────────────────────────────────
        if ($idempotencyKey) {
            $existing = Transaction::where('idempotency_key', $idempotencyKey)->first();
            if ($existing) {
                return $existing;
            }
        }

        $passengerId = $data['passenger_id'] ?? null;
        $passengerName = $data['passenger_name'] ?? null;

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
        return DB::transaction(function () use (
            $shift,
            $paymentMethod,
            $receiptToken,
            $idempotencyKey,
            $finalAmount,
            $data,
            $pickupName,
            $dropoffName,
            $passengerName,
            $passengerId,
        ): Transaction {
            $shift = $this->shiftCloseoutService->lockActiveShift($shift->shift_id);
            $paidAt = now();
            $transaction = Transaction::create([
                'transaction_id' => $this->generateTransactionId(),
                'shift_id' => $shift->shift_id,
                'payment_method' => $paymentMethod,
                'status' => PaymentStatus::PAID->value,
                'qr_token' => $receiptToken,
                'idempotency_key' => $idempotencyKey,
                'final_amount' => $finalAmount,
                'total_passengers' => 1,
                'gross_amount' => round($finalAmount + (float) ($data['discount_amount'] ?? 0), 2),
                'base_fare' => isset($data['base_fare']) ? (float) $data['base_fare'] : null,
                'distance' => isset($data['distance']) ? (float) $data['distance'] : null,
                'discount_amount' => isset($data['discount_amount']) ? (float) $data['discount_amount'] : null,
                'pickup_name' => $pickupName,
                'dropoff_name' => $dropoffName,
                'passenger_name' => $passengerName,
                'passenger_role' => $data['passenger_role'] ?? null,
                'passenger_id' => $passengerId,
                // Denormalized from shift_log for fast reporting without JOINs
                'conductor_name' => $shift->conductor_name,
                'unit_number' => $shift->unit_number,
                'driver_name' => $shift->driver_name,
                'voucher_id' => null,
                // Cash/voucher has no fare_point UUIDs (S4-T1 made these nullable)
                'pickup_stop_id' => null,
                'dropoff_stop_id' => null,
                'paid_at' => $paidAt,
            ]);

            if ($passengerId !== null) {
                $this->rewardService->issueForRewardableRide($transaction, $paidAt);
            }

            return $transaction;
        }, 3);
    }

    /**
     * Atomically consume one commuter-owned voucher and record its free ride.
     *
     * The voucher row is locked before any state is checked. Its USED update
     * and the associated transaction insert commit together, so a failed
     * insert restores the voucher to AVAILABLE automatically.
     */
    private function recordVoucherFare(ShiftLog $shift, array $data): Transaction
    {
        $voucherCode = trim((string) ($data['voucher_code'] ?? ''));
        if ($voucherCode === '') {
            abort(422, 'Voucher code is required for voucher payments.');
        }

        $expectedCommuterId = $data['passenger_id'] ?? null;
        $idempotencyKey = $data['idempotency_key'] ?? null;

        try {
            $transaction = DB::transaction(function () use ($shift, $data, $voucherCode, $expectedCommuterId, $idempotencyKey): ?Transaction {
                $shift = $this->shiftCloseoutService->lockActiveShift($shift->shift_id);
                $voucher = Voucher::where('code', $voucherCode)
                    ->lockForUpdate()
                    ->first();

                if (! $voucher) {
                    abort(422, 'Voucher code not found.');
                }

                if (! $voucher->commuter_id) {
                    abort(422, 'This voucher is not assigned to a commuter.');
                }

                if ($expectedCommuterId !== null && $voucher->commuter_id !== $expectedCommuterId) {
                    abort(422, 'This voucher does not belong to the selected commuter.');
                }

                // A same-key retry that committed while this request waited for
                // the voucher lock is safe to return as the original success.
                if ($idempotencyKey) {
                    $existing = Transaction::where('idempotency_key', $idempotencyKey)->first();
                    if ($existing) {
                        if ($existing->voucher_id === $voucher->id) {
                            return $existing;
                        }

                        abort(409, 'The idempotency key has already been used for another transaction.');
                    }
                }

                if ($voucher->status === Voucher::STATUS_EXPIRED
                    || ($voucher->status === Voucher::STATUS_AVAILABLE
                        && $voucher->expires_at?->isPast())) {
                    if ($voucher->status === Voucher::STATUS_AVAILABLE) {
                        $voucher->update(['status' => Voucher::STATUS_EXPIRED]);
                    }

                    // Returning lets the EXPIRED update commit. The validation
                    // response is raised immediately after the transaction.
                    return null;
                }

                if ($voucher->status !== Voucher::STATUS_AVAILABLE) {
                    abort(409, 'This voucher has already been used or is no longer available.');
                }

                // Defend against legacy/inconsistent data where a transaction
                // references the voucher but its status was left AVAILABLE.
                if (Transaction::where('voucher_id', $voucher->id)->exists()) {
                    abort(409, 'This voucher has already been redeemed.');
                }

                $commuterProfile = CommuterProfile::find($voucher->commuter_id);
                if (! $commuterProfile) {
                    abort(422, 'The commuter assigned to this voucher no longer exists.');
                }

                $passengerName = trim($commuterProfile->first_name.' '.$commuterProfile->surname);

                // This update and the insert below are in the same transaction.
                // Any insert failure rolls the USED status back.
                $voucher->update(['status' => 'USED']);

                return Transaction::create([
                    'transaction_id' => $this->generateTransactionId(),
                    'shift_id' => $shift->shift_id,
                    'payment_method' => PaymentMethod::VOUCHER->value,
                    'status' => PaymentStatus::PAID->value,
                    'qr_token' => null,
                    'idempotency_key' => $idempotencyKey,
                    'final_amount' => 0,
                    'total_passengers' => 1,
                    'gross_amount' => round((float) ($data['discount_amount'] ?? 0), 2),
                    'base_fare' => isset($data['base_fare']) ? (float) $data['base_fare'] : null,
                    'distance' => isset($data['distance']) ? (float) $data['distance'] : null,
                    'discount_amount' => isset($data['discount_amount']) ? (float) $data['discount_amount'] : null,
                    'pickup_name' => $data['pickup_name'] ?? null,
                    'dropoff_name' => $data['dropoff_name'] ?? null,
                    'passenger_name' => $passengerName,
                    'passenger_role' => strtoupper((string) $commuterProfile->commuter_type),
                    'passenger_id' => $commuterProfile->id,
                    'conductor_name' => $shift->conductor_name,
                    'unit_number' => $shift->unit_number,
                    'driver_name' => $shift->driver_name,
                    'voucher_id' => $voucher->id,
                    'pickup_stop_id' => null,
                    'dropoff_stop_id' => null,
                    'paid_at' => now(),
                ]);
            }, 3);

            if (! $transaction) {
                abort(422, 'This voucher has expired.');
            }

            return $transaction;
        } catch (UniqueConstraintViolationException $e) {
            $voucherId = Voucher::where('code', $voucherCode)->value('id');

            if ($voucherId && Transaction::where('voucher_id', $voucherId)->exists()) {
                abort(409, 'This voucher has already been redeemed.');
            }

            throw $e;
        }
    }

    /** Record one paid cash receipt per passenger under a shared payment group. */
    public function recordGroupedCashFare(User $conductor, array $data): PaymentGroup
    {
        $shift = $this->resolveConductorActiveShift($conductor);
        $idempotencyKey = $data['idempotency_key'] ?? null;

        if ($idempotencyKey) {
            $existing = PaymentGroup::where('idempotency_key', $idempotencyKey)->first();
            if ($existing) {
                return $existing->load('transactions');
            }
        }

        return DB::transaction(function () use ($shift, $data, $idempotencyKey) {
            $shift = $this->shiftCloseoutService->lockActiveShift($shift->shift_id);
            $passengers = $this->expandGroupPassengers($data['group_passengers']);
            $group = PaymentGroup::create([
                'id' => (string) Str::uuid(),
                'reference_number' => $this->generateMultiplePaymentReference(),
                'shift_id' => $shift->shift_id,
                'payment_method' => PaymentMethod::CASH->value,
                'pickup_name' => $data['pickup_name'],
                'dropoff_name' => $data['dropoff_name'],
                'passenger_breakdown' => $data['group_passengers'],
                'passenger_count' => count($passengers),
                'total_amount' => array_sum(array_column($passengers, 'final_amount')),
                'idempotency_key' => $idempotencyKey,
            ]);

            $this->createGroupReceiptRows($group, $shift, $passengers, PaymentMethod::CASH, PaymentStatus::PAID);

            return $group->load('transactions');
        }, 3);
    }

    public function recordMultiPassengerCashFare(User $conductor, array $data): Transaction
    {
        $shift = $this->resolveConductorActiveShift($conductor);
        $idempotencyKey = $data['idempotency_key'] ?? null;

        if ($idempotencyKey) {
            $existing = Transaction::with('passengerBreakdown')
                ->where('idempotency_key', $idempotencyKey)
                ->first();
            if ($existing) {
                return $existing;
            }
        }

        $fare = $this->fareCalculationService->calculate(
            $data['pickup_stop_id'],
            $data['dropoff_stop_id'],
            $data['passengers'],
        );

        return DB::transaction(function () use ($shift, $fare, $idempotencyKey) {
            $shift = $this->shiftCloseoutService->lockActiveShift($shift->shift_id);
            $transaction = Transaction::create([
                'transaction_id' => $this->generateTransactionId(),
                'shift_id' => $shift->shift_id,
                'payment_method' => PaymentMethod::CASH->value,
                'status' => PaymentStatus::PAID->value,
                'qr_token' => Str::random(32),
                'idempotency_key' => $idempotencyKey,
                'total_passengers' => $fare['total_passengers'],
                'gross_amount' => $fare['gross_amount'],
                'final_amount' => $fare['final_amount'],
                'base_fare' => $fare['gross_amount'],
                'discount_amount' => $fare['discount_amount'],
                'pickup_stop_id' => $fare['pickup']->id,
                'dropoff_stop_id' => $fare['dropoff']->id,
                'pickup_name' => $fare['pickup']->name,
                'dropoff_name' => $fare['dropoff']->name,
                'passenger_name' => 'Multiple passengers',
                'conductor_name' => $shift->conductor_name,
                'unit_number' => $shift->unit_number,
                'driver_name' => $shift->driver_name,
                'paid_at' => now(),
            ]);
            $transaction->passengerBreakdown()->createMany($fare['lines']);

            return $transaction->load('passengerBreakdown');
        }, 3);
    }

    // ─── GCash Flow ─────────────────────────────────────────────────

    /**
     * Initiate a GCash fare: create a PENDING transaction + binding QR.
     *
     * The conductor generates this; the commuter scans the QR to claim.
     * PayMongo SANDBOX authorize happens after claim.
     *
     * @param  User  $conductor  The conductor initiating the GCash fare
     * @param  array  $data  {
     *                       final_amount:    float (required) -- the fare to charge via GCash
     *                       pickup_name:      string (optional)
     *                       dropoff_name:     string (optional)
     *                       passenger_name:   string (optional) -- usually null until claim
     *                       }
     * @return array {
     *               transaction:  Transaction  -- the PENDING transaction row
     *               qr_token:     string       -- opaque token for the binding QR
     *               checkout_url: string|null  -- gateway hosted authorize URL (null when
     *               no real provider is configured / fake)
     *               amount:       float        -- the amount to charge
     *               expires_at:   string       -- ISO 8601 timestamp when the QR expires
     *               }
     *
     * @throws HttpException
     *                       422 if conductor has no active shift; 502 on a real gateway failure
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

        if (! empty($data['passengers'])) {
            return $this->initiateMultiPassengerGcashFare($shift, $data);
        }

        if (! empty($data['group_passengers'])) {
            return $this->initiateGroupedGcashFare($shift, $data);
        }

        $finalAmount = (float) ($data['final_amount'] ?? 0);
        $amountCentavos = (int) round($finalAmount * 100);

        // Opaque binding token (NOT the transaction_id) embedded in the QR.
        $qrToken = Str::random(32);
        $expiresAt = now()->addMinutes($this->claimTtlMinutes());

        // Persist the PENDING transaction first so its id can be sent to the
        // gateway as correlation metadata.
        $transaction = DB::transaction(function () use ($shift, $data, $finalAmount, $qrToken) {
            $shift = $this->shiftCloseoutService->lockActiveShift($shift->shift_id);

            return Transaction::create([
                'transaction_id' => $this->generateTransactionId(),
                'shift_id' => $shift->shift_id,
                'payment_method' => PaymentMethod::GCASH->value,
                'status' => PaymentStatus::PENDING->value,
                'final_amount' => $finalAmount,
                'total_passengers' => 1,
                'gross_amount' => $finalAmount,
                'base_fare' => isset($data['base_fare']) ? (float) $data['base_fare'] : null,
                'distance' => isset($data['distance']) ? (float) $data['distance'] : null,
                'discount_amount' => isset($data['discount_amount']) ? (float) $data['discount_amount'] : null,
                'pickup_name' => $data['pickup_name'] ?? null,
                'dropoff_name' => $data['dropoff_name'] ?? null,
                'passenger_name' => $data['passenger_name'] ?? null,
                'conductor_name' => $shift->conductor_name,
                'unit_number' => $shift->unit_number,
                'driver_name' => $shift->driver_name,
                'pickup_stop_id' => null,
                'dropoff_stop_id' => null,
                'qr_token' => $qrToken,
                'payment_provider' => $this->paymentService->gatewayName(),
            ]);
        }, 3);

        // Create the gateway intent. The bound gateway is real when keys are
        // configured, otherwise the FakeGateway (no checkout URL). A real
        // provider failure surfaces as 502 and the orphan row is rolled back.
        try {
            $intent = $this->paymentService->createIntentFor($transaction, $amountCentavos);

            $transaction->update([
                'payment_reference' => $intent->reference,
                'payment_checkout_url' => $intent->checkoutUrl,
            ]);
            $transaction->refresh();
        } catch (PaymentGatewayException $e) {
            $transaction->delete();
            report($e);
            abort(502, 'Unable to initiate GCash payment. Please try again.');
        }

        return [
            'transaction' => $transaction,
            'qr_token' => $qrToken,
            'checkout_url' => $transaction->payment_checkout_url,
            'amount' => $finalAmount,
            'expires_at' => $expiresAt->toIso8601String(),
        ];
    }

    private function initiateMultiPassengerGcashFare(ShiftLog $shift, array $data): array
    {
        $fare = $this->fareCalculationService->calculate(
            $data['pickup_stop_id'],
            $data['dropoff_stop_id'],
            $data['passengers'],
        );
        $qrToken = Str::random(32);
        $transaction = DB::transaction(function () use ($shift, $fare, $qrToken) {
            $shift = $this->shiftCloseoutService->lockActiveShift($shift->shift_id);
            $transaction = Transaction::create([
                'transaction_id' => $this->generateTransactionId(),
                'shift_id' => $shift->shift_id,
                'payment_method' => PaymentMethod::GCASH->value,
                'status' => PaymentStatus::PENDING->value,
                'qr_token' => $qrToken,
                'total_passengers' => $fare['total_passengers'],
                'gross_amount' => $fare['gross_amount'],
                'final_amount' => $fare['final_amount'],
                'base_fare' => $fare['gross_amount'],
                'discount_amount' => $fare['discount_amount'],
                'pickup_stop_id' => $fare['pickup']->id,
                'dropoff_stop_id' => $fare['dropoff']->id,
                'pickup_name' => $fare['pickup']->name,
                'dropoff_name' => $fare['dropoff']->name,
                'passenger_name' => 'Multiple passengers',
                'conductor_name' => $shift->conductor_name,
                'unit_number' => $shift->unit_number,
                'driver_name' => $shift->driver_name,
                'payment_provider' => $this->paymentService->gatewayName(),
            ]);
            $transaction->passengerBreakdown()->createMany($fare['lines']);

            return $transaction;
        }, 3);

        try {
            $intent = $this->paymentService->createIntentFor(
                $transaction,
                (int) round($fare['final_amount'] * 100),
            );
            $transaction->update([
                'payment_reference' => $intent->reference,
                'payment_checkout_url' => $intent->checkoutUrl,
            ]);
        } catch (PaymentGatewayException $e) {
            $transaction->delete();
            report($e);
            abort(502, 'Unable to initiate GCash payment. Please try again.');
        }

        $transaction->refresh()->load('passengerBreakdown');

        return [
            'transaction' => $transaction,
            'qr_token' => $qrToken,
            'checkout_url' => $transaction->payment_checkout_url,
            'amount' => $fare['final_amount'],
            'expires_at' => $transaction->created_at->copy()->addMinutes($this->claimTtlMinutes())->toIso8601String(),
            'receipts' => collect([$transaction]),
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
            ->whereNotNull('qr_token')
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
        $transaction->loadMissing('passengerBreakdown');
        $paymentGroup = $transaction->group_id
            ? PaymentGroup::select(['id', 'reference_number', 'total_amount'])->find($transaction->group_id)
            : null;

        return [
            'transaction' => $transaction,
            'qr_token' => $transaction->qr_token,
            'checkout_url' => $transaction->payment_checkout_url,
            'amount' => $paymentGroup
                ? (float) $paymentGroup->total_amount
                : (float) $transaction->final_amount,
            'expires_at' => $transaction->created_at->copy()->addMinutes($this->claimTtlMinutes())->toIso8601String(),
            'group_id' => $transaction->group_id,
            'multiple_payment_reference' => $paymentGroup?->reference_number,
            'receipts' => $transaction->group_id
                ? Transaction::where('group_id', $transaction->group_id)->orderBy('group_position')->get()
                : collect([$transaction]),
        ];
    }

    /** Create a single GCash intent that settles several passenger receipts. */
    private function initiateGroupedGcashFare(ShiftLog $shift, array $data): array
    {
        $companions = $this->expandGroupPassengers($data['group_passengers']);
        $receiptRows = array_merge([
            [
                'type' => 'REGULAR',
                'final_amount' => 0.0,
                'base_fare' => 0.0,
                'discount_amount' => 0.0,
            ],
        ], $companions);

        $group = DB::transaction(function () use ($shift, $data, $companions, $receiptRows) {
            $shift = $this->shiftCloseoutService->lockActiveShift($shift->shift_id);
            $group = PaymentGroup::create([
                'id' => (string) Str::uuid(),
                'reference_number' => $this->generateMultiplePaymentReference(),
                'shift_id' => $shift->shift_id,
                'payment_method' => PaymentMethod::GCASH->value,
                'pickup_name' => $data['pickup_name'],
                'dropoff_name' => $data['dropoff_name'],
                'passenger_breakdown' => $data['group_passengers'],
                'passenger_count' => count($companions),
                'total_amount' => array_sum(array_column($companions, 'final_amount')),
            ]);

            $this->createGroupReceiptRows($group, $shift, $receiptRows, PaymentMethod::GCASH, PaymentStatus::PENDING);

            return $group->load('transactions');
        }, 3);

        /** @var Transaction $anchor */
        $anchor = $group->transactions->first();

        return $this->gcashInitiationPayload($anchor);
    }

    /** Expand type quantities into one immutable receipt description per passenger. */
    private function expandGroupPassengers(array $breakdown): array
    {
        $passengers = [];
        foreach ($breakdown as $row) {
            for ($i = 0; $i < (int) $row['quantity']; $i++) {
                $passengers[] = [
                    'type' => $row['type'],
                    'final_amount' => (float) $row['final_amount'],
                    'base_fare' => (float) ($row['base_fare'] ?? $row['final_amount']),
                    'discount_amount' => (float) ($row['discount_amount'] ?? 0),
                ];
            }
        }

        return $passengers;
    }

    private function createGroupReceiptRows(
        PaymentGroup $group,
        ShiftLog $shift,
        array $passengers,
        PaymentMethod $method,
        PaymentStatus $status,
    ): void {
        $totalPassengers = count($passengers);
        foreach ($passengers as $position => $passenger) {
            $isRewardReceipt = $position === 0;
            Transaction::create([
                'transaction_id' => $this->generateTransactionId(),
                'shift_id' => $shift->shift_id,
                'group_id' => $group->id,
                'group_position' => $position + 1,
                'reward_eligible' => $isRewardReceipt,
                'payment_method' => $method->value,
                'status' => $status->value,
                'qr_token' => $isRewardReceipt ? Str::random(32) : null,
                'final_amount' => $passenger['final_amount'],
                'total_passengers' => $totalPassengers,
                'gross_amount' => $passenger['base_fare'],
                'base_fare' => $passenger['base_fare'],
                'discount_amount' => $passenger['discount_amount'],
                'pickup_name' => $group->pickup_name,
                'dropoff_name' => $group->dropoff_name,
                'passenger_name' => 'Passenger',
                'passenger_role' => $passenger['type'],
                'conductor_name' => $shift->conductor_name,
                'unit_number' => $shift->unit_number,
                'driver_name' => $shift->driver_name,
                'payment_provider' => $method === PaymentMethod::GCASH ? $this->paymentService->gatewayName() : null,
                'paid_at' => $status === PaymentStatus::PAID ? now() : null,
            ]);
        }
    }

    /**
     * Claim a GCash transaction by scanning the binding QR.
     *
     * Idempotent: if the same commuter already claimed it, returns the
     * transaction (no error). If a DIFFERENT commuter already claimed,
     * returns 409.
     *
     * @param  User  $commuter  The commuter scanning the QR
     * @param  string  $qrToken  The opaque token from the QR
     * @return array {
     *               transaction_id:  string
     *               checkout_url:     string|null
     *               amount:           float
     *               pickup_name:      string|null
     *               dropoff_name:     string|null
     *               }
     *
     * @throws HttpException
     *                       404 if no transaction has this qr_token
     *                       410 if transaction is not claimable (PAID, FAILED, or expired)
     *                       409 if a different commuter already claimed it
     *                       422 if the commuter has no commuter_profile (cannot claim)
     */
    public function claimGcash(User $commuter, string $qrToken): array
    {
        $commuterProfile = $commuter->commuterProfile;
        if (! $commuterProfile) {
            abort(422, 'Commuter profile required to claim a GCash transaction');
        }

        $result = DB::transaction(function () use ($commuterProfile, $qrToken): array {
            $transaction = Transaction::where('qr_token', $qrToken)
                ->lockForUpdate()
                ->first();

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

                return ['expired' => true];
            }

            // Idempotent: same commuter already claimed -> return the transaction
            if ($transaction->passenger_id !== null) {
                if ($transaction->passenger_id === $commuterProfile->id) {
                    return $this->formatClaimResponse($transaction);
                }
                // Different commuter already claimed
                abort(409, 'Transaction already claimed by another commuter');
            }

            $payerName = trim($commuterProfile->first_name.' '.$commuterProfile->surname);
            $isMultiPassenger = $transaction->passengerBreakdown()->exists();
            $updates = $transaction->group_id
                ? [
                    'passenger_id' => $commuterProfile->id,
                    'passenger_name' => $payerName,
                    'passenger_role' => strtoupper((string) $commuterProfile->commuter_type),
                    'payer_name' => $payerName,
                ]
                : ($isMultiPassenger ? [
                    'passenger_id' => $commuterProfile->id,
                ] : [
                    'passenger_id' => $commuterProfile->id,
                    'passenger_name' => $payerName,
                    'passenger_role' => strtoupper((string) $commuterProfile->commuter_type),
                ]);
            $updates['payer_id'] = $commuterProfile->id;
            $updates['payer_name_snapshot'] = $payerName;
            $updates['payer_name'] = $payerName;

            $group = null;
            if ($transaction->group_id) {
                $group = PaymentGroup::whereKey($transaction->group_id)->lockForUpdate()->first();
                $group?->update([
                    'payer_id' => $commuterProfile->id,
                    'payer_name' => $payerName,
                ]);
                Transaction::where('group_id', $transaction->group_id)->update([
                    'payer_name' => $payerName,
                ]);
            }

            $commuterType = (string) $commuterProfile->commuter_type;
            $discountedAmount = $isMultiPassenger
                ? null
                : $this->discountedFareFor($transaction, $commuterType);

            if ($group && (float) $transaction->final_amount <= 0) {
                $regularAmount = $this->regularFareForGroupPayer($transaction, $group);
                $payerAmount = $discountedAmount ?? $regularAmount;
                $amountToCharge = round((float) $group->total_amount + $payerAmount, 2);

                try {
                    $intent = $this->paymentService->createIntentFor(
                        $transaction,
                        (int) round($amountToCharge * 100),
                    );
                } catch (PaymentGatewayException $e) {
                    report($e);
                    abort(502, 'Unable to prepare GCash group payment. Please try again.');
                }

                $totalPassengers = (int) $group->passenger_count + 1;
                $updates += [
                    'final_amount' => $payerAmount,
                    'base_fare' => $regularAmount,
                    'gross_amount' => $regularAmount,
                    'discount_amount' => round($regularAmount - $payerAmount, 2),
                    'total_passengers' => $totalPassengers,
                    'payment_reference' => $intent->reference,
                    'payment_checkout_url' => $intent->checkoutUrl,
                ];

                $group->update([
                    'total_amount' => $amountToCharge,
                    'passenger_count' => $totalPassengers,
                    'passenger_breakdown' => $this->addGroupPayerType(
                        $group->passenger_breakdown,
                        $commuterType,
                        $payerAmount,
                        $regularAmount,
                    ),
                ]);

                Transaction::where('group_id', $transaction->group_id)->update([
                    'total_passengers' => $totalPassengers,
                ]);
            } elseif ($discountedAmount !== null && $discountedAmount < (float) $transaction->final_amount) {
                $regularAmount = (float) $transaction->final_amount;
                $amountToCharge = $group
                    ? round((float) $group->total_amount - $regularAmount + $discountedAmount, 2)
                    : $discountedAmount;

                try {
                    $intent = $this->paymentService->createIntentFor(
                        $transaction,
                        (int) round($amountToCharge * 100),
                    );
                } catch (PaymentGatewayException $e) {
                    report($e);
                    abort(502, 'Unable to prepare GCash payment. Please try again.');
                }

                $updates += [
                    'final_amount' => $discountedAmount,
                    'discount_amount' => round($regularAmount - $discountedAmount, 2),
                    'payment_reference' => $intent->reference,
                    'payment_checkout_url' => $intent->checkoutUrl,
                ];

                if ($group) {
                    $group->update([
                        'total_amount' => $amountToCharge,
                        'passenger_breakdown' => $this->replaceGroupPayerType(
                            $group->passenger_breakdown,
                            $commuterType,
                            $discountedAmount,
                            $regularAmount,
                        ),
                    ]);
                }
            }

            $transaction->update($updates);
            $transaction->refresh();

            return $this->formatClaimResponse($transaction);
        }, 3);

        if (($result['expired'] ?? false) === true) {
            abort(410, 'Transaction has expired');
        }

        return $result;
    }

    /**
     * Resolve a verified commuter's fare from the same matrix used by the
     * frontend. Regular commuters and unmatched legacy stop names are left
     * unchanged.
     */
    private function discountedFareFor(Transaction $transaction, string $commuterType): ?float
    {
        $type = strtoupper(trim($commuterType));
        if (! in_array($type, ['STUDENT', 'SENIOR', 'SENIOR_CITIZEN', 'PWD'], true)) {
            return null;
        }

        $pickup = trim((string) $transaction->pickup_name);
        $dropoff = trim((string) $transaction->dropoff_name);
        if ($pickup === '' || $dropoff === '') {
            return null;
        }

        $from = FarePoint::whereRaw('LOWER(name) = ?', [mb_strtolower($pickup)])->first();
        $to = FarePoint::whereRaw('LOWER(name) = ?', [mb_strtolower($dropoff)])->first();
        if (! $from || ! $to) {
            return null;
        }

        $minimum = (float) (Setting::where('key', 'base_fare_discounted')->value('value') ?? 12);

        return round(max(
            abs((float) $from->discounted_fare - (float) $to->discounted_fare),
            $minimum,
        ), 2);
    }

    /** Resolve the regular fare for the scanner added to a grouped GCash QR. */
    private function regularFareForGroupPayer(Transaction $transaction, PaymentGroup $group): float
    {
        $transactionBase = (float) ($transaction->base_fare ?? 0);
        if ($transactionBase > 0) {
            return round($transactionBase, 2);
        }

        $receiptBase = Transaction::where('group_id', $group->id)
            ->where('transaction_id', '!=', $transaction->transaction_id)
            ->where('base_fare', '>', 0)
            ->orderBy('group_position')
            ->value('base_fare');
        if ($receiptBase !== null && (float) $receiptBase > 0) {
            return round((float) $receiptBase, 2);
        }

        foreach ((array) $group->passenger_breakdown as $line) {
            $baseFare = (float) ($line['base_fare'] ?? 0);
            if ($baseFare > 0) {
                return round($baseFare, 2);
            }
        }

        foreach ((array) $group->passenger_breakdown as $line) {
            $finalAmount = (float) ($line['final_amount'] ?? 0);
            if ($finalAmount > 0) {
                return round($finalAmount, 2);
            }
        }

        return round((float) $transaction->final_amount, 2);
    }

    /** Add the verified scanner to the stored grouped-passenger breakdown. */
    private function addGroupPayerType(
        array $breakdown,
        string $commuterType,
        float $finalAmount,
        float $baseFare,
    ): array {
        $payerType = strtoupper(trim($commuterType));
        if ($payerType === 'SENIOR') {
            $payerType = 'SENIOR_CITIZEN';
        }

        foreach ($breakdown as $index => $line) {
            if (($line['type'] ?? null) !== $payerType) {
                continue;
            }

            $breakdown[$index]['quantity'] = (int) ($line['quantity'] ?? 0) + 1;

            return array_values($breakdown);
        }

        $breakdown[] = [
            'type' => $payerType,
            'quantity' => 1,
            'final_amount' => $finalAmount,
            'base_fare' => $baseFare,
            'discount_amount' => round($baseFare - $finalAmount, 2),
        ];

        return array_values($breakdown);
    }

    /** Replace the regular payer placeholder with the verified commuter type. */
    private function replaceGroupPayerType(
        array $breakdown,
        string $commuterType,
        float $finalAmount,
        float $baseFare,
    ): array {
        $payerType = strtoupper(trim($commuterType));
        if ($payerType === 'SENIOR') {
            $payerType = 'SENIOR_CITIZEN';
        }

        foreach ($breakdown as $index => $line) {
            if (($line['type'] ?? null) !== 'REGULAR' || (int) ($line['quantity'] ?? 0) < 1) {
                continue;
            }

            $breakdown[$index]['quantity'] = (int) $line['quantity'] - 1;
            if ($breakdown[$index]['quantity'] === 0) {
                unset($breakdown[$index]);
            }
            break;
        }

        $payerMerged = false;
        foreach ($breakdown as $index => $line) {
            if (($line['type'] ?? null) === $payerType) {
                $breakdown[$index]['quantity'] = (int) ($line['quantity'] ?? 0) + 1;
                $payerMerged = true;
                break;
            }
        }

        if (! $payerMerged) {
            $breakdown[] = [
                'type' => $payerType,
                'quantity' => 1,
                'final_amount' => $finalAmount,
                'base_fare' => $baseFare,
                'discount_amount' => round($baseFare - $finalAmount, 2),
            ];
        }

        return array_values($breakdown);
    }

    /**
     * Claim a CASH ride by scanning the QR printed on the paper receipt.
     *
     * Cash rides are recorded as PAID with no passenger_id, so they do not
     * reach anyone's reward cycle until the receipt is claimed. The successful
     * binding is the qualifying event: RewardService issues any completed-cycle
     * voucher in this same transaction. No separate points ledger is involved.
     *
     * Deliberately mirrors claimGcash's guards, with two differences: a cash
     * row is already PAID (so PAID is the valid state here, not PENDING), and
     * the window is hours rather than minutes.
     *
     * Idempotent: the same commuter re-scanning their own receipt is a no-op
     * that reports already_claimed, so a double-scan never double-counts.
     *
     * @param  User  $commuter  The commuter scanning the receipt QR
     * @param  string  $qrToken  The opaque token printed on the receipt
     * @return array {
     *               transaction_id:  string
     *               amount:          float
     *               pickup_name:     string|null
     *               dropoff_name:    string|null
     *               conductor_name:  string|null
     *               unit_number:     string|null
     *               paid_at:         string|null
     *               already_claimed: bool
     *               }
     *
     * @throws HttpException
     *                       404 if no transaction carries this token
     *                       410 if the receipt is older than the TTL
     *                       409 if another commuter already claimed it
     *                       422 if the row is not a claimable cash ride, or no profile
     */
    public function claimCashReceipt(User $commuter, string $qrToken): array
    {
        // passenger_id references commuter_profiles.id, not users.id.
        $commuterProfile = $commuter->commuterProfile;
        if (! $commuterProfile) {
            abort(422, 'Commuter profile required to claim a receipt');
        }

        return DB::transaction(function () use ($commuterProfile, $qrToken): array {
            $transaction = Transaction::where('qr_token', $qrToken)
                ->lockForUpdate()
                ->first();

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

            if ($transaction->passenger_id !== null) {
                if ($transaction->passenger_id === $commuterProfile->id) {
                    return $this->formatReceiptClaimResponse($transaction, alreadyClaimed: true);
                }
                abort(409, 'This receipt has already been claimed');
            }

            $earnedAt = now();
            $transaction->update([
                'passenger_id' => $commuterProfile->id,
                'passenger_name' => trim($commuterProfile->first_name.' '.$commuterProfile->surname),
                'payer_id' => $commuterProfile->id,
                'payer_name_snapshot' => trim($commuterProfile->first_name.' '.$commuterProfile->surname),
            ]);
            if ($transaction->group_id && $transaction->reward_eligible) {
                $payerName = trim($commuterProfile->first_name.' '.$commuterProfile->surname);
                $transaction->paymentGroup()->update([
                    'payer_id' => $commuterProfile->id,
                    'payer_name' => $payerName,
                ]);
                Transaction::where('group_id', $transaction->group_id)->update([
                    'payer_name' => $payerName,
                ]);
            }
            $transaction->refresh();
            $this->rewardService->issueForRewardableRide($transaction, $earnedAt);

            return $this->formatReceiptClaimResponse($transaction, alreadyClaimed: false);
        }, 3);
    }

    /**
     * Shape a claimed cash receipt for the commuter's success modal.
     */
    private function formatReceiptClaimResponse(Transaction $transaction, bool $alreadyClaimed): array
    {
        return [
            'transaction_id' => $transaction->transaction_id,
            'amount' => (float) $transaction->final_amount,
            'pickup_name' => $transaction->pickup_name,
            'dropoff_name' => $transaction->dropoff_name,
            'conductor_name' => $transaction->conductor_name,
            'unit_number' => $transaction->unit_number,
            'paid_at' => $transaction->paid_at?->toIso8601String(),
            'already_claimed' => $alreadyClaimed,
        ];
    }

    // ─── Listing + Earnings ─────────────────────────────────────────

    /**
     * List all transactions for a shift, scoped to the conductor's own shift.
     *
     *
     * @return Collection<Transaction>
     *
     * @throws HttpException
     *                       403 if the shift does not belong to this conductor
     *                       404 if the shift does not exist
     */
    public function getShiftTransactions(User $conductor, string $shiftId): Collection
    {
        $shift = $this->verifyShiftOwnership($conductor, $shiftId);

        return Transaction::with(['passengerBreakdown', 'paymentGroup:id,reference_number'])
            ->where('shift_id', $shift->shift_id)
            ->orderBy('created_at', 'desc')
            ->get();
    }

    /**
     * Paginated transaction history for the conductor modal.
     *
     * @param  array{payment_method?: string|null, date_from?: string|null, date_to?: string|null}  $filters
     *
     * @return array{paginator: LengthAwarePaginator, total_amount: float}
     */
    public function getShiftTransactionsPage(
        User $conductor,
        string $shiftId,
        int $perPage = 25,
        array $filters = [],
    ): array {
        $shift = $this->verifyShiftOwnership($conductor, $shiftId);

        $query = Transaction::with(['passengerBreakdown', 'paymentGroup:id,reference_number'])
            ->where('shift_id', $shift->shift_id);

        $method = $filters['payment_method'] ?? null;
        if (is_string($method) && in_array($method, PaymentMethod::values(), true)) {
            $query->where('payment_method', $method);
        }

        $dateFrom = $filters['date_from'] ?? null;
        if (is_string($dateFrom) && $dateFrom !== '') {
            $query->where('created_at', '>=', "{$dateFrom} 00:00:00");
        }

        $dateTo = $filters['date_to'] ?? null;
        if (is_string($dateTo) && $dateTo !== '') {
            $query->where('created_at', '<=', "{$dateTo} 23:59:59");
        }

        $totalAmount = (float) (clone $query)->sum('final_amount');
        $paginator = $query
            ->orderBy('created_at', 'desc')
            ->paginate(min(max($perPage, 1), 100));

        return [
            'paginator' => $paginator,
            'total_amount' => round($totalAmount, 2),
        ];
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
     *
     * @return array{ cash_total: float, gcash_total: float, total: float }
     *
     * @throws HttpException
     *                       403 if the shift does not belong to this conductor
     *                       404 if the shift does not exist
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

        $cashTotal = (float) ($row->cash_total ?? 0);
        $gcashTotal = (float) ($row->gcash_total ?? 0);

        return [
            'cash_total' => $cashTotal,
            'gcash_total' => $gcashTotal,
            'total' => $cashTotal + $gcashTotal,
        ];
    }

    // ─── Internal Helpers ───────────────────────────────────────────

    /**
     * Resolve the conductor's currently active shift. Aborts 422 if none.
     *
     * Note: shift_logs.conductor_id FK → conductor_profiles.id, so we
     * query by $conductor->conductorProfile->id, not $conductor->id.
     */
    private function generateMultiplePaymentReference(): string
    {
        do {
            $reference = 'MP-'.now()->format('ymd').'-'.Str::upper(Str::random(6));
        } while (PaymentGroup::where('reference_number', $reference)->exists());

        return $reference;
    }

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
        return 'TXN-'.strtoupper(Str::random(15));
    }

    /**
     * Format the claimGcash response payload.
     */
    private function formatClaimResponse(Transaction $transaction): array
    {
        $finalAmount = (float) $transaction->final_amount;
        $regularAmount = $finalAmount + (float) ($transaction->discount_amount ?? 0);
        $discountAmount = (float) ($transaction->discount_amount ?? 0);

        if ($transaction->group_id) {
            $groupReceipts = Transaction::where('group_id', $transaction->group_id);
            $finalAmount = (float) (clone $groupReceipts)->sum('final_amount');
            $regularAmount = (float) (clone $groupReceipts)->sum('base_fare');
            $discountAmount = (float) (clone $groupReceipts)->sum('discount_amount');
        }

        return [
            'transaction_id' => $transaction->transaction_id,
            'checkout_url' => $transaction->payment_checkout_url,
            'amount' => $finalAmount,
            'regular_amount' => $regularAmount,
            'discount_amount' => $discountAmount,
            'passenger_role' => $transaction->passenger_role,
            'pickup_name' => $transaction->pickup_name,
            'dropoff_name' => $transaction->dropoff_name,
        ];
    }
}
