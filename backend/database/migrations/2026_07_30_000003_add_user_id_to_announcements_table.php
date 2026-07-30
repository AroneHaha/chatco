<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Targeted (per-user) announcements.
 *
 * Announcements have always been global broadcasts (visible to every
 * authenticated user). Lost & Found claim-status updates ("your claim was
 * approved — bring a valid ID...") need to reach exactly one commuter, not
 * everyone, so a nullable `user_id` is added:
 *
 *   user_id IS NULL      → broadcast (existing behaviour, unchanged)
 *   user_id = some user  → only that user sees it in their feed / bell / count
 *
 * AnnouncementService::listForUser/unreadCount are updated to match rows
 * where user_id is null OR equals the requesting user. Admin-authored
 * announcements (AdminAnnouncementController::store) never set user_id, so
 * existing admin-composed announcements are unaffected.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('announcements', function (Blueprint $table) {
            $table->foreignUuid('user_id')->nullable()->after('type')->constrained('users')->cascadeOnDelete();
            $table->index('user_id');
        });
    }

    public function down(): void
    {
        Schema::table('announcements', function (Blueprint $table) {
            $table->dropForeign(['user_id']);
            $table->dropColumn('user_id');
        });
    }
};
