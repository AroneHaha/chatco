<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Feedback Unit-QR HMAC Secret
    |--------------------------------------------------------------------------
    | Secret used to sign the stateless unit-QR tokens issued by
    | POST /api/v1/qr/generate and verified by /qr/validate + /qr/scan.
    |
    | The token is a base64url(JSON payload) + '.' + hex(HMAC-SHA256) string.
    | It is stateless — no DB row is created at issue time. Tamper-resistance
    | comes from the HMAC; expiry comes from the `expires_at` field inside the
    | signed payload.
    |
    | If QR_FEEDBACK_SECRET is unset, QrTokenService falls back to the app key
    | (dev only). Production should set a dedicated secret.
    */
    'feedback_secret' => env('QR_FEEDBACK_SECRET'),

    /*
    |--------------------------------------------------------------------------
    | Feedback Unit-QR TTL (minutes)
    |--------------------------------------------------------------------------
    | How long a generated unit-QR stays valid. The QR sticker inside the
    | jeepney is semi-permanent, but a finite TTL ensures that stolen or
    | compromised stickers eventually expire and must be re-issued by an admin.
    | 7 days is a reasonable default — long enough to be practical, short
    | enough to rotate.
    */
    'feedback_ttl_minutes' => (int) env('QR_FEEDBACK_TTL_MINUTES', 10080),

];
