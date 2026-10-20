<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('sos_alerts', function (Blueprint $table) {
            // WHERE status = ? ORDER BY created_at, id in either direction.
            $table->index(['status', 'created_at', 'id'], 'sos_alerts_status_created_id_index');
            $table->dropIndex('sos_alerts_status_index');
        });

        Schema::table('overspeed_events', function (Blueprint $table) {
            // The unfiltered and date-filtered history queries use different
            // leading columns; both paginate by last_logged_at, then id.
            $table->index(['last_logged_at', 'id'], 'overspeed_events_logged_id_index');
            $table->index(['date', 'last_logged_at', 'id'], 'overspeed_events_date_logged_id_index');
            $table->dropIndex('overspeed_events_date_index');
        });
    }

    public function down(): void
    {
        Schema::table('overspeed_events', function (Blueprint $table) {
            $table->index('date', 'overspeed_events_date_index');
            $table->dropIndex('overspeed_events_date_logged_id_index');
            $table->dropIndex('overspeed_events_logged_id_index');
        });

        Schema::table('sos_alerts', function (Blueprint $table) {
            $table->index('status', 'sos_alerts_status_index');
            $table->dropIndex('sos_alerts_status_created_id_index');
        });
    }
};
