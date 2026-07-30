<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('vehicles', function (Blueprint $table) {
            if (! Schema::hasColumn('vehicles', 'active_shift_id')) {
                $table->string('active_shift_id', 20)->nullable()->after('conductor_id');
            }
        });

        // Use Schema::getForeignKeys() (Laravel 11+) instead of raw
        // INFORMATION_SCHEMA queries — works on both SQLite (test) and
        // MySQL (dev/prod).
        $fkExists = collect(Schema::getForeignKeys('vehicles'))
            ->pluck('name')
            ->contains('vehicles_active_shift_id_foreign');

        if (Schema::hasColumn('vehicles', 'active_shift_id') && ! $fkExists) {
            Schema::table('vehicles', function (Blueprint $table) {
                $table->foreign('active_shift_id')->references('shift_id')->on('shift_logs')->nullOnDelete();
            });
        }
    }

    public function down(): void
    {
        $fkExists = collect(Schema::getForeignKeys('vehicles'))
            ->pluck('name')
            ->contains('vehicles_active_shift_id_foreign');

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
