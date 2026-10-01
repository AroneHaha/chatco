<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Conductors no longer use suspensions — Disable Account
 * (conductor_profiles.status = DISABLED) is their only block mechanism.
 * Any conductor still under an active suspension is carried over as
 * DISABLED and the suspension is lifted, so the account stays blocked but
 * can be re-enabled the normal way (Reset Credentials). Data-only: no
 * schema change, so it cannot live in an existing migration.
 */
return new class extends Migration
{
    public function up(): void
    {
        DB::transaction(function () {
            // Same definition of "active" as User::activeSuspension.
            $conductorIds = DB::table('user_suspensions')
                ->join('users', 'users.id', '=', 'user_suspensions.user_id')
                ->where('users.role', 'CONDUCTOR')
                ->whereNull('user_suspensions.lifted_at')
                ->where(function ($query) {
                    $query->where('user_suspensions.is_permanent', true)
                        ->orWhere('user_suspensions.ends_at', '>', now());
                })
                ->distinct()
                ->pluck('user_suspensions.user_id');

            if ($conductorIds->isEmpty()) {
                return;
            }

            DB::table('conductor_profiles')
                ->whereIn('id', $conductorIds)
                ->update(['status' => 'DISABLED', 'updated_at' => now()]);

            DB::table('user_suspensions')
                ->whereIn('user_id', $conductorIds)
                ->whereNull('lifted_at')
                ->update(['lifted_at' => now(), 'updated_at' => now()]);
        });
    }

    /**
     * Not reversible: the lifted suspensions and the DISABLED flag are
     * indistinguishable from ones set through the app afterwards.
     */
    public function down(): void
    {
        //
    }
};
