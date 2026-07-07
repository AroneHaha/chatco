<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('shift_logs', function (Blueprint $table) {
            if (! Schema::hasColumn('shift_logs', 'status')) {
                $table->enum('status', ['ACTIVE', 'ENDED'])->default('ACTIVE')->after('route_id');
            }
        });

        // Use Schema::getIndexes() (Laravel 11+) instead of raw
        // "SHOW INDEX" — works on both SQLite (test) and MySQL (dev/prod).
        $existingIndexes = collect(Schema::getIndexes('shift_logs'))
            ->pluck('name')
            ->unique();

        if (! $existingIndexes->contains('shift_logs_conductor_id_index')) {
            Schema::table('shift_logs', function (Blueprint $table) {
                $table->index('conductor_id', 'shift_logs_conductor_id_index');
            });
        }

        if (! $existingIndexes->contains('shift_logs_driver_id_index')) {
            Schema::table('shift_logs', function (Blueprint $table) {
                $table->index('driver_id', 'shift_logs_driver_id_index');
            });
        }

        if (! $existingIndexes->contains('shift_logs_status_index')) {
            Schema::table('shift_logs', function (Blueprint $table) {
                $table->index('status', 'shift_logs_status_index');
            });
        }

        if (! $existingIndexes->contains('shift_logs_vehicle_id_index')) {
            Schema::table('shift_logs', function (Blueprint $table) {
                $table->index('vehicle_id', 'shift_logs_vehicle_id_index');
            });
        }
    }

    public function down(): void
    {
        $existingIndexes = collect(Schema::getIndexes('shift_logs'))
            ->pluck('name')
            ->unique();

        if ($existingIndexes->contains('shift_logs_conductor_id_index')) {
            Schema::table('shift_logs', function (Blueprint $table) {
                $table->dropIndex('shift_logs_conductor_id_index');
            });
        }

        if ($existingIndexes->contains('shift_logs_driver_id_index')) {
            Schema::table('shift_logs', function (Blueprint $table) {
                $table->dropIndex('shift_logs_driver_id_index');
            });
        }

        if ($existingIndexes->contains('shift_logs_status_index')) {
            Schema::table('shift_logs', function (Blueprint $table) {
                $table->dropIndex('shift_logs_status_index');
            });
        }

        if ($existingIndexes->contains('shift_logs_vehicle_id_index')) {
            Schema::table('shift_logs', function (Blueprint $table) {
                $table->dropIndex('shift_logs_vehicle_id_index');
            });
        }

        Schema::table('shift_logs', function (Blueprint $table) {
            if (Schema::hasColumn('shift_logs', 'status')) {
                $table->dropColumn('status');
            }
        });
    }
};
