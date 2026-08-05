<?php

namespace App\Services\Payments\Gateways;

use App\Contracts\Payments\PaymentGateway;
use App\Enums\PaymentStatus;
use App\Support\Payments\PaymentIntentResult;
use App\Support\Payments\WebhookEvent;
use Illuminate\Support\Str;

/**
 * No-op / in-memory payment gateway.
 *
 * Used when no real provider is configured (e.g. before PayMongo keys
 * arrive) so the GCash lifecycle remains exercisable end-to-end:
 *   - createIntent returns a PENDING intent with a synthetic reference and
 *     NO checkout URL (the frontend shows a clearly-gated "simulate" control
 *     instead of a real authorize redirect).
 *   - the dev-simulation endpoint feeds a canonical event back through the
 *     SAME webhook/state-machine path, so the simulated path proves the real
 *     wiring rather than bypassing it.
 *
 * The moment a real gateway is configured, the binding switches to it with
 * zero code changes elsewhere.
 */
class FakeGateway implements PaymentGateway
{
    public function name(): string
    {
        return 'fake';
    }

    public function isConfigured(): bool
    {
        // Always "ready" — it never makes external calls, so GCash can be
        // demonstrated without provider credentials.
        return true;
    }

    public function createIntent(int $amountCentavos, array $metadata, string $returnUrl): PaymentIntentResult
    {
        return new PaymentIntentResult(
            reference: 'fake_'.Str::lower(Str::random(24)),
            status: PaymentStatus::PENDING,
            checkoutUrl: null, // no real authorize page; UI uses the dev-sim control
            raw: ['simulated' => true, 'metadata' => $metadata, 'amount' => $amountCentavos],
        );
    }

    public function retrieveStatus(string $reference): PaymentStatus
    {
        // Status only changes via the dev-simulation endpoint, not polling.
        return PaymentStatus::PENDING;
    }

    public function cancelIntent(string $reference): PaymentStatus
    {
        return PaymentStatus::CANCELLED;
    }

    public function webhookSignatureHeader(): string
    {
        return 'X-Fake-Signature';
    }

    public function verifyWebhookSignature(string $rawBody, ?string $signatureHeader): bool
    {
        // No signing in fake mode; the dev-sim endpoint is the only caller and
        // is gated separately (config + auth).
        return true;
    }

    public function parseWebhookEvent(string $rawBody): ?WebhookEvent
    {
        $payload = json_decode($rawBody, true) ?: [];

        $id = $payload['id'] ?? null;
        $reference = $payload['reference'] ?? null;
        $status = PaymentStatus::tryFrom($payload['status'] ?? '');

        if (! $id || ! $reference || ! $status) {
            return null;
        }

        return new WebhookEvent(
            id: $id,
            type: $payload['type'] ?? 'simulated',
            reference: $reference,
            status: $status,
            metadata: is_array($payload['metadata'] ?? null) ? $payload['metadata'] : [],
            raw: $payload,
        );
    }
}
