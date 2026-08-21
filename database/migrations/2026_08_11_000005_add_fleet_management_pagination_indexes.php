<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $this->safelyAddIndex('drivers', ['last_name', 'first_name'], 'drivers_name_index');
        $this->safelyAddIndex('drivers', ['contact'], 'drivers_contact_index');
        $this->safelyAddIndex('conductor_profiles', ['last_name', 'first_name'], 'conductor_profiles_name_index');
        $this->safelyAddIndex('terminated_personnel', ['terminated_date', 'created_at'], 'terminated_personnel_date_created_index');
        $this->safelyAddIndex('terminated_personnel', ['name'], 'terminated_personnel_name_index');
        $this->safelyAddIndex('shift_logs', ['time_in', 'shift_id'], 'shift_logs_time_in_shift_id_index');
    }

    public function down(): void
    {
        $this->safelyDropIndex('shift_logs', 'shift_logs_time_in_shift_id_index');
        $this->safelyDropIndex('terminated_personnel', 'terminated_personnel_name_index');
        $this->safelyDropIndex('terminated_personnel', 'terminated_personnel_date_created_index');
        $this->safelyDropIndex('conductor_profiles', 'conductor_profiles_name_index');
        $this->safelyDropIndex('drivers', 'drivers_contact_index');
        $this->safelyDropIndex('drivers', 'drivers_name_index');
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
