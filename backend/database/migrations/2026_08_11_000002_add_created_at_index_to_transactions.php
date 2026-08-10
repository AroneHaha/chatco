<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Admin Receipts page performance — AdminController::transactions() filters
 * by a created_at range with no shift_id/passenger_id predicate, and always
 * orders by created_at desc. The existing transactions indexes all lead
 * with shift_id or passenger_id, so this query had no supporting index and
 * fell back to a full table scan + filesort as the table grows.
 *
 * A plain created_at index lets both the WHERE range and the ORDER BY
 * resolve from the same index (a single backward index scan).
 *
 * Same idempotent add/drop pattern as
 * 2026_06_22_000001_add_indexes_and_idempotency_to_transactions.php, so a
 * re-run (or SQLite test rebuild) is safe.
 */
return new class extends Migration
{
    public function up(): void
    {
        $this->safelyAddIndex('transactions', ['created_at'], 'transactions_created_at_index');
    }

    public function down(): void
    {
        $this->safelyDropIndex('transactions', 'transactions_created_at_index');
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
