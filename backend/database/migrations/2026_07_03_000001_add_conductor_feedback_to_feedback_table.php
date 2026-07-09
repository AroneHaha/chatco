<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Add a SEPARATE conductor rating to the feedback table.
 *
 * Previously one rating (`rating`/`category`/`comment`) was stamped to BOTH
 * the driver and the conductor — they always shared an identical score. The
 * commuter feedback flow now collects an independent rating for the conductor,
 * so these columns hold the conductor's own star + tags + comment, while the
 * original `rating`/`category`/`comment` columns now represent the DRIVER's.
 *
 * Nullable so historical rows (created before this split) remain valid; the
 * conductor summary/listing filters on `conductor_rating IS NOT NULL`.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('feedback', function (Blueprint $table) {
            $table->unsignedTinyInteger('conductor_rating')->nullable()->after('comment');
            $table->string('conductor_category', 50)->nullable()->after('conductor_rating');
            $table->text('conductor_comment')->nullable()->after('conductor_category');
        });
    }

    public function down(): void
    {
        Schema::table('feedback', function (Blueprint $table) {
            $table->dropColumn(['conductor_rating', 'conductor_category', 'conductor_comment']);
        });
    }
};
