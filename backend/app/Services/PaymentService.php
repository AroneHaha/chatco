<?php

namespace App\Services;

use App\Contracts\Payments\PaymentGateway;
use App\Enums\PaymentMethod;
use App\Enums\PaymentStatus;
use App\Events\PaymentStatusUpdated;
use App\Models\PaymentEvent;
use App\Models\ShiftLog;
use App\Models\Transaction;
use App\Models\Voucher;
use App\Support\Payments\PaymentGatewayException;
use App\Support\Payments\PaymentIntentResult;
use App\Support\Payments\WebhookEvent;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * Orchestrates payments through the provider-agnostic PaymentGateway.
 *
 * Holds NO provider-specific knowledge — that lives behind PaymentGateway.
 * Responsibilities:
 *   - create intents for transactions
 *   - poll/reconcile status (fallback when a webhook is delayed)
 *   - apply webhook events idempotently (payment_events log)
 *   - enforce the PaymentStatus state machine and broadcast changes
 */
class PaymentService
{
    public function __construct(
        private readonly PaymentGateway $gateway,
        private readonly RewardService $rewardService,
        private readonly ShiftCloseoutService $shiftCloseoutService,
    ) {}

    public function gatewayName(): string
    {
        return $this->gateway->name();
    }

    public function isGatewayConfigured(): bool
    {
        return $this->gateway->isConfigured();
    }

    /**
     * Create a payment intent for a transaction. Correlation metadata
     * (transaction_id) is echoed back by the provider for webhook matching.
     *
     * @throws PaymentGatewayException
     */
    public function createIntentFor(Transaction $transaction, int $amountCentavos): PaymentIntentResult
    {
        // PayMongo redirects the commuter back to return_url after they authorize.
        // The browser redirect carries no metadata, so append the transaction_id
        // to the query string — /gcash/return reads it to poll this transaction.
        $returnUrl = (string) config('payments.return_url', '');
        if ($returnUrl === '') {
            // Fallback: derive from APP_URL or APP_FRONTEND_URL.
            $baseUrl = rtrim(env('APP_FRONTEND_URL', env('APP_URL', 'http://localhost:3000')), '/');
            $returnUrl = $baseUrl.'/gcash/return';
        }
        $returnUrl .= (str_contains($returnUrl, '?') ? '&' : '?')
            .'transaction_id='.urlencode($transaction->transaction_id);

        return $this->gateway->createIntent(
            $amountCentavos,
            [
                'transaction_id' => $transaction->transaction_id,
                'shift_id' => $transaction->shift_id,
            ],
            $returnUrl,
        );
    }

    public function webhookSignatureHeader(): string
    {
        return $this->gateway->webhookSignatureHeader();
    }

    public function verifyWebhookSignature(string $rawBody, ?string $signatureHeader): bool
    {
        return $this->gateway->verifyWebhookSignature($rawBody, $signatureHeader);
    }

    public function parseWebhookEvent(string $rawBody): ?WebhookEvent
    {
        return $this->gateway->parseWebhookEvent($rawBody);
    }

