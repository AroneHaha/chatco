<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Performance indexes for the admin User Management list/filter queries
 * (see AdminService::listUsers/listDrivers):
 *  - commuter_profiles.account_status — every users-list status filter and
 *    the pending/rejected registrations queries filter on this column.
 *  - users(role, created_at) — the default users-list query filters by role
 *    and sorts by created_at desc; one composite index covers both.
 *  - drivers.status — the new WHERE clause added by GET /admin/drivers'
 *    server-side pagination (User Management's "Drivers" role filter).
 */
return new class extends Migration
{
    public function up(): void
    {
        $this->safelyAddIndex('commuter_profiles', ['account_status'], 'commuter_profiles_account_status_index');
        $this->safelyAddIndex('users', ['role', 'created_at'], 'users_role_created_at_index');
        $this->safelyAddIndex('drivers', ['status'], 'drivers_status_index');
    }

    public function down(): void
    {
        $this->safelyDropIndex('drivers', 'drivers_status_index');
        $this->safelyDropIndex('users', 'users_role_created_at_index');
        $this->safelyDropIndex('commuter_profiles', 'commuter_profiles_account_status_index');
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
