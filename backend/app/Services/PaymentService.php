<?php

namespace App\Services;

use App\Contracts\Payments\PaymentGateway;
use App\Enums\PaymentMethod;
use App\Enums\PaymentStatus;
use App\Events\PaymentStatusUpdated;
use App\Models\PaymentEvent;
use App\Models\Transaction;
use App\Support\Payments\PaymentIntentResult;
use App\Support\Payments\WebhookEvent;
use Illuminate\Database\QueryException;
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
     * @throws \App\Support\Payments\PaymentGatewayException
     */
    public function createIntentFor(Transaction $transaction, int $amountCentavos): PaymentIntentResult
    {
        // PayMongo redirects the commuter back to return_url after they authorize.
        // The browser redirect carries no metadata, so append the transaction_id
        // to the query string — /gcash/return reads it to poll this transaction.
        $returnUrl = (string) config('payments.return_url');
        $returnUrl .= (str_contains($returnUrl, '?') ? '&' : '?')
            . 'transaction_id=' . urlencode($transaction->transaction_id);

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
     * @return Transaction|null  The affected transaction, or null if unknown.
     */
    public function applyWebhookEvent(WebhookEvent $event): ?Transaction
    {
        $provider = $this->gateway->name();
        $transaction = $this->locateTransaction($event);

        try {
            return DB::transaction(function () use ($event, $provider, $transaction) {
                // Already processed? (audit row exists) → no-op.
                $seen = PaymentEvent::where('provider', $provider)
                    ->where('event_id', $event->id)
                    ->lockForUpdate()
                    ->exists();

                if ($seen) {
                    return $transaction;
                }

                PaymentEvent::create([
                    'provider' => $provider,
                    'event_id' => $event->id,
                    'transaction_id' => $transaction?->transaction_id,
                    'type' => $event->type,
                    'status' => $event->status->value,
                    'payload' => $event->raw,
                ]);

                if ($transaction) {
                    $this->transitionTo($transaction, $event->status);
                }

                return $transaction;
            });
        } catch (UniqueConstraintViolationException|QueryException $e) {
            // Lost the concurrent unique race → another worker handled it.
            Log::info('Payment webhook duplicate suppressed', [
                'provider' => $provider,
                'event_id' => $event->id,
            ]);

            return $transaction;
        }
    }

    /**
     * Poll the provider for the current status and reconcile. Used as a
     * fallback when the webhook is delayed. Safe no-op for non-gateway rows.
     *
     * @throws \App\Support\Payments\PaymentGatewayException
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
        /** @var PaymentStatus $current */
        $current = $transaction->status;

        if ($current === $target) {
            return $transaction;
        }

        if (! $current->canTransitionTo($target)) {
            Log::info('Payment status transition skipped (not allowed)', [
                'transaction_id' => $transaction->transaction_id,
                'from' => $current->value,
                'to' => $target->value,
            ]);

            return $transaction;
        }

        $attributes = ['status' => $target->value];
        if ($target === PaymentStatus::PAID) {
            $attributes['paid_at'] = now();
        }

        $transaction->update($attributes);
        $transaction->refresh();

        broadcast(new PaymentStatusUpdated($transaction, $target->value));

        return $transaction;
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

        $ttlMinutes = (int) config('payments.gcash_claim_ttl_minutes', 3);
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
    private function locateTransaction(WebhookEvent $event): ?Transaction
    {
        $transaction = Transaction::where('payment_reference', $event->reference)->first();
        if ($transaction) {
            return $transaction;
        }

        if ($transactionId = $event->transactionId()) {
            return Transaction::where('transaction_id', $transactionId)->first();
        }

        return null;
    }
}
