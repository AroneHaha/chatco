<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Performance pass — commuter payment history lookup.
 *
 * PaymentController::history() (GET /commuter/payments) always filters by
 * `passenger_id` and orders by `created_at desc`, paginated. Only the
 * FK-backed single-column index on passenger_id existed, so the ORDER BY
 * fell back to a filesort once a commuter's ride count grew. This composite
 * index lets that query resolve as an index-only range scan.
 *
 * Same idempotent add/drop pattern as
 * 2026_06_22_000001_add_indexes_and_idempotency_to_transactions.php, so a
 * re-run (or SQLite test rebuild) is safe.
 */
return new class extends Migration
{
    public function up(): void
    {
        $this->safelyAddIndex(
            'transactions',
            ['passenger_id', 'created_at'],
            'transactions_passenger_id_created_at_index'
        );
    }

    public function down(): void
    {
        $this->safelyDropIndex('transactions', 'transactions_passenger_id_created_at_index');
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
