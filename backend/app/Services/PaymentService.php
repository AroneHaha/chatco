<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * PaymentService — PayMongo GCash integration (SANDBOX + LIVE).
 *
 * S4-T3: Real PayMongo SANDBOX integration. Replaces the S4-T2 stub.
 *
 * ─────────────────────────────────────────────────────────────────────
 * HOW PAYMONGO GCASH WORKS (read this before editing)
 * ─────────────────────────────────────────────────────────────────────
 * Our app QR is an INTERNAL binding QR (S4-T10 / S4-T12) — it is scanned
 * by OUR commuter app, NOT by the GCash app. PayMongo GCash itself is a
 * redirect/authorize flow:
 *
 *   1. createGcashIntent() does 3 PayMongo API calls:
 *        a. POST /payment_intents  -> intent id
 *        b. POST /payment_methods  -> gcash payment_method id
 *        c. POST /payment_intents/{id}/attach { payment_method, return_url }
 *           -> response.next_action.redirect.url = hosted checkout_url
 *
 *   2. The commuter's browser is redirected to checkout_url. In SANDBOX
 *      this page shows "Authorize Test Payment" / "Fail Test Payment"
 *      buttons (NO number/PIN/OTP — those appear only in LIVE). Sandbox
 *      cannot validate a real balance; success vs failure is chosen via
 *      those test buttons.
 *
 *   3. After the commuter clicks a button, PayMongo redirects to
 *      return_url and fires a webhook (S4-T6). The webhook calls
 *      TransactionService::markPaid() or markFailed().
 *
 *   4. verifyIntent() can be called to poll the live PayMongo status
 *      if the webhook is delayed. Maps PayMongo statuses to our
 *      Transaction status values.
 *
 * The ONLY differences between sandbox and live are the API key and
 * that authorize page — so live requires zero code change, just the key.
 *
 * ─────────────────────────────────────────────────────────────────────
 * CONFIG
 * ─────────────────────────────────────────────────────────────────────
 * PAYMONGO_SECRET_KEY and PAYMONGO_WEBHOOK_SECRET in .env only (never
 * in code). Exposed via config('services.paymongo.*'). Sandbox vs live
 * is inferred from the key prefix (sk_test_ vs sk_live_) via isSandbox().
 *
 * Auth: HTTP Basic, username = secret key, password empty.
 * Header: Authorization: Basic base64(secret + ":")
 *
 * API base: https://api.paymongo.com/v1
 */
class PaymentService
{
    /**
     * PayMongo API base URL (no trailing slash).
     */
    private const API_BASE_URL = 'https://api.paymongo.com/v1';

    /**
     * HTTP timeout in seconds for PayMongo API calls. PayMongo usually
     * responds in <1s; 30s is generous to absorb transient slowness.
     */
    private const HTTP_TIMEOUT_SECONDS = 30;

    // ─── Public API ─────────────────────────────────────────────────

