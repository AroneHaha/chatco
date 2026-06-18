<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('vehicle_locations', function (Blueprint $table) {
            $table->index('updated_at');
        });

        Schema::table('shift_logs', function (Blueprint $table) {
            $table->index('time_in');
        });
    }

    public function down(): void
    {
        Schema::table('vehicle_locations', function (Blueprint $table) {
            $table->dropIndex(['updated_at']);
        });

        Schema::table('shift_logs', function (Blueprint $table) {
            $table->dropIndex(['time_in']);
        });
    }
};
