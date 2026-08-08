<?php

namespace App\Services\Payments\Gateways;

use App\Contracts\Payments\PaymentGateway;
use App\Enums\PaymentStatus;
use App\Support\Payments\PaymentGatewayException;
use App\Support\Payments\PaymentIntentResult;
use App\Support\Payments\WebhookEvent;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\PendingRequest;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * PayMongo implementation of the provider-agnostic PaymentGateway.
 *
 * Translates PayMongo's GCash redirect/authorize flow + webhook vocabulary
 * onto our canonical contract. Nothing PayMongo-specific leaks past this
 * class — swap the bound gateway in config to change providers.
 *
 * GCash flow (3 calls): create PaymentIntent → create gcash PaymentMethod →
 * attach (returns next_action.redirect.url = hosted authorize URL). In
 * SANDBOX that hosted page shows test Authorize/Fail buttons (no real
 * number/PIN/OTP); only the API key + that page differ from LIVE.
 *
 * Resilience: connection-level failures are retried (safe — the request
 * never reached PayMongo, so no duplicate intent). Non-2xx responses are
 * NOT retried (the call was processed) and raise PaymentGatewayException.
 */
class PayMongoGateway implements PaymentGateway
{
    public function __construct(
        private readonly ?string $secretKey,
        private readonly ?string $webhookSecret,
        private readonly string $baseUrl = 'https://api.paymongo.com/v1',
        private readonly int $timeoutSeconds = 30,
        private readonly int $retryTimes = 2,
        private readonly int $retrySleepMs = 250,
    ) {}

    public function name(): string
    {
        return 'paymongo';
    }

    public function isConfigured(): bool
    {
        return is_string($this->secretKey) && $this->secretKey !== '';
    }

    public function createIntent(int $amountCentavos, array $metadata, string $returnUrl): PaymentIntentResult
    {
        $this->assertConfigured();

        try {
            // 1. PaymentIntent
            $intent = $this->request()
                ->post("{$this->baseUrl}/payment_intents", [
                    'data' => ['attributes' => [
                        'amount' => $amountCentavos,
                        'currency' => 'PHP',
                        'payment_method_allowed' => ['gcash'],
                        'capture_type' => 'automatic',
                        'metadata' => $metadata,
                    ]],
                ]);
            $this->ensureSuccess($intent, 'create payment_intent');
            $intentId = $intent->json('data.id');
            if (! $intentId) {
                throw new PaymentGatewayException('PayMongo: payment_intent response missing data.id');
            }

            // 2. GCash PaymentMethod
            $method = $this->request()
                ->post("{$this->baseUrl}/payment_methods", [
                    'data' => ['attributes' => ['type' => 'gcash']],
                ]);
            $this->ensureSuccess($method, 'create payment_method');
            $methodId = $method->json('data.id');
            if (! $methodId) {
                throw new PaymentGatewayException('PayMongo: payment_method response missing data.id');
            }

            // 3. Attach → hosted authorize URL
            $attach = $this->request()
                ->post("{$this->baseUrl}/payment_intents/{$intentId}/attach", [
                    'data' => ['attributes' => [
                        'payment_method' => $methodId,
                        'return_url' => $returnUrl,
                    ]],
                ]);
            $this->ensureSuccess($attach, 'attach payment_method');
        } catch (ConnectionException $e) {
            throw new PaymentGatewayException(
                'PayMongo connection failed: '.$e->getMessage(),
                context: ['operation' => 'create_intent']
            );
        }

        $checkoutUrl = $attach->json('data.attributes.next_action.redirect.url');
        if (! $checkoutUrl) {
            throw new PaymentGatewayException('PayMongo: attach response missing next_action.redirect.url');
        }

        return new PaymentIntentResult(
            reference: $intentId,
            status: $this->mapIntentStatus($attach->json('data.attributes.status')),
            checkoutUrl: $checkoutUrl,
            raw: ['intent' => $intent->json('data'), 'attach' => $attach->json('data')],
        );
    }

    public function retrieveStatus(string $reference): PaymentStatus
    {
        $this->assertConfigured();

        try {
            $response = $this->request()->get("{$this->baseUrl}/payment_intents/{$reference}");
        } catch (ConnectionException $e) {
            throw new PaymentGatewayException(
                'PayMongo connection failed: '.$e->getMessage(),
                context: ['operation' => 'retrieve_status']
            );
        }
        $this->ensureSuccess($response, 'get payment_intent');

        return $this->mapIntentStatus($response->json('data.attributes.status'));
    }

    public function cancelIntent(string $reference): PaymentStatus
    {
        $this->assertConfigured();

        try {
            $response = $this->request()->post("{$this->baseUrl}/payment_intents/{$reference}/cancel");
        } catch (ConnectionException $e) {
            throw new PaymentGatewayException(
                'PayMongo connection failed: '.$e->getMessage(),
                context: ['operation' => 'cancel_intent']
            );
        }
        $this->ensureSuccess($response, 'cancel payment_intent');

        return $this->mapIntentStatus($response->json('data.attributes.status'));
    }