    /**
     * Create a PayMongo GCash PaymentIntent + attach a GCash payment
     * method, returning the hosted checkout URL.
     *
     * Steps:
     *   1. POST /payment_intents { amount, currency: "PHP",
     *      payment_method_allowed: ["gcash"], capture_type: "automatic",
     *      metadata } -> intent id
     *   2. POST /payment_methods { type: "gcash" } -> payment_method id
     *   3. POST /payment_intents/{id}/attach { payment_method,
     *      return_url } -> response.next_action.redirect.url = checkout_url
     *
     * @param  int    $amountCentavos  Amount in centavos (e.g., 1500 = ₱15.00)
     * @param  array  $meta            Metadata to attach (transaction_id,
     *                                 shift_id, qr_token, etc.) — stored
     *                                 on the PayMongo intent for webhook
     *                                 correlation.
     *
     * @return array{ intent_id: string, checkout_url: string }
     *
     * @throws \RuntimeException  If the secret key is missing.
     * @throws \RuntimeException  If any PayMongo API call fails (non-2xx).
     *                             The error body is logged (never the key).
     */
    public function createGcashIntent(int $amountCentavos, array $meta = []): array
    {
        $secret = $this->getSecretKey();
        $baseUrl = $this->getBaseUrl();
        $returnUrl = $this->getReturnUrl();

        // ─── Step 1: Create the PaymentIntent ──────────────────────
        $intentResponse = Http::withBasicAuth($secret, '')
            ->timeout(self::HTTP_TIMEOUT_SECONDS)
            ->post("{$baseUrl}/payment_intents", [
                'data' => [
                    'attributes' => [
                        'amount' => $amountCentavos,
                        'currency' => 'PHP',
                        'payment_method_allowed' => ['gcash'],
                        'capture_type' => 'automatic',
                        'metadata' => $meta,
                    ],
                ],
            ]);

        $this->ensureSuccess($intentResponse, 'create payment_intent');

        $intentId = $intentResponse->json('data.id');
        if (! $intentId) {
            throw new \RuntimeException(
                'PayMongo: payment_intent response missing data.id'
            );
        }

        // ─── Step 2: Create the GCash payment method ───────────────
        $paymentMethodResponse = Http::withBasicAuth($secret, '')
            ->timeout(self::HTTP_TIMEOUT_SECONDS)
            ->post("{$baseUrl}/payment_methods", [
                'data' => [
                    'attributes' => [
                        'type' => 'gcash',
                    ],
                ],
            ]);

        $this->ensureSuccess($paymentMethodResponse, 'create payment_method');

        $paymentMethodId = $paymentMethodResponse->json('data.id');
        if (! $paymentMethodId) {
            throw new \RuntimeException(
                'PayMongo: payment_method response missing data.id'
            );
        }

        // ─── Step 3: Attach the payment method to the intent ───────
        // This triggers the next_action.redirect.url (hosted checkout).
        $attachResponse = Http::withBasicAuth($secret, '')
            ->timeout(self::HTTP_TIMEOUT_SECONDS)
            ->post("{$baseUrl}/payment_intents/{$intentId}/attach", [
                'data' => [
                    'attributes' => [
                        'payment_method' => $paymentMethodId,
                        'return_url' => $returnUrl,
                    ],
                ],
            ]);

        $this->ensureSuccess($attachResponse, 'attach payment_method');

        $checkoutUrl = $attachResponse->json('data.attributes.next_action.redirect.url');
        if (! $checkoutUrl) {
            throw new \RuntimeException(
                'PayMongo: attach response missing next_action.redirect.url'
            );
        }

        return [
            'intent_id' => $intentId,
            'checkout_url' => $checkoutUrl,
        ];
    }

    /**
     * Verify the live status of a PayMongo PaymentIntent.
     *
     * Maps PayMongo statuses to our Transaction status values:
     *   succeeded                              -> PAID
     *   awaiting_next_action                   -> PENDING
     *   awaiting_payment_method                -> PENDING
     *   processing                             -> PENDING
     *   anything else (failed, cancelled, etc.) -> FAILED
     *
     * Used by:
     *   - The webhook (S4-T6) to confirm the final status
     *   - Polling endpoints as a fallback if the webhook is delayed
     *
     * @param  string  $intentId  The PayMongo PaymentIntent id
     *
     * @return string  One of: 'PAID', 'PENDING', 'FAILED'
     *
     * @throws \RuntimeException  If the secret key is missing.
     * @throws \RuntimeException  If the PayMongo API call fails (non-2xx).
     */
    public function verifyIntent(string $intentId): string
    {
        $secret = $this->getSecretKey();
        $baseUrl = $this->getBaseUrl();

        $response = Http::withBasicAuth($secret, '')
            ->timeout(self::HTTP_TIMEOUT_SECONDS)
            ->get("{$baseUrl}/payment_intents/{$intentId}");

        $this->ensureSuccess($response, 'get payment_intent');

        $status = $response->json('data.attributes.status');

        return $this->mapPaymongoStatus($status);
    }

    /**
     * Returns true if the configured secret key is a sandbox key
     * (starts with sk_test_). Returns false for live keys (sk_live_).
     *
     * Useful for:
     *   - Displaying a "SANDBOX" badge in admin UIs
     *   - Logging sandbox vs live without leaking the key
     *   - Conditionally skipping signature checks in tests
     */
    public function isSandbox(): bool
    {
        $secret = $this->getSecretKey();

        return str_starts_with($secret, 'sk_test_');
    }

