<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Performance pass — Share Live Location active-link lookup.
 *
 * ShareRideController::store() and ::destroy() both filter
 * shared_ride_links by `WHERE commuter_id = ? AND is_active = ?` (store()
 * additionally on `expires_at`, ordered by `created_at`) to find a
 * commuter's current active link — store() runs this on every GPS
 * watchPosition push. Only the FK-backed single-column index on
 * commuter_id existed, so once a commuter accumulates multiple historical
 * (deactivated) links, that filter degrades into scanning all of that
 * commuter's rows instead of an index-only lookup of the active one.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('shared_ride_links', function (Blueprint $table) {
            $table->index(['commuter_id', 'is_active'], 'shared_ride_links_commuter_id_is_active_index');
        });
    }

    public function down(): void
    {
        Schema::table('shared_ride_links', function (Blueprint $table) {
            $table->dropIndex('shared_ride_links_commuter_id_is_active_index');
        });
    }
};
