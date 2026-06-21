<?php

/**
 * S4 hardening: add an idempotency key + performance indexes to transactions.
 *
 * WHY:
 *   - idempotency_key: the cash-fare endpoint must NOT silently drop a second
 *     legitimate fare that happens to share shift + amount + pickup + dropoff
 *     (totally normal on a jeepney). A client-generated key lets the server
 *     dedupe true retries WITHOUT collapsing distinct fares. Unique so the DB
 *     enforces it; NULLs allowed (cash without a key / legacy rows).
 *   - (shift_id, payment_method, status) composite: powers the earnings
 *     breakdown SUM (GET /conductor/earnings) and the per-shift listing as an
 *     index-only range scan instead of a full table scan.
 *   - paymongo_intent_id: the PayMongo webhook looks transactions up by this
 *     on every callback — without an index it's a full scan per webhook.
 *
 * Purely ADDITIVE and idempotent: every change is guarded with hasColumn(),
 * and index creation is wrapped so a re-run (or SQLite test rebuild) is safe.
 * Runs cleanly on MySQL (dev) and SQLite (tests).
 */

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('transactions', function (Blueprint $table) {
            // Client-generated idempotency key (e.g. a UUID per "record fare"
            // action). Unique so a replayed request returns the same row
            // rather than inserting a duplicate.
            if (! Schema::hasColumn('transactions', 'idempotency_key')) {
                $table->string('idempotency_key', 100)->nullable()->unique();
            }
        });

        // Composite index for the earnings breakdown + shift listing.
        $this->safelyAddIndex(
            'transactions',
            ['shift_id', 'payment_method', 'status'],
            'transactions_shift_method_status_index'
        );

        // Webhook correlation lookup (Transaction::where('paymongo_intent_id')).
        $this->safelyAddIndex(
            'transactions',
            ['paymongo_intent_id'],
            'transactions_paymongo_intent_id_index'
        );
    }

    public function down(): void
    {
        $this->safelyDropIndex('transactions', 'transactions_shift_method_status_index');
        $this->safelyDropIndex('transactions', 'transactions_paymongo_intent_id_index');

        Schema::table('transactions', function (Blueprint $table) {
            if (Schema::hasColumn('transactions', 'idempotency_key')) {
                try {
                    $table->dropUnique(['idempotency_key']);
                } catch (\Throwable $e) {
                    // Index may not exist (SQLite); safe to ignore.
                }
                $table->dropColumn('idempotency_key');
            }
        });
    }

    /**
     * Add a named index, ignoring "already exists" errors so the migration
     * is idempotent across MySQL re-runs and SQLite test rebuilds.
     */
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
