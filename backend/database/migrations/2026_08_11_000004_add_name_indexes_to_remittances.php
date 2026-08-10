<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Admin Remittance Tracker performance — the Conductor/Driver dropdowns now
 * filter server-side (AdminController::remittances(), exact match on
 * conductor_name / driver_name) instead of only narrowing the already-loaded
 * page in memory. Neither column had an index — only the UUID FK columns
 * (conductor_id/driver_id) did — so an exact-name filter fell back to a full
 * table scan.
 *
 * Same idempotent add/drop pattern as
 * 2026_06_22_000001_add_indexes_and_idempotency_to_transactions.php, so a
 * re-run (or SQLite test rebuild) is safe.
 */
return new class extends Migration
{
    public function up(): void
    {
        $this->safelyAddIndex('remittances', ['conductor_name'], 'remittances_conductor_name_index');
        $this->safelyAddIndex('remittances', ['driver_name'], 'remittances_driver_name_index');
    }

    public function down(): void
    {
        $this->safelyDropIndex('remittances', 'remittances_conductor_name_index');
        $this->safelyDropIndex('remittances', 'remittances_driver_name_index');
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