    /**
     * Verify a PayMongo webhook signature.
     *
     * PayMongo signs every webhook with an HMAC-SHA256 of the raw request
     * body. The signature is sent in the `Paymongo-Signature` header in
     * the format:
     *
     *   t={timestamp},te={testSignature},li={liveSignature}
     *
     * where {testSignature} / {liveSignature} is the hex-encoded HMAC of
     * "{timestamp}.{rawRequestBody}" using the webhook secret.
     *
     * In sandbox, compare against `te`; in live, compare against `li`.
     * Use hash_equals() to prevent timing attacks.
     *
     * @param  string  $rawBody            The RAW request body (do NOT
     *                                     re-encode JSON — the signature
     *                                     is computed over the exact bytes
     *                                     PayMongo sent).
     * @param  string  $signatureHeader    The value of the Paymongo-Signature
     *                                     header.
     *
     * @return bool  True if the signature matches, false otherwise.
     *
     * @throws \RuntimeException  If PAYMONGO_WEBHOOK_SECRET is not configured.
     */
    public function verifyWebhookSignature(string $rawBody, string $signatureHeader): bool
    {
        $webhookSecret = config('services.paymongo.webhook_secret');

        if (! $webhookSecret || $webhookSecret === '') {
            throw new \RuntimeException(
                'PayMongo webhook secret not configured. '
                . 'Set PAYMONGO_WEBHOOK_SECRET in .env (get it from the '
                . 'PayMongo dashboard webhook settings).'
            );
        }

        // Parse the header: t={timestamp},te={testSig},li={liveSig}
        $parts = [];
        foreach (explode(',', $signatureHeader) as $segment) {
            $kv = explode('=', $segment, 2);
            if (count($kv) === 2) {
                $parts[trim($kv[0])] = trim($kv[1]);
            }
        }

        $timestamp = $parts['t'] ?? null;
        $testSig   = $parts['te'] ?? null;
        $liveSig   = $parts['li'] ?? null;

        if (! $timestamp) {
            return false;
        }

        // Compute the expected signature: HMAC-SHA256 over "{t}.{rawBody}"
        $signedPayload = $timestamp . '.' . $rawBody;
        $computedSig = hash_hmac('sha256', $signedPayload, $webhookSecret);

        // In sandbox, compare against te; in live, compare against li.
        // Use hash_equals() to prevent timing attacks.
        if ($this->isSandbox()) {
            return $testSig !== null && hash_equals($testSig, $computedSig);
        }

        return $liveSig !== null && hash_equals($liveSig, $computedSig);
    }

    // ─── Internal Helpers ───────────────────────────────────────────

    /**
     * Get the PayMongo secret key from config (reads from .env).
     *
     * @throws \RuntimeException  If the key is missing.
     */
    private function getSecretKey(): string
    {
        $secret = config('services.paymongo.secret');

        if (! $secret || $secret === '') {
            throw new \RuntimeException(
                'PayMongo secret key not configured. '
                . 'Set PAYMONGO_SECRET_KEY in .env (sk_test_... for sandbox, '
                . 'sk_live_... for live).'
            );
        }

        return $secret;
    }

    /**
     * Get the PayMongo API base URL from config (with fallback).
     */
    private function getBaseUrl(): string
    {
        return config('services.paymongo.base_url') ?: self::API_BASE_URL;
    }

    /**
     * Get the return_url PayMongo should redirect to after authorize.
     * Defaults to {APP_URL}/gcash/return if not explicitly set.
     */
    private function getReturnUrl(): string
    {
        return config('services.paymongo.return_url')
            ?: (config('app.url') ?: 'http://localhost:3000') . '/gcash/return';
    }

    /**
     * Ensure a PayMongo HTTP response was successful (2xx). If not,
     * log the error body (NEVER the key) and throw.
     *
     * @param  \Illuminate\Http\Client\Response  $response
     * @param  string                             $operation  Human-readable label for the error message
     *
     * @throws \RuntimeException  If the response status is not 2xx.
     */
    private function ensureSuccess($response, string $operation): void
    {
        if ($response->successful()) {
            return;
        }

        // Log the error body for debugging. NEVER log the secret key
        // or the Authorization header.
        $errorBody = $response->json() ?: $response->body();

        Log::error('PayMongo API call failed', [
            'operation' => $operation,
            'status' => $response->status(),
            'body' => $errorBody,
        ]);

        $errorMessage = is_array($errorBody) && isset($errorBody['errors'][0]['detail'])
            ? $errorBody['errors'][0]['detail']
            : 'HTTP ' . $response->status();

        throw new \RuntimeException(
            "PayMongo: failed to {$operation} (HTTP {$response->status()}): {$errorMessage}"
        );
    }

    /**
     * Map a PayMongo PaymentIntent status to our Transaction status.
     *
     * PayMongo statuses (per docs):
     *   - awaiting_payment_method  -- intent created, no payment method yet
     *   - awaiting_next_action     -- payment method attached, waiting for
     *                                  commuter to authorize on hosted page
     *   - processing               -- payment is being processed
     *   - succeeded                -- payment succeeded
     *   - failed                   -- payment failed (declined, cancelled, etc.)
     *
     * Our mapping:
     *   succeeded                -> PAID
     *   awaiting_next_action     -> PENDING
     *   awaiting_payment_method  -> PENDING
     *   processing               -> PENDING
     *   anything else            -> FAILED
     */
    private function mapPaymongoStatus(?string $status): string
    {
        return match ($status) {
            'succeeded' => 'PAID',
            'awaiting_next_action', 'awaiting_payment_method', 'processing' => 'PENDING',
            default => 'FAILED',
        };
    }
}
