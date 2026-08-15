<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * 30-day archive retention for announcements.
 *
 * `archived_at` is set the moment AnnouncementService::archive() flips an
 * announcement to ARCHIVED, decoupled from `updated_at` (which a later
 * title/message edit would otherwise bump, indefinitely postponing pruning).
 * The `announcements:prune-archived` scheduled command soft-deletes rows
 * where status = ARCHIVED and archived_at is more than 30 days old.
 *
 * Rows already ARCHIVED before this migration have no archive timestamp to
 * recover exactly, so they're backfilled from `updated_at` (the timestamp
 * of the archiving update) — the closest available approximation, and never
 * later than the true archive time, so pruning never fires early for them.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('announcements', function (Blueprint $table) {
            $table->timestamp('archived_at')->nullable()->after('status');
        });

        DB::table('announcements')
            ->where('status', 'ARCHIVED')
            ->whereNull('archived_at')
            ->update(['archived_at' => DB::raw('updated_at')]);
    }

    public function down(): void
    {
        Schema::table('announcements', function (Blueprint $table) {
            $table->dropColumn('archived_at');
        });
    }
};
