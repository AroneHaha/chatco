<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Lost & Found follow-ups that need storage:
 *
 * - claims.pickup_*: where/when the approved claimant collects the item and
 *   the reminder shown to them. Set by the admin at approval time.
 * - claims.no_show_at: set when an approved claimant never collected the
 *   item by the end of the pickup day and the claim was auto-rejected
 *   ("did not proceed"). Distinguishes that from an admin rejection; the
 *   (status, pickup_at) index serves the daily sweep that finds them.
 * - lost_item_watchlists.expiry_reminded_at: when the "your saved item is
 *   about to expire" notice was last sent, so the daily job sends it once
 *   per availability window instead of every day.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('claims', function (Blueprint $table) {
            $table->string('pickup_location', 255)->nullable()->after('released_at');
            $table->timestamp('pickup_at')->nullable()->after('pickup_location');
            $table->string('pickup_reminder', 500)->nullable()->after('pickup_at');
            $table->timestamp('no_show_at')->nullable()->after('pickup_reminder');
            $table->index(['status', 'pickup_at']);
        });

        Schema::table('lost_item_watchlists', function (Blueprint $table) {
            $table->timestamp('expiry_reminded_at')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('claims', function (Blueprint $table) {
            $table->dropIndex(['status', 'pickup_at']);
            $table->dropColumn(['pickup_location', 'pickup_at', 'pickup_reminder', 'no_show_at']);
        });

        Schema::table('lost_item_watchlists', function (Blueprint $table) {
            $table->dropColumn('expiry_reminded_at');
        });
    }
};
