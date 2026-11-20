<?php

namespace Database\Seeders;

use App\Models\CommuterProfile;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/**
 * Turns the generated commuter051 into an approved PWD whose card lapsed six
 * days ago, so its renewal is open (with the discount still running for the
 * rest of the month) whenever the database is seeded. Rerunning leaves an
 * account that already has a card date alone, so a renewal in progress is
 * never reset.
 */
class Commuter051Seeder extends Seeder
{
    public function run(): void
    {
        DB::transaction(function () {
            $profile = CommuterProfile::where('username', 'commuter051')->lockForUpdate()->first();
            if (! $profile || $profile->pwd_valid_until) {
                return;
            }

            $profile->update([
                'commuter_type' => 'PWD',
                'applied_type' => 'PWD',
                'account_status' => 'ACTIVE',
                'verified_at' => $profile->verified_at ?? now()->subYear(),
                'student_discount_expires_at' => null,
                'pwd_valid_until' => now('Asia/Manila')->subDays(6)->toDateString(),
                'renewal_reminder_snoozed_until' => null,
                'renewal_reminder_dismissed_cycle' => null,
            ]);
        });
    }
}
