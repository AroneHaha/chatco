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

    // Shared secret the Next.js server sends with the real client IP so
    // Laravel's per-IP rate limiters see individual users instead of the
    // Next.js host. Unset = the forwarded IP is ignored. See
    // App\Http\Middleware\ResolveProxiedClientIp.
    'frontend_proxy' => [
        'secret' => env('FRONTEND_PROXY_SECRET'),
    ],

    // PayMongo configuration moved to config/payments.php (provider-agnostic
    // payment layer). Secrets are still read from the same PAYMONGO_* env vars.

];