    /**
     * Apply a verified webhook event exactly once.
     *
     * Idempotency: unique(provider, event_id) on payment_events. A replayed
     * event is recorded once and acted on once; concurrent duplicates lose the
     * unique race and are treated as already-processed.
     *
     * @return Transaction|null The affected transaction, or null if unknown.
     */
    public function applyWebhookEvent(WebhookEvent $event): ?Transaction
    {
        $provider = $this->gateway->name();

        try {
            $result = DB::transaction(function () use ($event, $provider) {
                // Already processed? (audit row exists) → no-op.
                $seen = PaymentEvent::query()
                    ->where('provider', $provider)
                    ->where('event_id', $event->id)
                    ->lockForUpdate()
                    ->first();

                if ($seen) {
                    return [
                        'transaction' => $seen->transaction_id
                            ? Transaction::query()->lockForUpdate()->find($seen->transaction_id)
                            : null,
                        'changed' => false,
                    ];
                }

                $transaction = $this->locateTransactionForUpdate($event);

                PaymentEvent::create([
                    'provider' => $provider,
                    'event_id' => $event->id,
                    'transaction_id' => $transaction?->transaction_id,
                    'type' => $event->type,
                    'status' => $event->status->value,
                    'payload' => $event->raw,
                ]);

                if (! $transaction) {
                    return ['transaction' => null, 'changed' => false];
                }

                return $this->transitionLocked($transaction, $event->status);
            }, 3);

            if ($result['changed']) {
                broadcast(new PaymentStatusUpdated($result['transaction'], $event->status->value));
            }

            return $result['transaction'];
        } catch (UniqueConstraintViolationException $e) {
            $processed = PaymentEvent::query()
                ->where('provider', $provider)
                ->where('event_id', $event->id)
                ->first();

            if (! $processed) {
                throw $e;
            }

            // Lost the concurrent unique race → another worker handled it.
            Log::info('Payment webhook duplicate suppressed', [
                'provider' => $provider,
                'event_id' => $event->id,
            ]);

            return $processed->transaction_id
                ? Transaction::find($processed->transaction_id)
                : null;
        }
    }

    /**
     * Poll the provider for the current status and reconcile. Used as a
     * fallback when the webhook is delayed. Safe no-op for non-gateway rows.
     *
     * @throws PaymentGatewayException
     */
    public function syncStatus(Transaction $transaction): Transaction
    {
        if (! $transaction->payment_reference) {
            return $transaction;
        }

        $status = $this->gateway->retrieveStatus($transaction->payment_reference);

        return $this->transitionTo($transaction, $status);
    }

    /**
     * Reconcile the local status with the provider, rate-limited per
     * transaction via a cache key. Catches the case where PayMongo's webhook
     * is delayed or never arrives (e.g. local dev without ngrok, network
     * blip) — the commuter authorized on PayMongo but the DB still says
     * PENDING/PROCESSING. Without this, every reader would echo it forever.
     *
     * Shared by status polling, the conductor's pending-payment lookup and
     * the payments:expire-stale scheduled job, so a delayed payment keeps
     * being reconciled even after the conductor closes the QR screen.
     * Grouped payments are reconciled through their payer's row (see
     * gatewayRowFor()); companion receipts have no reference of their own.
     *
     * Triggers for:
     *   - PENDING GCash rows (the common case — commuter is mid-checkout),
     *   - PROCESSING GCash rows (authorized, awaiting provider settlement;
     *     there is no PayMongo "processing" webhook, so this is the only way
     *     a delayed confirmation is picked up besides the final webhook),
     *   - EXPIRED GCash rows inside the late-settlement grace window (the
     *     commuter may have authorized just before the local TTL lapsed).
     *
     * Safe no-op for: hard-terminal rows, non-GCASH rows, FakeGateway rows,
     * rows without a payment_reference, or when the throttle window is active.
     */
    public function reconcileIfDue(Transaction $transaction): Transaction
    {
        $throttleSeconds = $this->reconcileThrottleFor($transaction);
        if ($throttleSeconds <= 0) {
            return $transaction; // reconciliation disabled by config
        }

        // Only GCash rows can have a provider to reconcile with.
        if ($transaction->payment_method !== PaymentMethod::GCASH) {
            return $transaction;
        }

        // Only resolvable rows are worth reconciling.
        $isUnresolved = $transaction->status->isPending();
        $isLateSettleable = $transaction->status === PaymentStatus::EXPIRED
            && $this->withinLateSettlementWindow($transaction);
        if (! $isUnresolved && ! $isLateSettleable) {
            return $transaction;
        }

        // Need a real provider reference (FakeGateway rows have fake_ refs but
        // we don't want to call PayMongo for those either — skip if the
        // gateway itself isn't configured).
        if (! $transaction->payment_reference || ! $this->isGatewayConfigured()) {
            return $transaction;
        }

        // Rate-limit: one provider round-trip per transaction per window.
        // Concurrent readers share the same cache key, so only one wins the
        // race — the rest read the freshly-updated row.
        $cacheKey = "payment.sync.{$transaction->transaction_id}";
        if (! Cache::add($cacheKey, now()->timestamp, $throttleSeconds)) {
            return $transaction; // another reader is already syncing (or recently did)
        }

        try {
            $transaction = $this->syncStatus($transaction);
        } catch (PaymentGatewayException $e) {
            // Provider call failed (network, 5xx, etc.). Log + move on — the
            // cached row is still authoritative for the response, and the
            // next throttle window will retry.
            Log::warning('Payment provider reconciliation failed', [
                'transaction_id' => $transaction->transaction_id,
                'reference' => $transaction->payment_reference,
                'error' => $e->getMessage(),
            ]);

            // Release the throttle so the next reader can retry sooner.
            Cache::forget($cacheKey);
        }

        return $transaction;
    }

