<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/*
|--------------------------------------------------------------------------
| Performance Indexes for vehicle_locations.updated_at and shift_logs.time_in
|--------------------------------------------------------------------------
|
| Adds two missing single-column B-tree indexes that back the ORDER BY
| clauses in two hot-path queries:
|
|   1. App\Services\LocationService::getAllActiveLocations()
|        ->orderBy('vehicle_locations.updated_at', 'desc')
|      Without this index MySQL performs a filesort on every commuter
|      map-load request. Fine for 10 vehicles, painful for 1000+.
|
|   2. App\Services\ShiftService::getShiftLogs()
|        ->orderBy('time_in', 'desc')
|      shift_logs already had indexes on conductor_id, driver_id,
|      vehicle_id, and status (added in migration 2026_06_16_000002),
|      but NOT on time_in — which this ORDER BY needs.
|
| The migration uses the same idempotent pattern (Schema::getIndexes()
| check before adding) as the existing Sprint 2 migrations, so it is
| safe to re-run. Schema::getIndexes() is used instead of raw
| "SHOW INDEX" because the test suite runs on SQLite (phpunit.xml),
| which does not support the SHOW INDEX syntax.
|
| Index naming follows the existing convention:
|   {table}_{column}_index
| matching shift_logs_conductor_id_index, shift_logs_driver_id_index, etc.
|
| ClickUp task: 86d3cdmfh
| Priority: MEDIUM — small effort, prevents a scaling cliff.
|
*/

return new class extends Migration
{
    public function up(): void
    {
        // Index for LocationService::getAllActiveLocations()
        // ORDER BY vehicle_locations.updated_at DESC
        $vehicleLocationIndexes = collect(Schema::getIndexes('vehicle_locations'))
            ->pluck('name')
            ->unique();

        if (! $vehicleLocationIndexes->contains('vehicle_locations_updated_at_index')) {
            Schema::table('vehicle_locations', function (Blueprint $table) {
                $table->index('updated_at', 'vehicle_locations_updated_at_index');
            });
        }

        // Index for ShiftService::getShiftLogs() ORDER BY time_in DESC
        $shiftLogIndexes = collect(Schema::getIndexes('shift_logs'))
            ->pluck('name')
            ->unique();

        if (! $shiftLogIndexes->contains('shift_logs_time_in_index')) {
            Schema::table('shift_logs', function (Blueprint $table) {
                $table->index('time_in', 'shift_logs_time_in_index');
            });
        }
    }

    public function down(): void
    {
        $vehicleLocationIndexes = collect(Schema::getIndexes('vehicle_locations'))
            ->pluck('name')
            ->unique();

        if ($vehicleLocationIndexes->contains('vehicle_locations_updated_at_index')) {
            Schema::table('vehicle_locations', function (Blueprint $table) {
                $table->dropIndex('vehicle_locations_updated_at_index');
            });
        }

        $shiftLogIndexes = collect(Schema::getIndexes('shift_logs'))
            ->pluck('name')
            ->unique();

        if ($shiftLogIndexes->contains('shift_logs_time_in_index')) {
            Schema::table('shift_logs', function (Blueprint $table) {
                $table->dropIndex('shift_logs_time_in_index');
            });
        }
    }
};
