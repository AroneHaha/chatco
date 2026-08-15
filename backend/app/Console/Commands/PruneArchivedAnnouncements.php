<?php

namespace App\Console\Commands;

use App\Services\AnnouncementService;
use Illuminate\Console\Command;

/**
 * Artisan command: php artisan announcements:prune-archived
 *
 * Soft-deletes ARCHIVED announcements once they've sat archived for more
 * than AnnouncementService::ARCHIVE_RETENTION_DAYS (30 days). Soft delete
 * only — rows stay in the database (recoverable) but drop out of the admin
 * list and every other query via the model's SoftDeletes trait.
 *
 * Scheduled to run daily via routes/console.php:
 *   Schedule::command('announcements:prune-archived')->dailyAt('02:00')
 *
 * Production deployment requires the scheduler to be running:
 *   php artisan schedule:work   (dev)
 *   php artisan schedule:run    (production, via system cron: * * * * *)
 */
class PruneArchivedAnnouncements extends Command
{
    protected $signature = 'announcements:prune-archived';

    protected $description = 'Soft-delete ARCHIVED announcements past the 30-day retention window';

    public function handle(AnnouncementService $announcementService): int
    {
        $prunedCount = $announcementService->pruneArchived();

        if ($prunedCount === 0) {
            $this->info('0 archived announcements pruned');
        } else {
            $this->info("{$prunedCount} archived announcements pruned");
        }

        return self::SUCCESS;
    }
}
