<?php

namespace App\Support\Payments;

use RuntimeException;

/**
 * Thrown by a PaymentGateway when a provider call fails (misconfiguration,
 * network/transport error, or a non-2xx provider response).
 *
 * Callers (PaymentService) catch this to decide whether to surface a 502 to
 * the client and roll back, vs. degrade gracefully when no gateway is
 * configured. The provider error body is captured for logging — never the
 * API key.
 */
class PaymentGatewayException extends RuntimeException
{
    public function __construct(
        string $message,
        public readonly ?int $providerStatus = null,
        public readonly array $context = [],
    ) {
        parent::__construct($message);
    }
}
