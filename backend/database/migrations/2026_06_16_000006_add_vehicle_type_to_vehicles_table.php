<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Sprint 2 — add `vehicle_type` column to the vehicles table.
 *
 * Background
 * ----------
 * S2-T1 only required `active_shift_id` on vehicles. However S2-T4
 * (LocationService::getAllActiveLocations) and S2-T7
 * (VehicleLocationUpdated broadcast payload) both require a
 * `vehicle_type` field in their responses, and the Sprint 2 Handoff
 * Brief explicitly states:
 *
 *   "VehicleFactory — must populate plate_number, vehicle_type, status"
 *
 * Without this column the previous implementation aliased
 * `vehicles.capacity_status as vehicle_type`, which returned enum
 * values (AVAILABLE/STANDING/FULL) as the vehicle_type — semantically
 * wrong. This migration adds the missing column so the spec is
 * satisfied and VehicleFactory can populate it.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('vehicles', function (Blueprint $table) {
            if (! Schema::hasColumn('vehicles', 'vehicle_type')) {
                $table->string('vehicle_type', 50)->nullable()->after('plate_number');
            }
        });
    }

    public function down(): void
    {
        Schema::table('vehicles', function (Blueprint $table) {
            if (Schema::hasColumn('vehicles', 'vehicle_type')) {
                $table->dropColumn('vehicle_type');
            }
        });
    }
};
