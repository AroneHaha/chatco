<?php

return [
    'paths' => ['*'],

    'allowed_methods' => ['*'],

    'allowed_origins' => [
        env('FRONTEND_URL', 'https://chatco.online'),
        'http://localhost:8081',
        'http://localhost:8082',
        'http://127.0.0.1:8081',
        'http://127.0.0.1:8082',
    ],

    // Any-port localhost and private-LAN origins, for Expo/Metro dev servers
    // and phones testing over Wi-Fi. Native mobile builds don't send an Origin
    // (CORS is browser-only), so production doesn't need these and doesn't
    // open credentialed CORS to every private-network host.
    'allowed_origins_patterns' => env('APP_ENV', 'production') === 'production' ? [] : [
        '#^http://localhost(:\d+)?$#',
        '#^http://127\.0\.0\.1(:\d+)?$#',
        '#^http://192\.168\.\d+\.\d+(:\d+)?$#',
        '#^http://10\.\d+\.\d+\.\d+(:\d+)?$#',
        '#^http://172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+(:\d+)?$#',
    ],

    'allowed_headers' => ['*'],

    'exposed_headers' => [],

    'max_age' => 0,

    'supports_credentials' => true,
];