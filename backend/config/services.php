<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'key' => env('POSTMARK_API_KEY'),
    ],

    'resend' => [
        'key' => env('RESEND_API_KEY'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | PayMongo (GCash SANDBOX / LIVE)
    |--------------------------------------------------------------------------
    |
    | PayMongo is used for GCash authorize flows. Sandbox vs live is
    | inferred from the secret key prefix: sk_test_ = sandbox,
    | sk_live_ = live. The ONLY differences between sandbox and live
    | are the API key and the authorize page UI -- no code change needed
    | to switch. Secrets are read from .env only, never hardcoded.
    |
    | In sandbox, the hosted checkout_url shows "Authorize Test Payment"
    | / "Fail Test Payment" buttons (NO number/PIN/OTP -- those appear
    | only in LIVE). Sandbox cannot validate a real balance; success vs
    | failure is chosen via those test buttons.
    |
    | Auth: HTTP Basic, username = secret key, password empty.
    | Header: Authorization: Basic base64(secret + ":")
    |
    | API base: https://api.paymongo.com/v1
    |
    | Related env vars:
    |   PAYMONGO_SECRET_KEY      -- sk_test_... or sk_live_...
    |   PAYMONGO_WEBHOOK_SECRET  -- for verifying webhook signatures (S4-T6)
    |
    */
    'paymongo' => [
        'secret' => env('PAYMONGO_SECRET_KEY'),
        'webhook_secret' => env('PAYMONGO_WEBHOOK_SECRET'),
        'base_url' => 'https://api.paymongo.com/v1',
        // return_url is where PayMongo redirects after the commuter
        // authorizes (or cancels) on the hosted checkout page. The
        // commuter app should host a page that polls the transaction
        // status or listens for the HailStatusChanged-style event.
        'return_url' => env('PAYMONGO_RETURN_URL', env('APP_URL', 'http://localhost:3000') . '/gcash/return'),
    ],

];
