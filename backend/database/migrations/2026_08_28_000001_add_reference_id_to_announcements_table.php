<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Deep-linkable announcements.
 *
 * System-generated announcements (notifyUser/notifyAdmins) previously carried
 * only free text — enough to read, not enough to act on. `reference_id` is a
 * nullable, unconstrained UUID naming the record the announcement is about
 * (e.g. the pending User.id for a NEW_REGISTRATION notice), so a click on the
 * bell can jump straight to that record instead of just showing a message.
 *
 * Deliberately not a foreign key: the referenced record's table depends on
 * `type` (registrations point at `users`, other types may point elsewhere
 * later), so there's no single table to constrain against.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('announcements', function (Blueprint $table) {
            $table->uuid('reference_id')->nullable()->after('type');
        });
    }

    public function down(): void
    {
        Schema::table('announcements', function (Blueprint $table) {
            $table->dropColumn('reference_id');
        });
    }
};
