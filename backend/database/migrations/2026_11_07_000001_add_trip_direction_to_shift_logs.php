<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Which way the unit is running along its route. FORWARD follows the route
 * geometry from its first point (Calumpit terminal) to its last
 * (Meycauayan); REVERSE is the return trip. Every shift starts FORWARD and
 * the conductor switches it. New file because the shift_logs migrations have
 * already run on the live database.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('shift_logs', function (Blueprint $table) {
            $table->string('trip_direction', 7)->default('FORWARD')->after('break_started_at');
        });
    }

    public function down(): void
    {
        Schema::table('shift_logs', function (Blueprint $table) {
            $table->dropColumn('trip_direction');
        });
    }
};