    /**
     * Whether a PROCESSING payment has been waiting on the provider longer
     * than payments.processing_delay_seconds. Display-only: the payment stays
     * unresolved (it can still settle), the conductor UI just switches to a
     * "confirmation delayed" message. updated_at is when the row entered
     * PROCESSING — nothing else writes to a row while it is PROCESSING.
     */
    public function isConfirmationDelayed(Transaction $transaction): bool
    {
        if ($transaction->status !== PaymentStatus::PROCESSING || ! $transaction->updated_at) {
            return false;
        }

        $delaySeconds = (int) config('payments.processing_delay_seconds', 180);

        return $transaction->updated_at->lte(now()->subSeconds($delaySeconds));
    }

    /**
     * The reconciliation throttle to apply for this transaction: a short
     * window right after the commuter claims the QR (they're actively on
     * PayMongo's checkout page and a webhook is imminent), backing off to
     * the steady-state throttle once that window has passed and the row is
     * more likely stalled/abandoned than about to resolve.
     */
    private function reconcileThrottleFor(Transaction $transaction): int
    {
        $activeWindowSeconds = (int) config('payments.reconcile_active_window_seconds', 90);
        $createdAt = $transaction->created_at;

        if ($activeWindowSeconds > 0 && $createdAt && $createdAt->copy()->addSeconds($activeWindowSeconds)->isFuture()) {
            return (int) config('payments.reconcile_active_throttle_seconds', 5);
        }

        return (int) config('payments.reconcile_throttle_seconds', 30);
    }

    /**
     * Whether an EXPIRED GCash transaction is still inside the late-settlement
     * grace window — the window during which a delayed PayMongo webhook could
     * still flip it to PAID. Past this window, reconciliation is futile.
     */
    private function withinLateSettlementWindow(Transaction $transaction): bool
    {
        $graceSeconds = (int) config('payments.late_settlement_grace_seconds', 60);
        if ($graceSeconds <= 0) {
            return false;
        }

        $updated = $transaction->updated_at;
        if (! $updated) {
            return true; // unknown — give the benefit of the doubt
        }

        return $updated->gt(now()->subSeconds($graceSeconds));
    }

    /**
     * Cancel a payment at the provider before committing the local state.
     * A provider reference is absent only before a group QR has been claimed,
     * when no external payment resource exists yet.
     */
    public function cancel(Transaction $transaction): Transaction
    {
        $providerStatus = PaymentStatus::CANCELLED;

        if ($transaction->payment_reference) {
            try {
                $providerStatus = $this->gateway->cancelIntent($transaction->payment_reference);
            } catch (PaymentGatewayException $cancelError) {
                // The payment may have settled while cancellation was in
                // flight. Prefer the provider's truth over marking it unpaid.
                $fresh = $transaction->fresh();
                if ($fresh->status !== PaymentStatus::PENDING) {
                    return $fresh;
                }

                try {
                    $providerStatus = $this->gateway->retrieveStatus($transaction->payment_reference);
                } catch (PaymentGatewayException) {
                    throw $cancelError;
                }

                if (in_array($providerStatus, [PaymentStatus::PENDING, PaymentStatus::PROCESSING], true)) {
                    throw $cancelError;
                }
            }
        }

        $result = DB::transaction(function () use ($transaction, $providerStatus) {
            $this->lockPaymentShift($transaction->shift_id);
            $locked = Transaction::query()
                ->lockForUpdate()
                ->findOrFail($transaction->transaction_id);
            $result = $this->transitionLocked($locked, $providerStatus);

            if ($result['transaction']->status === PaymentStatus::CANCELLED) {
                $query = Transaction::query();
                if ($result['transaction']->group_id) {
                    $query->where('group_id', $result['transaction']->group_id);
                } else {
                    $query->where('transaction_id', $result['transaction']->transaction_id);
                }
                $query->update([
                    'qr_token' => null,
                    'payment_checkout_url' => null,
                ]);
                $result['transaction'] = $result['transaction']->fresh();
            }

            return $result;
        }, 3);

        if ($result['changed']) {
            broadcast(new PaymentStatusUpdated($result['transaction'], $result['transaction']->status->value));
        }

        return $result['transaction'];
    }

