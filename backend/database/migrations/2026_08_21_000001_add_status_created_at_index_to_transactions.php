<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Admin Analytics Overview tab performance — AdminService::analytics() runs
 * five separate queries (daily_series, hourly_series, pickup_points,
 * heatmap_zones, gcash attempts) that all filter on
 * `status = 'PAID' AND created_at BETWEEN ...`. The existing indexes cover
 * `status` and `created_at` individually, so MySQL has to index-merge two
 * scans instead of resolving the filter from a single composite index.
 *
 * Same idempotent add/drop pattern as
 * 2026_08_11_000002_add_created_at_index_to_transactions.php, so a re-run
 * (or SQLite test rebuild) is safe.
 */
return new class extends Migration
{
    public function up(): void
    {
        $this->safelyAddIndex('transactions', ['status', 'created_at'], 'transactions_status_created_at_index');
    }

    public function down(): void
    {
        $this->safelyDropIndex('transactions', 'transactions_status_created_at_index');
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
