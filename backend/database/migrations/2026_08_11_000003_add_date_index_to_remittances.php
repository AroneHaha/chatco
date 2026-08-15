<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Admin Remittance Tracker performance — the page now defaults to "Today"
 * (AdminController::remittances() filters by `date`), so this query runs on
 * every visit to the module instead of only when an admin picks a date.
 * The `date` column had no index at all, so it fell back to a full table
 * scan as remittances accumulate.
 *
 * Same idempotent add/drop pattern as
 * 2026_06_22_000001_add_indexes_and_idempotency_to_transactions.php, so a
 * re-run (or SQLite test rebuild) is safe.
 */
return new class extends Migration
{
    public function up(): void
    {
        $this->safelyAddIndex('remittances', ['date'], 'remittances_date_index');
    }

    public function down(): void
    {
        $this->safelyDropIndex('remittances', 'remittances_date_index');
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