    /**
     * Transition a transaction to a new payment status, enforcing the state
     * machine (an out-of-order/replayed event cannot regress a settled
     * payment) and broadcasting the change. Same-status is an idempotent no-op.
     */
    public function transitionTo(Transaction $transaction, PaymentStatus $target): Transaction
    {
        $result = DB::transaction(function () use ($transaction, $target) {
            $this->lockPaymentShift($transaction->shift_id);
            $locked = Transaction::query()
                ->lockForUpdate()
                ->findOrFail($transaction->transaction_id);

            return $this->transitionLocked($locked, $target);
        }, 3);

        if ($result['changed']) {
            broadcast(new PaymentStatusUpdated($result['transaction'], $target->value));
        }

        return $result['transaction'];
    }

    /**
     * Lazily cancel a stale PENDING GCash transaction.
     *
     * Every read path that cares about freshness calls this (status polling,
     * the pending-resume lookup, initiate's reuse check, claim) and so does
     * the payments:expire-stale job. Past the claim TTL the payment is
     * cancelled through cancel(), which closes it at the provider first: a
     * timed-out QR can then no longer be paid after the conductor has given
     * up on it (and possibly collected cash instead). cancel() checks the
     * provider's truth when the close is refused, so a payment that was paid
     * or is still processing is recorded as such, never cancelled.
     *
     * A grouped payment is cancelled through the payer's row, the only one
     * holding the provider reference. When the provider can't be reached the
     * row stays PENDING and the next poll or job run retries, throttled per
     * payment so pollers don't hammer the provider.
     */
    public function cancelIfStale(Transaction $transaction): Transaction
    {
        if ($transaction->status !== PaymentStatus::PENDING) {
            return $transaction;
        }

        if ($transaction->payment_method !== PaymentMethod::GCASH) {
            return $transaction;
        }

        $ttlMinutes = (int) config('payments.gcash_claim_ttl_minutes', 10);
        $createdAt = $transaction->created_at;

        if (! $createdAt || $createdAt->copy()->addMinutes($ttlMinutes)->isFuture()) {
            return $transaction;
        }

        $gatewayRow = $this->gatewayRowFor($transaction);
        $throttleSeconds = max(5, (int) config('payments.reconcile_throttle_seconds', 30));
        if (! Cache::add("payment.stale-cancel.{$gatewayRow->transaction_id}", now()->timestamp, $throttleSeconds)) {
            return $transaction; // another reader is cancelling it (or just tried)
        }

        try {
            $this->cancel($gatewayRow);
        } catch (PaymentGatewayException $e) {
            Log::warning('Stale payment cancellation deferred', [
                'transaction_id' => $gatewayRow->transaction_id,
                'reference' => $gatewayRow->payment_reference,
                'error' => $e->getMessage(),
            ]);
        }

        return $transaction->fresh();
    }

