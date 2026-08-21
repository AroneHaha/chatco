<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Admin Announcements page performance — AnnouncementService::listForAdmin()
 * always orders by created_at desc, and (as of the date-picker/quick-range
 * filters) also does a WHERE created_at range/exact-date scan with no
 * status predicate on the default "All" view. The existing indexes on this
 * table (status, user_id) don't cover either the ORDER BY or the date
 * WHERE, so both fall back to a full table scan + filesort as the table
 * grows.
 *
 * A plain created_at index lets both the WHERE range/date and the ORDER BY
 * resolve from the same index (a single backward index scan) — same
 * reasoning as 2026_08_11_000002_add_created_at_index_to_transactions.php.
 *
 * Same idempotent add/drop pattern as that migration, so a re-run (or
 * SQLite test rebuild) is safe.
 */
return new class extends Migration
{
    public function up(): void
    {
        $this->safelyAddIndex('announcements', ['created_at'], 'announcements_created_at_index');
    }

    public function down(): void
    {
        $this->safelyDropIndex('announcements', 'announcements_created_at_index');
    }

    private function safelyAddIndex(string $tableName, array $columns, string $indexName): void
    {
        try {
            Schema::table($tableName, function (Blueprint $table) use ($columns, $indexName) {
                $table->index($columns, $indexName);
            });
        } catch (\Throwable $e) {
            // Index already exists — no-op.
        }
    }

    private function safelyDropIndex(string $tableName, string $indexName): void
    {
        try {
            Schema::table($tableName, function (Blueprint $table) use ($indexName) {
                $table->dropIndex($indexName);
            });
        } catch (\Throwable $e) {
            // Index does not exist — no-op.
        }
    }
};
