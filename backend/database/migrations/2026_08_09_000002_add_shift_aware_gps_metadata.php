<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('vehicle_locations', function (Blueprint $table) {
            $table->string('shift_id', 20)->nullable()->after('vehicle_id')->index();
            $table->decimal('accuracy_m', 8, 2)->nullable()->after('heading');
            $table->timestamp('fix_recorded_at')->nullable()->after('accuracy_m');
            $table->foreign('shift_id')->references('shift_id')->on('shift_logs')->nullOnDelete();
        });

        $activeSnapshots = DB::table('vehicle_locations')
            ->join('vehicles', 'vehicle_locations.vehicle_id', '=', 'vehicles.id')
            ->whereNotNull('vehicles.active_shift_id')
            ->get([
                'vehicle_locations.vehicle_id',
                'vehicle_locations.updated_at',
                'vehicles.active_shift_id',
            ]);
        foreach ($activeSnapshots as $snapshot) {
            DB::table('vehicle_locations')
                ->where('vehicle_id', $snapshot->vehicle_id)
                ->update([
                    'shift_id' => $snapshot->active_shift_id,
                    'fix_recorded_at' => $snapshot->updated_at,
                ]);
        }

        Schema::table('overspeed_events', function (Blueprint $table) {
            $table->decimal('latitude', 10, 7)->nullable()->after('threshold');
            $table->decimal('longitude', 10, 7)->nullable()->after('latitude');
            $table->decimal('accuracy_m', 8, 2)->nullable()->after('longitude');
        });
    }

    public function down(): void
    {
        Schema::table('overspeed_events', function (Blueprint $table) {
            $table->dropColumn(['latitude', 'longitude', 'accuracy_m']);
        });

        Schema::table('vehicle_locations', function (Blueprint $table) {
            $table->dropForeign(['shift_id']);
            $table->dropIndex(['shift_id']);
            $table->dropColumn(['shift_id', 'accuracy_m', 'fix_recorded_at']);
        });
    }
};
