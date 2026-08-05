<?php

namespace App\Services;

use App\Contracts\Payments\PaymentGateway;
use App\Enums\PaymentMethod;
use App\Enums\PaymentStatus;
use App\Events\PaymentStatusUpdated;
use App\Models\PaymentEvent;
use App\Models\Transaction;
use App\Support\Payments\PaymentGatewayException;
use App\Support\Payments\PaymentIntentResult;
use App\Support\Payments\WebhookEvent;
use Illuminate\Database\UniqueConstraintViolationException;
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
            });

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
     * Transition a transaction to a new payment status, enforcing the state
     * machine (an out-of-order/replayed event cannot regress a settled
     * payment) and broadcasting the change. Same-status is an idempotent no-op.
     */
    public function transitionTo(Transaction $transaction, PaymentStatus $target): Transaction
    {
        $result = DB::transaction(function () use ($transaction, $target) {
            $locked = Transaction::query()
                ->lockForUpdate()
                ->findOrFail($transaction->transaction_id);

            return $this->transitionLocked($locked, $target);
        });

        if ($result['changed']) {
            broadcast(new PaymentStatusUpdated($result['transaction'], $target->value));
        }

        return $result['transaction'];
    }

    /**
     * Lazily expire a stale PENDING GCash transaction.
     *
     * Nothing proactively flips PENDING → EXPIRED (no cron on shared
     * hosting), so every read path that cares about freshness calls this:
     * status polling, the pending-resume lookup, and initiate's reuse check.
     * Past the claim TTL the row is transitioned through the state machine
     * (broadcasts PaymentStatusUpdated like any other change); otherwise the
     * transaction is returned untouched.
     */
    public function expireIfStale(Transaction $transaction): Transaction
    {
        if ($transaction->status !== PaymentStatus::PENDING) {
            return $transaction;
        }

        if ($transaction->payment_method !== PaymentMethod::GCASH) {
            return $transaction;
        }

        $ttlMinutes = (int) config('payments.gcash_claim_ttl_minutes', 10);
        $createdAt = $transaction->created_at;

        if ($createdAt && $createdAt->copy()->addMinutes($ttlMinutes)->isPast()) {
            return $this->transitionTo($transaction, PaymentStatus::EXPIRED);
        }

        return $transaction;
    }

    /**
     * Find the transaction a webhook refers to: primarily by provider
     * reference, falling back to the transaction_id echoed in metadata.
     */
    private function locateTransactionForUpdate(WebhookEvent $event): ?Transaction
    {
        $transaction = Transaction::query()
            ->where('payment_reference', $event->reference)
            ->lockForUpdate()
            ->first();

        if ($transaction) {
            return $transaction;
        }

        if ($transactionId = $event->transactionId()) {
            return Transaction::query()
                ->where('transaction_id', $transactionId)
                ->lockForUpdate()
                ->first();
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

        Transaction::query()
            ->whereIn('transaction_id', $transactions->pluck('transaction_id'))
            ->update($attributes);

        return [
            'transaction' => Transaction::findOrFail($transaction->transaction_id),
            'changed' => true,
        ];
    }
}
