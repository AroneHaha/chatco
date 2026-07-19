<?php

namespace Database\Seeders;

use App\Enums\UserRole;
use App\Models\Announcement;
use App\Models\User;
use Illuminate\Database\Seeder;

/**
 * AnnouncementSeeder — admin-published system announcements for the
 * commuter/conductor feed and the admin announcements manager.
 *
 * Covers every category the UI maps (SYSTEM / SAFETY / PROMO / MAINTENANCE /
 * ROUTE / HOLIDAY) plus one ARCHIVED row so the archived/active filter has
 * something on both sides. `created_by` is attributed to the seeded admin.
 *
 * Depends on: an admin user existing.
 * Run alone with:  php artisan db:seed --class=AnnouncementSeeder
 */
class AnnouncementSeeder extends Seeder
{
    public function run(): void
    {
        $admin = User::where('role', UserRole::ADMIN)->first();

        // [type, title, message, status, daysAgo]
        $items = [
            ['SYSTEM', 'Welcome to Chatco', 'The Chatco fare & remittance system is now live. Tap your route to see fares and track your ride in real time.', 'ACTIVE', 9],
            ['SAFETY', 'Buckle Up & Mind Your Belongings', 'For your safety, please hold on to the handrails and keep your valuables secure while the jeepney is moving.', 'ACTIVE', 7],
            ['PROMO', 'Ride & Earn Free Trips', 'Every 10 paid rides earns you 1 free voucher ride. Check the Rewards tab to see your progress.', 'ACTIVE', 5],
            ['ROUTE', 'McArthur Highway Advisory', 'Expect light rerouting near Plaridel Poblacion due to ongoing road works. Allow a few extra minutes for your trip.', 'ACTIVE', 3],
            ['MAINTENANCE', 'Scheduled Maintenance', 'The app may be briefly unavailable on Sunday, 2:00–3:00 AM, for scheduled maintenance. Thank you for your patience.', 'ACTIVE', 2],
            ['HOLIDAY', 'Holiday Schedule', 'Trips will follow a reduced schedule on the upcoming public holiday. Please plan your travel accordingly.', 'ACTIVE', 1],
            ['PROMO', 'Old Fiesta Promo (Ended)', 'The town fiesta discount promo has ended. Thank you to everyone who joined!', 'ARCHIVED', 20],
        ];

        foreach ($items as [$type, $title, $message, $status, $daysAgo]) {
            $announcement = Announcement::create([
                'type'       => $type,
                'title'      => $title,
                'message'    => $message,
                'status'     => $status,
                'created_by' => $admin?->id,
            ]);

            $ts = now()->subDays($daysAgo);
            $announcement->created_at = $ts;
            $announcement->updated_at = $ts;
            $announcement->save();
        }

        $this->command?->info('Seeded ' . count($items) . ' announcements.');
    }
}
