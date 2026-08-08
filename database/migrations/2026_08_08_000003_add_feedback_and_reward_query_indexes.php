<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Existing foreign-key indexes cover only the first column. These
        // composites match the actual filter + newest-first query order.
        Schema::table('feedback', function (Blueprint $table) {
            $table->index(['commuter_id', 'created_at'], 'feedback_commuter_created_at_index');
            $table->index(['driver_id', 'created_at'], 'feedback_driver_created_at_index');
            $table->index(['conductor_id', 'created_at'], 'feedback_conductor_created_at_index');
            $table->index(
                ['shift_id', 'conductor_id', 'created_at'],
                'feedback_shift_conductor_created_index'
            );
        });

        Schema::table('shift_logs', function (Blueprint $table) {
            $table->index(['vehicle_id', 'time_in'], 'shift_logs_vehicle_time_in_index');
        });

        Schema::table('vouchers', function (Blueprint $table) {
            $table->index(['commuter_id', 'created_at'], 'vouchers_commuter_created_at_index');
        });
    }

    public function down(): void
    {
        Schema::table('vouchers', function (Blueprint $table) {
            $table->dropIndex('vouchers_commuter_created_at_index');
        });

        Schema::table('shift_logs', function (Blueprint $table) {
            $table->dropIndex('shift_logs_vehicle_time_in_index');
        });

        Schema::table('feedback', function (Blueprint $table) {
            $table->dropIndex('feedback_shift_conductor_created_index');
            $table->dropIndex('feedback_conductor_created_at_index');
            $table->dropIndex('feedback_driver_created_at_index');
            $table->dropIndex('feedback_commuter_created_at_index');
        });
    }
};
