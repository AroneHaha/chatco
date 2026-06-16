<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('shift_logs', function (Blueprint $table) {
            if (! Schema::hasColumn('shift_logs', 'status')) {
                $table->enum('status', ['ACTIVE', 'ENDED'])->default('ACTIVE')->after('route_id');
            }
        });

        $indexes = collect(DB::select("SHOW INDEX FROM shift_logs"))->pluck('Key_name')->unique();

        if (! $indexes->contains('shift_logs_conductor_id_index')) {
            Schema::table('shift_logs', function (Blueprint $table) {
                $table->index('conductor_id', 'shift_logs_conductor_id_index');
            });
        }

        if (! $indexes->contains('shift_logs_driver_id_index')) {
            Schema::table('shift_logs', function (Blueprint $table) {
                $table->index('driver_id', 'shift_logs_driver_id_index');
            });
        }

        if (! $indexes->contains('shift_logs_status_index')) {
            Schema::table('shift_logs', function (Blueprint $table) {
                $table->index('status', 'shift_logs_status_index');
            });
        }

        if (! $indexes->contains('shift_logs_vehicle_id_index')) {
            Schema::table('shift_logs', function (Blueprint $table) {
                $table->index('vehicle_id', 'shift_logs_vehicle_id_index');
            });
        }
    }

    public function down(): void
    {
        Schema::table('shift_logs', function (Blueprint $table) {
            if (Schema::hasColumn('shift_logs', 'status')) {
                $table->dropColumn('status');
            }
        });

        $indexes = collect(DB::select("SHOW INDEX FROM shift_logs"))->pluck('Key_name')->unique();

        if ($indexes->contains('shift_logs_conductor_id_index')) {
            Schema::table('shift_logs', function (Blueprint $table) {
                $table->dropIndex('shift_logs_conductor_id_index');
            });
        }

        if ($indexes->contains('shift_logs_driver_id_index')) {
            Schema::table('shift_logs', function (Blueprint $table) {
                $table->dropIndex('shift_logs_driver_id_index');
            });
        }

        if ($indexes->contains('shift_logs_status_index')) {
            Schema::table('shift_logs', function (Blueprint $table) {
                $table->dropIndex('shift_logs_status_index');
            });
        }

        if ($indexes->contains('shift_logs_vehicle_id_index')) {
            Schema::table('shift_logs', function (Blueprint $table) {
                $table->dropIndex('shift_logs_vehicle_id_index');
            });
        }
    }
};