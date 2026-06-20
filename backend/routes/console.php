<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

/*
|--------------------------------------------------------------------------
| Scheduled Jobs
|--------------------------------------------------------------------------
*/

// Auto-expire pending hails after their 3-minute TTL.
// Runs every minute; a hail lives at most ~4min (3min TTL + up to 1min
// before the next scheduler tick). Production requires either
// `php artisan schedule:work` (dev) or a system cron entry running
// `php artisan schedule:run` every minute.
Schedule::command('hails:expire')->everyMinute();