    /**
     * The row that carries a payment's provider reference: the transaction
     * itself, or for a grouped payment the payer's row (companion receipts
     * never hold one). Falls back to the given row when no reference exists
     * yet, e.g. a group QR nobody has claimed.
     */
    public function gatewayRowFor(Transaction $transaction): Transaction
    {
        if (! $transaction->group_id || $transaction->payment_reference) {
            return $transaction;
        }

        return Transaction::query()
            ->where('group_id', $transaction->group_id)
            ->whereNotNull('payment_reference')
            ->first() ?? $transaction;
    }

    /**
     * Close a provider payment that is being replaced, without touching local
     * state. Returns the provider's status afterwards: CANCELLED once it can
     * no longer be paid, or PAID/PROCESSING when the commuter already paid or
     * is paying it, in which case it must not be replaced.
     *
     * @throws PaymentGatewayException when the provider can't be reached
     */
    public function voidIntent(string $reference): PaymentStatus
    {
        try {
            return $this->gateway->cancelIntent($reference);
        } catch (PaymentGatewayException $cancelError) {
            try {
                return $this->gateway->retrieveStatus($reference);
            } catch (PaymentGatewayException) {
                throw $cancelError;
            }
        }
    }

    /**
     * Find the transaction a webhook refers to: primarily by provider
     * reference, falling back to the transaction_id echoed in metadata.
     */
    private function locateTransactionForUpdate(WebhookEvent $event): ?Transaction
    {
        $candidate = Transaction::query()
            ->where('payment_reference', $event->reference)
            ->first();

        if ($candidate) {
            $this->lockPaymentShift($candidate->shift_id);

            return Transaction::query()->lockForUpdate()->find($candidate->transaction_id);
        }

        if ($transactionId = $event->transactionId()) {
            $candidate = Transaction::query()
                ->where('transaction_id', $transactionId)
                ->first();

            if ($candidate) {
                $this->lockPaymentShift($candidate->shift_id);

                return Transaction::query()->lockForUpdate()->find($candidate->transaction_id);
            }
        }

        return null;
    }

