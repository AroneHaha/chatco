<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * remitted_at now means "the conductor handed the cash over". Before this,
 * a conductor-submitted shift and an automatically closed one were both
 * stored as PENDING with remitted_at empty, so existing rows would read as
 * not remitted: their conductors would be blocked from starting a shift and
 * admins couldn't declare them.
 *
 * Mark every existing PENDING row as remitted at its time out, except shifts
 * the admin feed recorded as auto-ended (those really were never handed over).
 * Data-only, so a new file: the remittances migrations already ran live.
 */
return new class extends Migration
{
    public function up(): void
    {
        DB::table('remittances')
            ->where('remittance_status', 'PENDING')
            ->whereNull('remitted_at')
            ->whereNotExists(function ($query): void {
                $query->select(DB::raw(1))
                    ->from('announcements')
                    ->whereColumn('announcements.reference_id', 'remittances.shift_id')
                    ->where('announcements.type', 'SHIFT_ENDED')
                    ->where('announcements.title', 'like', 'Shift auto-ended%');
            })
            ->update(['remitted_at' => DB::raw('COALESCE(time_out, updated_at, created_at)')]);
    }

    public function down(): void
    {
        // Not reversible: after this runs, back-filled rows can't be told
        // apart from shifts conductors remit later.
    }
};
