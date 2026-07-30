<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Lost & Found auto-expiry.
 *
 * Items left unclaimed for too long (LostItemService::EXPIRY_DAYS) are moved
 * to a new EXPIRED status by the `lost-items:expire` scheduled command,
 * rather than being deleted — they stay fully visible to admins under a
 * dedicated filter and can be manually reactivated (EXPIRED → AVAILABLE) if
 * a claimant turns up late.
 *
 *   expired_at : timestamp (when the item was auto-expired; null = never)
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('lost_items', function (Blueprint $table) {
            $table->timestamp('expired_at')->nullable()->index();
        });
    }

    public function down(): void
    {
        Schema::table('lost_items', function (Blueprint $table) {
            $table->dropColumn('expired_at');
        });
    }
};
