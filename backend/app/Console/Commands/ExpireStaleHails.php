<?php

namespace App\Console\Commands;

use App\Services\HailService;
use Illuminate\Console\Command;

/**
 * Artisan command: php artisan hails:expire
 *
 * Auto-expires pending hails whose expires_at timestamp is in the past.
 * This is the cleanup side of the 3-minute TTL rule (HailService::HAIL_TTL_MINUTES).
 *
 * Scheduled to run every minute via routes/console.php:
 *   Schedule::command('hails:expire')->everyMinute()
 *
 * A hail created at T=0 with expires_at = T+3min will be transitioned to
 * EXPIRED no later than T+4min (3min TTL + up to 1min before the next
 * scheduler tick). This is acceptable per the sprint spec.
 *
 * Production deployment requires the scheduler to be running:
 *   php artisan schedule:work   (dev)
 *   php artisan schedule:run    (production, via system cron: * * * * *)
 */
class ExpireStaleHails extends Command
{
    /**
     * The name and signature of the console command.
     *
     * No arguments or options per S3-T7 spec.
     *
     * @var string
     */
    protected $signature = 'hails:expire';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Transition pending hails past their expires_at timestamp to expired status';

    /**
     * Execute the console command.
     *
     * Delegates to HailService::expireStaleHails() which performs the
     * bulk UPDATE in a single SQL statement:
     *   UPDATE hails SET status = 'EXPIRED'
     *   WHERE status = 'PENDING' AND expires_at < NOW()
     *
     * Logs the affected row count to stdout for observability.
     */
    public function handle(HailService $hailService): int
    {
        $expiredCount = $hailService->expireStaleHails();

        if ($expiredCount === 0) {
            $this->info('0 hails expired');
        } else {
            $this->info("{$expiredCount} hails expired");
        }

        return self::SUCCESS;
    }
}
