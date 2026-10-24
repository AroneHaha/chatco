<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /** Financial records that must not disappear with their shift. */
    private const SHIFT_MONEY_TABLES = ['transactions', 'remittances', 'payment_groups', 'feedback'];

    /** Single-column indexes already served by a composite with the same leading column. */
    private const REDUNDANT_INDEXES = [
        'transactions' => ['transactions_status_index' => 'status'],
        'shift_logs' => [
            'shift_logs_conductor_id_index' => 'conductor_id',
            'shift_logs_driver_id_index' => 'driver_id',
            'shift_logs_vehicle_id_index' => 'vehicle_id',
            'shift_logs_time_in_index' => 'time_in',
        ],
        'claims' => ['claims_status_index' => 'status'],
        'commuter_profiles' => ['commuter_profiles_account_status_index' => 'account_status'],
        'overspeed_events' => ['overspeed_events_shift_id_index' => 'shift_id'],
    ];

    public function up(): void
    {
        // Deleting a shift used to cascade to its fares, remittance and
        // feedback. Refuse the delete instead so revenue history is kept.
        foreach (self::SHIFT_MONEY_TABLES as $name) {
            Schema::table($name, function (Blueprint $table) {
                $table->dropForeign(['shift_id']);
                $table->foreign('shift_id')->references('shift_id')->on('shift_logs')->restrictOnDelete();
            });
        }

        foreach (self::REDUNDANT_INDEXES as $name => $indexes) {
            Schema::table($name, function (Blueprint $table) use ($indexes) {
                foreach (array_keys($indexes) as $index) {
                    $table->dropIndex($index);
                }
            });
        }

        // Never written: live GPS is kept in vehicle_locations.
        Schema::table('vehicles', function (Blueprint $table) {
            $table->dropColumn(['speed', 'latitude', 'longitude', 'last_location_update']);
        });
    }

    public function down(): void
    {
        Schema::table('vehicles', function (Blueprint $table) {
            $table->integer('speed')->nullable()->after('status');
            $table->decimal('latitude', 10, 7)->nullable()->after('capacity_status');
            $table->decimal('longitude', 11, 7)->nullable()->after('latitude');
            $table->timestamp('last_location_update')->nullable()->after('longitude');
        });

        foreach (self::REDUNDANT_INDEXES as $name => $indexes) {
            Schema::table($name, function (Blueprint $table) use ($indexes) {
                foreach ($indexes as $index => $column) {
                    $table->index($column, $index);
                }
            });
        }

        foreach (self::SHIFT_MONEY_TABLES as $name) {
            Schema::table($name, function (Blueprint $table) {
                $table->dropForeign(['shift_id']);
                $table->foreign('shift_id')->references('shift_id')->on('shift_logs')->cascadeOnDelete();
            });
        }
    }
};
