<?php

namespace App\Contracts\Payments;

use App\Enums\PaymentStatus;
use App\Support\Payments\PaymentIntentResult;
use App\Support\Payments\WebhookEvent;

/**
 * Provider-agnostic payment gateway contract.
 *
 * Everything the application needs from a payment provider is expressed here
 * in canonical terms (centavos, PaymentStatus, our DTOs). Each provider
 * (PayMongo today; Maya/Stripe/etc. tomorrow) implements this and is
 * responsible for translating its own API shapes and status vocabulary onto
 * these methods. Adding a new provider = one new class + a config entry; no
 * changes to controllers, services, or the database.
 *
 * Implementations MUST NOT leak provider-specific types past this boundary.
 */
interface PaymentGateway
{
    /**
     * Stable provider identifier persisted on the transaction
     * (e.g. "paymongo", "fake"). Used to route status/webhook handling.
     */
    public function name(): string;

    /**
     * Whether the gateway has the credentials/config required for live calls.
     * When false, the app treats GCash as "provider not ready" and degrades
     * gracefully instead of erroring.
     */
    public function isConfigured(): bool;

    /**
     * Create a payment intent for the given amount.
     *
     * @param  int    $amountCentavos  Amount in centavos (pesos * 100).
     * @param  array  $metadata        Correlation data echoed back by the
     *                                  provider (must include transaction_id).
     * @param  string $returnUrl       Where the payer is redirected after authorize.
     *
     * @throws \App\Support\Payments\PaymentGatewayException on any failure.
     */
    public function createIntent(int $amountCentavos, array $metadata, string $returnUrl): PaymentIntentResult;

    /**
     * Retrieve the current canonical status of a previously-created intent.
     * Used as a polling fallback when a webhook is delayed.
     *
     * @throws \App\Support\Payments\PaymentGatewayException on any failure.
     */
    public function retrieveStatus(string $reference): PaymentStatus;

    /**
     * The HTTP header that carries this provider's webhook signature, so the
     * controller never hardcodes a provider-specific header name.
     */
    public function webhookSignatureHeader(): string;

    /**
     * Verify a webhook's signature against its raw body. MUST be called and
     * pass before any event is acted upon.
     */
    public function verifyWebhookSignature(string $rawBody, ?string $signatureHeader): bool;

    /**
     * Parse an already-verified webhook body into a canonical event, or null
     * if the event type is not one we handle (acknowledge + ignore).
     */
    public function parseWebhookEvent(string $rawBody): ?WebhookEvent;
}
