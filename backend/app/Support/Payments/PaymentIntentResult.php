<?php

namespace App\Support\Payments;

use App\Enums\PaymentStatus;

/**
 * Immutable result of creating a payment intent through a gateway.
 *
 * Provider-neutral: the rest of the app reads these fields regardless of
 * which gateway produced them.
 */
final class PaymentIntentResult
{
    public function __construct(
        /** Provider-side reference (e.g. PayMongo PaymentIntent id) used to correlate webhooks/status. */
        public readonly string $reference,
        /** Canonical status at creation time (usually PENDING). */
        public readonly PaymentStatus $status,
        /** Hosted authorize/checkout URL the payer is redirected to (null if the gateway has none). */
        public readonly ?string $checkoutUrl = null,
        /** Raw provider payload, for logging/debugging only — never relied on by callers. */
        public readonly array $raw = [],
    ) {}
}
