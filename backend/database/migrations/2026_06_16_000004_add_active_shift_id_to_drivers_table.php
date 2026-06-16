<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('drivers', function (Blueprint $table) {
            if (! Schema::hasColumn('drivers', 'active_shift_id')) {
                $table->string('active_shift_id', 20)->nullable()->after('vehicle_id');
            }
        });

        $fkExists = collect(DB::select("
            SELECT CONSTRAINT_NAME
            FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
            WHERE TABLE_SCHEMA = DATABASE()
              AND TABLE_NAME = 'drivers'
              AND CONSTRAINT_NAME = 'drivers_active_shift_id_foreign'
        "))->isNotEmpty();

        if (Schema::hasColumn('drivers', 'active_shift_id') && ! $fkExists) {
            Schema::table('drivers', function (Blueprint $table) {
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
              AND TABLE_NAME = 'drivers'
              AND CONSTRAINT_NAME = 'drivers_active_shift_id_foreign'
        "))->isNotEmpty();

        if ($fkExists) {
            Schema::table('drivers', function (Blueprint $table) {
                $table->dropForeign('drivers_active_shift_id_foreign');
            });
        }

        Schema::table('drivers', function (Blueprint $table) {
            if (Schema::hasColumn('drivers', 'active_shift_id')) {
                $table->dropColumn('active_shift_id');
            }
        });
    }
};