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
    | stays claimable before it is considered expired.
    */
    'gcash_claim_ttl_minutes' => (int) env('PAYMENT_GCASH_CLAIM_TTL', 5),

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
