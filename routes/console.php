<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Schedule::command('vehicles:reset-daily-assignments')
    ->dailyAt('00:00')
    ->timezone('Asia/Manila')
    ->withoutOverlapping(60);

Schedule::command('hails:expire')
    ->everyMinute()
    ->withoutOverlapping(2);

Schedule::command('payments:expire-stale')
    ->everyMinute()
    ->withoutOverlapping(2);

Schedule::command('shifts:auto-end-stale')
    ->everyFiveMinutes()
    ->withoutOverlapping(10);

Schedule::command('remittances:send-reminders')
    ->everyFiveMinutes()
    ->withoutOverlapping(10);

Schedule::command('lost-items:expire')
    ->dailyAt('01:00')
    ->timezone('Asia/Manila')
    ->withoutOverlapping(60);

Schedule::command('announcements:prune-archived')
    ->dailyAt('02:00')
    ->timezone('Asia/Manila')
    ->withoutOverlapping(60);

// Shared Hostinger has no persistent process manager. Only database queues
// require this short worker; sync executes jobs inline and needs no worker.
if (config('queue.default') === 'database') {
    Schedule::command('queue:work --tries=3 --timeout=45 --max-time=50 --sleep=2')
        ->everyMinute()
        ->withoutOverlapping(2);
}
