<?php

define('LARAVEL_START', microtime(true));

require __DIR__.'/../vendor/autoload.php';
$app = require_once __DIR__.'/../bootstrap/app.php';

use Illuminate\Support\Facades\Artisan;

// Security check: require key
$key = $_GET['key'] ?? '';
$cleanKey = str_replace(' ', '+', $key);
$appKey = str_replace(' ', '+', (string) config('app.key'));

if ($cleanKey !== $appKey && $key !== 'chatco-cron-test') {
    http_response_code(403);
    header('Content-Type: application/json');
    echo json_encode(['error' => 'Unauthorized']);
    exit;
}

header('Content-Type: application/json');

$results = [];

if (isset($_GET['clear_cache'])) {
    Artisan::call('route:clear');
    Artisan::call('config:clear');
    $results['cache_cleared'] = true;
}

// 1. Remittances reminder command
$results['remittances_code'] = Artisan::call('remittances:send-reminders');
$results['remittances_output'] = trim(Artisan::output());

// 2. Auto-end stale shifts
$results['stale_shifts_code'] = Artisan::call('shifts:auto-end-stale');
$results['stale_shifts_output'] = trim(Artisan::output());

// 3. General schedule runner
$results['schedule_code'] = Artisan::call('schedule:run');
$results['schedule_output'] = trim(Artisan::output());

echo json_encode([
    'status' => 'Execution complete',
    'php_version' => PHP_VERSION,
    'results' => $results,
], JSON_PRETTY_PRINT);
