<?php

namespace App\Support\Payments;

use App\Enums\PaymentStatus;

/**
 * Immutable, provider-neutral representation of a payment webhook event,
 * produced by a gateway's parseWebhookEvent() after signature verification.
 *
 * The controller/service never touch raw provider JSON — they act on this.
 */
final class WebhookEvent
{
    public function __construct(
        /** Provider event id — the idempotency key (a replayed event has the same id). */
        public readonly string $id,
        /** Raw provider event type, kept for logging/audit (e.g. "payment.paid"). */
        public readonly string $type,
        /** Provider reference to correlate back to our transaction (intent id). */
        public readonly string $reference,
        /** Canonical status this event represents. */
        public readonly PaymentStatus $status,
        /** Metadata we attached at creation (e.g. transaction_id) echoed back by the provider. */
        public readonly array $metadata = [],
        /** Raw provider payload, for the audit log only. */
        public readonly array $raw = [],
    ) {}

    /**
     * Our transaction id, if the provider echoed it back in metadata.
     */
    public function transactionId(): ?string
    {
        return $this->metadata['transaction_id'] ?? null;
    }
}
