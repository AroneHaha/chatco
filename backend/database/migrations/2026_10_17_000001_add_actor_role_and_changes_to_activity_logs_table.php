<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Adds two things the activity log could not record:
 *
 *  - actor_role: who did it (ADMIN, COMMUTER, CONDUCTOR, or SYSTEM for an
 *    automatic event). Snapshotted like actor_name, so a deleted or
 *    re-roled account doesn't rewrite history, and indexed with created_at
 *    for the page's "Done by" filter.
 *  - changes: field-level before/after values for edits, as a JSON list of
 *    {field, from, to}.
 *
 * A separate migration rather than an edit to create_activity_logs_table:
 * that table is already deployed, and an edited create migration never runs
 * again there. Guarded so it is safe to re-run (same approach as
 * upgrade_discount_applications_schema).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('activity_logs', function (Blueprint $table) {
            if (! Schema::hasColumn('activity_logs', 'actor_role')) {
                $table->string('actor_role', 20)->nullable()->after('actor_name');
            }
            if (! Schema::hasColumn('activity_logs', 'changes')) {
                $table->json('changes')->nullable()->after('description');
            }
        });

        if (! Schema::hasIndex('activity_logs', ['actor_role', 'created_at'])) {
            Schema::table('activity_logs', function (Blueprint $table) {
                $table->index(['actor_role', 'created_at']);
            });
        }

        // Backfill existing rows. An entry with neither an actor id nor a
        // name was an automatic event; one whose actor was later deleted
        // keeps its name but stays role-less, since the role is unknown.
        DB::table('activity_logs')
            ->whereNull('actor_role')
            ->whereNotNull('actor_id')
            ->update([
                'actor_role' => DB::raw('(SELECT users.role FROM users WHERE users.id = activity_logs.actor_id)'),
            ]);
        DB::table('activity_logs')
            ->whereNull('actor_role')
            ->whereNull('actor_id')
            ->whereNull('actor_name')
            ->update(['actor_role' => 'SYSTEM']);
    }

    public function down(): void
    {
        Schema::table('activity_logs', function (Blueprint $table) {
            if (Schema::hasIndex('activity_logs', ['actor_role', 'created_at'])) {
                $table->dropIndex(['actor_role', 'created_at']);
            }
            $table->dropColumn(array_values(array_filter(
                ['actor_role', 'changes'],
                fn (string $column) => Schema::hasColumn('activity_logs', $column),
            )));
        });
    }
};