    public function webhookSignatureHeader(): string
    {
        return 'Paymongo-Signature';
    }

    public function verifyWebhookSignature(string $rawBody, ?string $signatureHeader): bool
    {
        if (! $this->webhookSecret || $this->webhookSecret === '') {
            throw new PaymentGatewayException('PayMongo webhook secret not configured.');
        }
        if (! $signatureHeader) {
            return false;
        }

        // Header format: t={timestamp},te={testSig},li={liveSig}
        $parts = [];
        foreach (explode(',', $signatureHeader) as $segment) {
            $kv = explode('=', $segment, 2);
            if (count($kv) === 2) {
                $parts[trim($kv[0])] = trim($kv[1]);
            }
        }

        $timestamp = $parts['t'] ?? null;
        if (! $timestamp) {
            return false;
        }

        $expected = hash_hmac('sha256', $timestamp.'.'.$rawBody, $this->webhookSecret);
        $candidate = $this->isSandbox() ? ($parts['te'] ?? null) : ($parts['li'] ?? null);

        return $candidate !== null && hash_equals($candidate, $expected);
    }

    public function parseWebhookEvent(string $rawBody): ?WebhookEvent
    {
        $payload = json_decode($rawBody, true) ?: [];
        $eventId = $payload['data']['id'] ?? null;
        $eventType = $payload['data']['attributes']['type'] ?? null;
        $resource = $payload['data']['attributes']['data'] ?? null;

        if (! $eventId || ! $eventType || ! is_array($resource)) {
            return null;
        }

        $status = $this->mapEventType($eventType);
        if (! $status) {
            return null; // event type we don't handle → acknowledge + ignore
        }

        $attributes = $resource['attributes'] ?? [];
        $reference = $attributes['payment_intent_id']
            ?? ($attributes['payment_intent']['id'] ?? null);

        // Metadata may live on the payment or the nested payment_intent.
        $metadata = $attributes['metadata']
            ?? ($attributes['payment_intent']['attributes']['metadata'] ?? []);

        if (! $reference) {
            return null;
        }

        return new WebhookEvent(
            id: $eventId,
            type: $eventType,
            reference: $reference,
            status: $status,
            metadata: is_array($metadata) ? $metadata : [],
            raw: $payload,
        );
    }

    // ─── Internals ──────────────────────────────────────────────────

    private function isSandbox(): bool
    {
        return is_string($this->secretKey) && str_starts_with($this->secretKey, 'sk_test_');
    }

    private function assertConfigured(): void
    {
        if (! $this->isConfigured()) {
            throw new PaymentGatewayException(
                'PayMongo secret key not configured. Set PAYMONGO_SECRET_KEY in .env.'
            );
        }
    }

    private function request(): PendingRequest
    {
        return Http::withBasicAuth($this->secretKey, '')
            ->timeout($this->timeoutSeconds)
            // Retry connection-level failures only — a failed connection means
            // PayMongo never received the request, so retrying a POST cannot
            // create a duplicate intent. Non-2xx responses are not retried.
            ->retry($this->retryTimes, $this->retrySleepMs, function ($exception) {
                return $exception instanceof ConnectionException;
            }, throw: false);
    }

    private function ensureSuccess($response, string $operation): void
    {
        if ($response->successful()) {
            return;
        }

        $body = $response->json() ?: $response->body();
        Log::error('PayMongo API call failed', [
            'operation' => $operation,
            'status' => $response->status(),
            'body' => $body, // never logs the Authorization header / key
        ]);

        $detail = is_array($body) && isset($body['errors'][0]['detail'])
            ? $body['errors'][0]['detail']
            : 'HTTP '.$response->status();

        throw new PaymentGatewayException(
            "PayMongo: failed to {$operation} (HTTP {$response->status()}): {$detail}",
            providerStatus: $response->status(),
        );
    }

    /**
     * Map a PayMongo PaymentIntent status onto our canonical PaymentStatus.
     */
    private function mapIntentStatus(?string $status): PaymentStatus
    {
        return match ($status) {
            'succeeded' => PaymentStatus::PAID,
            'processing' => PaymentStatus::PROCESSING,
            'awaiting_next_action', 'awaiting_payment_method' => PaymentStatus::PENDING,
            'cancelled' => PaymentStatus::CANCELLED,
            default => PaymentStatus::FAILED,
        };
    }

    /**
     * Map a PayMongo webhook event type onto the canonical status it implies,
     * or null for event types we don't act on.
     */
    private function mapEventType(string $type): ?PaymentStatus
    {
        return match ($type) {
            'payment.paid' => PaymentStatus::PAID,
            'payment.failed' => PaymentStatus::FAILED,
            'payment.refunded', 'refund.updated' => PaymentStatus::REFUNDED,
            default => null,
        };
    }
}
