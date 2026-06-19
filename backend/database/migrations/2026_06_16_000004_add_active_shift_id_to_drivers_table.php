<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('drivers', function (Blueprint $table) {
            if (! Schema::hasColumn('drivers', 'active_shift_id')) {
                $table->string('active_shift_id', 20)->nullable()->after('vehicle_id');
            }
        });

        $fkExists = collect(Schema::getForeignKeys('drivers'))
            ->pluck('name')
            ->contains('drivers_active_shift_id_foreign');

        if (Schema::hasColumn('drivers', 'active_shift_id') && ! $fkExists) {
            Schema::table('drivers', function (Blueprint $table) {
                $table->foreign('active_shift_id')->references('shift_id')->on('shift_logs')->nullOnDelete();
            });
        }
    }

    public function down(): void
    {
        $fkExists = collect(Schema::getForeignKeys('drivers'))
            ->pluck('name')
            ->contains('drivers_active_shift_id_foreign');

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
