<?php

namespace App\Console\Commands;

use App\Models\CommuterProfile;
use App\Services\AnnouncementService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class SendRegistrationReminders extends Command
{
    protected $signature = 'registrations:send-reminders';

    protected $description = 'Remind admins about registrations pending for at least 24 hours';

    public function handle(AnnouncementService $announcements): int
    {
        $cutoff = now()->subDay();
        $failed = 0;
        // The existing notification rows are the reminder ledger. Include archived
        // rows so reading/archiving a reminder cannot trigger another one immediately.
        $eligible = fn () => CommuterProfile::query()
            ->where('account_status', 'PENDING')
            ->where('created_at', '<=', $cutoff)
            ->whereHas('user')
            ->whereNotExists(function ($query) use ($cutoff) {
                $query->selectRaw('1')->from('announcements')
                    ->whereColumn('announcements.reference_id', 'commuter_profiles.id')
                    ->where('announcements.type', 'REGISTRATION_WAITING')
                    ->where('announcements.created_at', '>', $cutoff);
            });

        $eligible()->select('id')->chunkById(100, function ($profiles) use ($eligible, $announcements, &$failed) {
            foreach ($profiles as $candidate) {
                try {
                    DB::transaction(function () use ($candidate, $eligible, $announcements) {
                        // Serialize overlapping workers on the applicant before rechecking.
                        CommuterProfile::query()->whereKey($candidate->id)->lockForUpdate()->first();
                        $profile = $eligible()->whereKey($candidate->id)->first();
                        if (! $profile) {
                            return;
                        }
                        $hours = max(24, (int) $profile->created_at->diffInHours(now()));
                        $announcements->notifyAdmins(
                            'REGISTRATION_WAITING',
                            'Registration awaiting review',
                            trim($profile->first_name.' '.$profile->surname)." has been awaiting account verification for {$hours} hours.",
                            $profile->id,
                        );
                    }, 3);
                } catch (\Throwable $error) {
                    $failed++;
                    Log::error('Registration reminder failed', ['user_id' => $candidate->id, 'message' => $error->getMessage()]);
                }
            }
        });

        return $failed > 0 ? self::FAILURE : self::SUCCESS;
    }
}
