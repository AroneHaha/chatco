<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Sprint 8 (mobile alignment) — widen routes.waypoints for full geometry.
 *
 * The web app's authoritative polyline for the W5 CTC line
 * (frontend/config/route-coords.ts, 77 points) exceeds the original
 * string(2000) capacity once stored as JSON. It is now seeded verbatim
 * into routes.waypoints (see DatabaseSeeder) and served to the conductor
 * mobile app via GET /api/v1/routes/active.
 */
return new class extends Migration
{
    public function up(): void
    {
        // MySQL (Laragon) enforces the VARCHAR(2000) byte cap, so widen it.
        // sqlite (phpunit) treats VARCHAR as TEXT natively — nothing to do.
        if (Schema::hasColumn('routes', 'waypoints') && DB::getDriverName() === 'mysql') {
            DB::statement('ALTER TABLE routes MODIFY waypoints TEXT NULL');
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('routes', 'waypoints') && DB::getDriverName() === 'mysql') {
            DB::statement('ALTER TABLE routes MODIFY waypoints VARCHAR(2000) NULL');
        }
    }
};
