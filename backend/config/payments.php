<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Default Payment Gateway
    |--------------------------------------------------------------------------
    | The gateway used to settle GCash (and future online) payments. If the
    | selected gateway is not configured (e.g. no PayMongo keys yet), the
    | PaymentServiceProvider transparently falls back to the "fake" gateway so
    | the lifecycle stays exercisable without credentials. Adding a provider =
    | a new gateway class + an entry under "gateways".
    */
    'default' => env('PAYMENT_GATEWAY', 'paymongo'),

    /*
    |--------------------------------------------------------------------------
    | Return URL
    |--------------------------------------------------------------------------
    | Where the payer is redirected after authorizing on the provider's hosted
    | page. Points at the frontend, which then reflects status via realtime
    | event / polling.
    */
    'return_url' => env(
        'PAYMENT_RETURN_URL',
        rtrim(env('APP_FRONTEND_URL', env('APP_URL', 'http://localhost:3000')), '/').'/gcash/return'
    ),

    /*
    |--------------------------------------------------------------------------
    | GCash Claim TTL (minutes)
    |--------------------------------------------------------------------------
    | How long a conductor-generated binding QR / PENDING GCash transaction
    | stays claimable before it is considered expired. Past this age the row
    | is lazily transitioned to EXPIRED (PaymentService::expireIfStale) by
    | status polling / pending-resume / initiate, freeing the conductor to
    | start a new payment.
    |
    | IMPORTANT: This TTL covers the ENTIRE flow — QR generation → commuter
    | scan → PayMongo redirect → GCash login + OTP → authorize → webhook.
    | The real-world flow can take 3-5 minutes. Setting this too low causes
    | the transaction to expire WHILE the commuter is on PayMongo's page →
    | the webhook arrives after EXPIRED → the conductor UI already showed
    | "expired" and stopped polling. The EXPIRED→PAID transition IS allowed
    | (late-settlement), but the conductor's UI won't see it.
    |
    | Default: 10 minutes (the worst-case real-world flow comfortably fits).
    | The conductor UI keeps polling for a 60s grace window AFTER the row
    | expires, so a late webhook that flips EXPIRED→PAID is still surfaced.
    */
    'gcash_claim_ttl_minutes' => (int) env('PAYMENT_GCASH_CLAIM_TTL', 10),

    /*
    |--------------------------------------------------------------------------
    | Cash Receipt Claim TTL (hours)
    |--------------------------------------------------------------------------
    | A CASH fare is already PAID at the moment the conductor records it, but
    | it has no passenger_id — cash involves no account. The printed receipt
    | carries a QR holding the transaction's opaque qr_token, so the commuter
    | can bind the ride to their account later (e.g. at home, back on wifi)
    | and have it count toward the free-ride reward cycle.
    |
    | This window is deliberately much longer than the GCash claim TTL (that
    | one races a live checkout; this one only has to outlast the ride home)
    | but is NOT unlimited: the QR is a bearer token, so anyone holding the
    | paper can claim the ride. Capping it at 6 hours keeps a discarded or
    | lost receipt from being worth a reward point indefinitely.
    |
    | Measured from the transaction's created_at (when the receipt printed).
    */
    'cash_receipt_ttl_hours' => (int) env('PAYMENT_CASH_RECEIPT_TTL_HOURS', 6),

    /*
    |--------------------------------------------------------------------------
    | Provider Reconciliation (status-poll fallback)
    |--------------------------------------------------------------------------
    | When the PayMongo webhook is delayed or missing, the status polling
    | endpoint (GET /payments/{id}/status) reconciles with the provider as a
    | fallback: it calls PaymentService::syncStatus() which retrieves the
    | PaymentIntent directly from PayMongo and applies the state transition.
    |
    | To avoid hammering PayMongo on every 3s poll, reconciliation is
    | rate-limited per transaction via a cache key with this TTL. A poller
    | will trigger at most one provider round-trip per transaction per window.
    |
    | Only triggers when:
    |   - the row is GCASH + PENDING (or EXPIRED, for late-settlement),
    |   - it has a payment_reference (real gateway, not FakeGateway),
    |   - and the cache key has expired.
    |
    | Set to 0 to disable provider reconciliation entirely.
    */
    'reconcile_throttle_seconds' => (int) env('PAYMENT_RECONCILE_TTL', 30),

    /*
    |--------------------------------------------------------------------------
    | Active-Checkout Reconciliation (faster fallback while it matters most)
    |--------------------------------------------------------------------------
    | The flat 30s throttle above is fine once a payment has been sitting PENDING
    | for a while, but it's needlessly slow during the first stretch after the
    | commuter claims the QR — the window where they're actually on PayMongo's
    | page (login/OTP/authorize) and a same-second webhook is the expectation,
    | not the exception. If that webhook is delayed or unreachable (no public
    | webhook URL in local dev, a network blip), the commuter would otherwise
    | wait up to 30s to see success/failure even though the frontend polls
    | every 3s.
    |
    | For transactions still within `reconcile_active_window_seconds` of
    | creation, the reconciliation throttle is shortened to
    | `reconcile_active_throttle_seconds`. Past that window (checkout has
    | likely stalled or been abandoned), it falls back to the steady-state
    | `reconcile_throttle_seconds` above so an idle PENDING row doesn't keep
    | hammering the provider.
    */
    'reconcile_active_throttle_seconds' => (int) env('PAYMENT_RECONCILE_ACTIVE_TTL', 5),
    'reconcile_active_window_seconds' => (int) env('PAYMENT_RECONCILE_ACTIVE_WINDOW', 90),

    /*
    |--------------------------------------------------------------------------
    | Late-Settlement Grace Window (seconds)
    |--------------------------------------------------------------------------
    | After a PENDING GCash transaction flips to EXPIRED, the conductor + /gcash/return
    | polls keep watching for this many seconds in case PayMongo's webhook
    | arrives late and triggers the EXPIRED→PAID transition. The state machine
    | allows it; the UI just needs to keep listening long enough to observe it.
    |
    | Set to 0 to fail immediately on EXPIRED (pre-fix behavior — NOT recommended).
    */
    'late_settlement_grace_seconds' => (int) env('PAYMENT_LATE_SETTLEMENT_GRACE', 60),

    /*
    |--------------------------------------------------------------------------
    | Allow Payment Simulation (DEV ONLY)
    |--------------------------------------------------------------------------
    | Enables the dev-only endpoint that drives a PENDING gateway payment to a
    | terminal status through the real webhook/state-machine path, so GCash can
    | be demoed before real provider keys exist. MUST be false in production.
    */
    'allow_simulation' => (bool) env('PAYMENT_ALLOW_SIMULATION', env('APP_DEBUG', false)),

    /*
    |--------------------------------------------------------------------------
    | Gateways
    |--------------------------------------------------------------------------
    | Secrets are read from env only — never hard-coded. Sandbox vs live for
    | PayMongo is inferred from the secret key prefix (sk_test_ vs sk_live_).
    */
    'gateways' => [

        'paymongo' => [
            'secret' => env('PAYMONGO_SECRET_KEY'),
            'webhook_secret' => env('PAYMONGO_WEBHOOK_SECRET'),
            'base_url' => env('PAYMONGO_BASE_URL', 'https://api.paymongo.com/v1'),
            'timeout' => (int) env('PAYMONGO_TIMEOUT', 30),
            'retry_times' => (int) env('PAYMONGO_RETRY_TIMES', 2),
            'retry_sleep_ms' => (int) env('PAYMONGO_RETRY_SLEEP_MS', 250),
        ],

        'fake' => [],

    ],

];
