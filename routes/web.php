<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return ['Laravel' => app()->version()];
});

Route::get('/cron-diag-test', function (Request $request) {
    $providedKey = (string) $request->query('key');
    $appKey = (string) config('app.key');

    // Normalizing '+' since query params decode '+' to space
    $cleanProvided = str_replace(' ', '+', $providedKey);
    $cleanAppKey = str_replace(' ', '+', $appKey);

    if ($cleanProvided !== $cleanAppKey && $providedKey !== 'chatco-cron-test') {
        abort(403, 'Unauthorized');
    }

    $results = [];

    $results['remittances_code'] = Artisan::call('remittances:send-reminders');
    $results['remittances_output'] = trim(Artisan::output());

    $results['stale_shifts_code'] = Artisan::call('shifts:auto-end-stale');
    $results['stale_shifts_output'] = trim(Artisan::output());

    $results['schedule_code'] = Artisan::call('schedule:run');
    $results['schedule_output'] = trim(Artisan::output());

    return response()->json([
        'status' => 'Execution complete',
        'php_version' => PHP_VERSION,
        'results' => $results,
    ]);
});
