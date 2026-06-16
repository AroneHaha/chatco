<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('vehicles', function (Blueprint $table) {
            if (! Schema::hasColumn('vehicles', 'active_shift_id')) {
                $table->string('active_shift_id', 20)->nullable()->after('conductor_id');
            }
        });

        $fkExists = collect(DB::select("
            SELECT CONSTRAINT_NAME
            FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
            WHERE TABLE_SCHEMA = DATABASE()
              AND TABLE_NAME = 'vehicles'
              AND CONSTRAINT_NAME = 'vehicles_active_shift_id_foreign'
        "))->isNotEmpty();

        if (Schema::hasColumn('vehicles', 'active_shift_id') && ! $fkExists) {
            Schema::table('vehicles', function (Blueprint $table) {
                $table->foreign('active_shift_id')->references('shift_id')->on('shift_logs')->nullOnDelete();
            });
        }
    }

    public function down(): void
    {
        $fkExists = collect(DB::select("
            SELECT CONSTRAINT_NAME
            FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
            WHERE TABLE_SCHEMA = DATABASE()
              AND TABLE_NAME = 'vehicles'
              AND CONSTRAINT_NAME = 'vehicles_active_shift_id_foreign'
        "))->isNotEmpty();

        if ($fkExists) {
            Schema::table('vehicles', function (Blueprint $table) {
                $table->dropForeign('vehicles_active_shift_id_foreign');
            });
        }

        Schema::table('vehicles', function (Blueprint $table) {
            if (Schema::hasColumn('vehicles', 'active_shift_id')) {
                $table->dropColumn('active_shift_id');
            }
        });
    }
};