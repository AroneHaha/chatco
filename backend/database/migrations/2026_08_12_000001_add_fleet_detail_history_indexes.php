<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $this->safelyAddIndex('vehicles', ['status', 'unit_number'], 'vehicles_status_unit_number_index');
        $this->safelyAddIndex('vehicles', ['route_id', 'unit_number'], 'vehicles_route_id_unit_number_index');
        $this->safelyAddIndex('shift_logs', ['driver_id', 'time_in'], 'shift_logs_driver_id_time_in_index');
        $this->safelyAddIndex('shift_logs', ['conductor_id', 'time_in'], 'shift_logs_conductor_id_time_in_index');
    }

    public function down(): void
    {
        $this->safelyDropIndex('shift_logs', 'shift_logs_conductor_id_time_in_index');
        $this->safelyDropIndex('shift_logs', 'shift_logs_driver_id_time_in_index');
        $this->safelyDropIndex('vehicles', 'vehicles_route_id_unit_number_index');
        $this->safelyDropIndex('vehicles', 'vehicles_status_unit_number_index');
    }

    private function safelyAddIndex(string $tableName, array $columns, string $indexName): void
    {
        if (! Schema::hasTable($tableName) || Schema::hasIndex($tableName, $indexName)) {
            return;
        }

        Schema::table($tableName, function (Blueprint $table) use ($columns, $indexName) {
            $table->index($columns, $indexName);
        });
    }

    private function safelyDropIndex(string $tableName, string $indexName): void
    {
        if (! Schema::hasTable($tableName) || ! Schema::hasIndex($tableName, $indexName)) {
            return;
        }

        Schema::table($tableName, function (Blueprint $table) use ($indexName) {
            $table->dropIndex($indexName);
        });
    }
};