    /**
     * Apply a transition to a locked transaction and its complete payment group.
     * The caller owns the surrounding database transaction and external effects.
     *
     * @return array{transaction: Transaction, changed: bool}
     */
    private function transitionLocked(Transaction $transaction, PaymentStatus $target): array
    {
        $transactions = $transaction->group_id
            ? Transaction::query()
                ->where('group_id', $transaction->group_id)
                ->orderBy('transaction_id')
                ->lockForUpdate()
                ->get()
            : collect([$transaction]);

        // Provider truth wins over an earlier local cancellation. Keep the
        // payment PAID for financial accuracy, but block rewards and flag the
        // complete group for explicit refund/reconciliation handling.
        if ($target === PaymentStatus::PAID
            && $transactions->contains(fn (Transaction $item): bool => $item->status === PaymentStatus::CANCELLED)
            && $transactions->every(fn (Transaction $item): bool => in_array(
                $item->status,
                [PaymentStatus::CANCELLED, PaymentStatus::PAID],
                true
            ))) {
            Transaction::query()
                ->whereIn('transaction_id', $transactions->pluck('transaction_id'))
                ->update([
                    'status' => PaymentStatus::PAID->value,
                    'paid_at' => now(),
                    'reward_eligible' => false,
                    'payment_reconciliation_status' => 'REFUND_REQUIRED',
                    'payment_reconciliation_reason' => 'Provider reported a successful payment after local cancellation.',
                    'payment_reconciliation_required_at' => now(),
                    'payment_reconciliation_resolved_at' => null,
                ]);

            $this->shiftCloseoutService->refreshEndedShiftRemittance($transaction->shift_id);

            return [
                'transaction' => Transaction::findOrFail($transaction->transaction_id),
                'changed' => true,
            ];
        }

        $invalid = $transactions->first(function (Transaction $item) use ($target): bool {
            /** @var PaymentStatus $current */
            $current = $item->status;

            return $current !== $target && ! $current->canTransitionTo($target);
        });

        if ($invalid) {
            Log::info('Payment status transition skipped (not allowed)', [
                'transaction_id' => $transaction->transaction_id,
                'group_id' => $transaction->group_id,
                'blocked_transaction_id' => $invalid->transaction_id,
                'from' => $invalid->status->value,
                'to' => $target->value,
            ]);

            return ['transaction' => $transaction->fresh(), 'changed' => false];
        }

        $changed = $transactions->contains(
            fn (Transaction $item): bool => $item->status !== $target
        );

        if (! $changed) {
            return ['transaction' => $transaction->fresh(), 'changed' => false];
        }

        $attributes = ['status' => $target->value];
        if ($target === PaymentStatus::PAID) {
            $existingPaidAt = $transactions->first(
                fn (Transaction $item): bool => $item->status === PaymentStatus::PAID && $item->paid_at !== null
            )?->paid_at;
            $attributes['paid_at'] = $existingPaidAt ?? now();
        }
        if ($target === PaymentStatus::REFUNDED && $transactions->contains(
            fn (Transaction $item): bool => $item->payment_reconciliation_status === 'REFUND_REQUIRED'
        )) {
            $attributes['payment_reconciliation_status'] = 'REFUNDED';
            $attributes['payment_reconciliation_resolved_at'] = now();
        }

        // A row can carry a voucher_id before the GCash charge actually
        // settles — TransactionService::redeemVoucherForGcash() applies the
        // voucher to the payer's own fare immediately (so it can't be
        // double-spent) while the remaining charge is still PENDING. If that
        // charge never completes (FAILED/CANCELLED/EXPIRED instead of PAID),
        // the voucher must be handed back — otherwise a commuter loses a real
        // reward for a ride that never happened. The row is unlinked too:
        // transactions.voucher_id is unique, so a released voucher still
        // linked here could never be redeemed again.
        if (in_array($target, [PaymentStatus::FAILED, PaymentStatus::CANCELLED, PaymentStatus::EXPIRED], true)) {
            $voucherRows = $transactions
                ->filter(fn (Transaction $item): bool => $item->voucher_id !== null && $item->status !== PaymentStatus::PAID);

            if ($voucherRows->isNotEmpty()) {
                Voucher::query()
                    ->whereIn('id', $voucherRows->pluck('voucher_id'))
                    ->where('status', 'USED')
                    ->update(['status' => Voucher::STATUS_AVAILABLE]);

                Transaction::query()
                    ->whereIn('transaction_id', $voucherRows->pluck('transaction_id'))
                    ->update(['voucher_id' => null]);
            }
        }

        Transaction::query()
            ->whereIn('transaction_id', $transactions->pluck('transaction_id'))
            ->update($attributes);

        if ($target === PaymentStatus::PAID) {
            // A payer whose whole fare a voucher covered stays a GCash row
            // while the companions' charge is owed (so polling, expiry and
            // cancellation keep handling it); once that charge settles, the
            // payer's seat is recorded as the voucher ride it is.
            Transaction::query()
                ->whereIn('transaction_id', $transactions->pluck('transaction_id'))
                ->whereNotNull('voucher_id')
                ->where('final_amount', '<=', 0)
                ->where('payment_method', PaymentMethod::GCASH->value)
                ->update(['payment_method' => PaymentMethod::VOUCHER->value]);

            $rewardableTransactions = Transaction::query()
                ->whereIn('transaction_id', $transactions->pluck('transaction_id'))
                ->whereNotNull('passenger_id')
                ->where('reward_eligible', true)
                ->whereNull('payment_reconciliation_status')
                ->get();

            foreach ($rewardableTransactions as $rewardableTransaction) {
                $this->rewardService->issueForRewardableRide(
                    $rewardableTransaction,
                    $rewardableTransaction->paid_at ?? now(),
                );
            }

            $this->shiftCloseoutService->refreshEndedShiftRemittance($transaction->shift_id);
        }

        return [
            'transaction' => Transaction::findOrFail($transaction->transaction_id),
            'changed' => true,
        ];
    }

    /** All payment-state writers take the shift lock before transaction locks. */
    private function lockPaymentShift(string $shiftId): void
    {
        ShiftLog::query()
            ->where('shift_id', $shiftId)
            ->lockForUpdate()
            ->firstOrFail();
    }
}
