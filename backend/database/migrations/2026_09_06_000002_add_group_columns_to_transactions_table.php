<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Sprint 8 (mobile alignment) — group cash fare support on transactions.
 *
 * The conductor mobile app records a single cash payment covering a group of
 * passengers (mixed REGULAR / SENIOR_CITIZEN / STUDENT / PWD) in one request.
 * The backend expands that payload into N transaction rows that share a
 * group identity so receipts and history can render the group as one unit:
 *
 *   group_id                   — UUID shared by every row in the group
 *   group_position             — 1-based seat position within the group
 *   multiple_payment_reference — human-readable receipt reference (e.g. MPG-XXXXXXXX)
 *   total_passengers           — denormalized group size for list rendering
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('transactions', function (Blueprint $table) {
            if (! Schema::hasColumn('transactions', 'group_id')) {
                $table->uuid('group_id')->nullable()->after('shift_id');
            }
            if (! Schema::hasColumn('transactions', 'group_position')) {
                $table->unsignedInteger('group_position')->nullable()->after('group_id');
            }
            if (! Schema::hasColumn('transactions', 'multiple_payment_reference')) {
                $table->string('multiple_payment_reference', 40)->nullable()->after('group_position');
            }
            if (! Schema::hasColumn('transactions', 'total_passengers')) {
                $table->unsignedInteger('total_passengers')->nullable()->after('multiple_payment_reference');
            }
        });

        Schema::table('transactions', function (Blueprint $table) {
            if (! $this->indexExists('transactions', 'transactions_group_id_index')) {
                $table->index('group_id', 'transactions_group_id_index');
            }
            if (! $this->indexExists('transactions', 'transactions_group_reference_index')) {
                $table->index('multiple_payment_reference', 'transactions_group_reference_index');
            }
        });
    }

    public function down(): void
    {
        Schema::table('transactions', function (Blueprint $table) {
            if ($this->indexExists('transactions', 'transactions_group_reference_index')) {
                $table->dropIndex('transactions_group_reference_index');
            }
            if ($this->indexExists('transactions', 'transactions_group_id_index')) {
                $table->dropIndex('transactions_group_id_index');
            }
        });

        Schema::table('transactions', function (Blueprint $table) {
            foreach (['total_passengers', 'multiple_payment_reference', 'group_position', 'group_id'] as $column) {
                if (Schema::hasColumn('transactions', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }

    private function indexExists(string $table, string $indexName): bool
    {
        try {
            // Prefer the portable schema manager check; sqlite (tests) and
            // MySQL (Laragon) both support listing index names.
            return collect(Schema::getIndexes($table))->pluck('name')->contains($indexName);
        } catch (\Throwable) {
            return false;
        }
    }
};
