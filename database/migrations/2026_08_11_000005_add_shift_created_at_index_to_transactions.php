<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $this->safelyAddIndex(
            'transactions',
            ['shift_id', 'created_at'],
            'transactions_shift_id_created_at_index'
        );
    }

    public function down(): void
    {
        $this->safelyDropIndex('transactions', 'transactions_shift_id_created_at_index');
    }

    private function safelyAddIndex(string $tableName, array $columns, string $indexName): void
    {
        try {
            Schema::table($tableName, function (Blueprint $table) use ($columns, $indexName) {
                $table->index($columns, $indexName);
            });
        } catch (\Throwable $e) {
            // Index already exists.
        }
    }

    private function safelyDropIndex(string $tableName, string $indexName): void
    {
        try {
            Schema::table($tableName, function (Blueprint $table) use ($indexName) {
                $table->dropIndex($indexName);
            });
        } catch (\Throwable $e) {
            // Index does not exist.
        }
    }
};
