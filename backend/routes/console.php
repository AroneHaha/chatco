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

// Hostinger shared hosting has no long-running Supervisor process. The
// one-minute `schedule:run` cron starts this short-lived queue worker and it
// exits cleanly after delivering queued broadcasts.
Schedule::command('queue:work --stop-when-empty --tries=3 --timeout=55 --max-time=50')
    ->everyMinute()
    ->withoutOverlapping(2);

// ─── Automatic daily vehicle-assignment reset (12:00 AM) ─────────────
// Per the vehicle-assignment workflow refactor: at midnight every day the
// CURRENT driver + conductor + active-shift assignment on EVERY vehicle is
// cleared, so each unit starts the new day unassigned. Historical records
// (shift_logs, remittances, transactions) are NEVER touched — only the
// mutable current-assignment columns on the vehicles table are reset.
// Assignment is re-established automatically when a conductor logs in and
// starts a new shift.
// Timezone is pinned explicitly: this must fire at midnight *Manila* time
// regardless of what app.timezone or the server clock is set to. Getting this
// wrong force-remits conductors mid-shift.
Schedule::command('vehicles:reset-daily-assignments')
    ->dailyAt('00:00')
    ->timezone('Asia/Manila')
    ->withoutOverlapping();

// ─── Auto-end stale shifts (hourly) ──────────────────────────────────
// Checks every hour for active shifts that exceed the `max_shift_hours`
// limit from the settings table (default 12h). Auto-ends them with a
// remittance record so the conductor's earnings are preserved.
Schedule::command('shifts:auto-end-stale')->hourly();

// ─── Auto-expire stale Lost & Found items (daily) ────────────────────
// Archives items that have sat AVAILABLE (reported, never claimed) for
// LostItemService::EXPIRY_DAYS. Not deletion — expired items stay visible
// to admins under a dedicated filter and can be reactivated manually.
Schedule::command('lost-items:expire')->dailyAt('01:00')->timezone('Asia/Manila');
