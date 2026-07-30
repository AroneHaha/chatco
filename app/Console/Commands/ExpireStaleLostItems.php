<?php

namespace App\Console\Commands;

use App\Services\LostItemService;
use Illuminate\Console\Command;

/**
 * Artisan command: php artisan lost-items:expire
 *
 * Archives lost items that have sat AVAILABLE (reported, never claimed) for
 * more than LostItemService::EXPIRY_DAYS. This is not deletion — expired
 * items stay in the database, visible to admins under a dedicated filter,
 * and can be brought back with LostItemService::reactivate() if a claimant
 * turns up late.
 *
 * Scheduled to run daily via routes/console.php:
 *   Schedule::command('lost-items:expire')->dailyAt('01:00')
 *
 * Production deployment requires the scheduler to be running:
 *   php artisan schedule:work   (dev)
 *   php artisan schedule:run    (production, via system cron: * * * * *)
 */
class ExpireStaleLostItems extends Command
{
    protected $signature = 'lost-items:expire';

    protected $description = 'Archive AVAILABLE lost items unclaimed past the expiry window';

    public function handle(LostItemService $lostItemService): int
    {
        $expiredCount = $lostItemService->expireStale();

        if ($expiredCount === 0) {
            $this->info('0 lost items expired');
        } else {
            $this->info("{$expiredCount} lost items expired");
        }

        return self::SUCCESS;
    }
}
