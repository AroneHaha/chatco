<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Drop the denormalized `route_name` snapshot from shift_logs. The route is
     * already identified by `route_id` (FK to routes), the column was never
     * populated, and nothing reads it — so it is pure redundancy.
     */
    public function up(): void
    {
        Schema::table('shift_logs', function (Blueprint $table) {
            if (Schema::hasColumn('shift_logs', 'route_name')) {
                $table->dropColumn('route_name');
            }
        });
    }

    public function down(): void
    {
        Schema::table('shift_logs', function (Blueprint $table) {
            if (! Schema::hasColumn('shift_logs', 'route_name')) {
                $table->string('route_name', 100)->nullable()->after('route_id');
            }
        });
    }
};
