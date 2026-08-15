<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('terminated_personnel', function (Blueprint $table) {
            $table->date('date_joined')->nullable()->after('last_vehicle');
        });

        DB::table('terminated_personnel')
            ->select(['id', 'personnel_id', 'personnel_type'])
            ->whereNull('date_joined')
            ->orderBy('created_at')
            ->chunk(500, function ($records): void {
                $driverIds = $records
                    ->where('personnel_type', 'DRIVER')
                    ->pluck('personnel_id')
                    ->all();
                $conductorIds = $records
                    ->where('personnel_type', 'CONDUCTOR')
                    ->pluck('personnel_id')
                    ->all();

                $driverDates = DB::table('drivers')
                    ->whereIn('id', $driverIds)
                    ->pluck('hire_date', 'id');
                $conductorDates = DB::table('conductor_profiles')
                    ->whereIn('id', $conductorIds)
                    ->pluck('created_at', 'id');

                foreach ($records as $record) {
                    $date = $record->personnel_type === 'DRIVER'
                        ? $driverDates->get($record->personnel_id)
                        : $conductorDates->get($record->personnel_id);

                    if ($date) {
                        DB::table('terminated_personnel')
                            ->where('id', $record->id)
                            ->update(['date_joined' => substr((string) $date, 0, 10)]);
                    }
                }
            });
    }

    public function down(): void
    {
        Schema::table('terminated_personnel', function (Blueprint $table) {
            $table->dropColumn('date_joined');
        });
    }
};
