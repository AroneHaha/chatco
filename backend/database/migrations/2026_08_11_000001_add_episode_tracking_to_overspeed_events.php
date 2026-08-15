<?php

/**
 * Overspeeding history — switch the grain from "one row per shift" to
 * "one row per overspeeding episode" (a continuous stretch above the limit).
 *
 * WHY:
 *   A shift with two separate overspeeding incidents (e.g. 8:00 AM and
 *   8:05 AM, with normal speed in between) previously collapsed into one
 *   row holding only the higher of the two speeds. Admins need each
 *   incident recorded independently.
 *
 * `ended_at` marks when an episode's speed dropped back to/under the
 * limit; NULL means the episode is still open (conductor still over the
 * limit as of `last_logged_at`). The old `shift_id` uniqueness is removed
 * so a shift can accumulate multiple episode rows.
 */

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('overspeed_events', function (Blueprint $table) {
            $table->dropUnique(['shift_id']);
            $table->index('shift_id');
            $table->timestamp('ended_at')->nullable()->after('last_logged_at');
            $table->index(['shift_id', 'ended_at']);
        });
    }

    public function down(): void
    {
        Schema::table('overspeed_events', function (Blueprint $table) {
            $table->dropIndex(['overspeed_events_shift_id_ended_at_index']);
            $table->dropColumn('ended_at');
            $table->dropIndex(['overspeed_events_shift_id_index']);
            $table->unique('shift_id');
        });
    }
};
