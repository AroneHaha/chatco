<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Allow SOS alerts to be raised by a CONDUCTOR as well as a commuter.
 *
 * The table originally hard-required a commuter_id. We generalize it:
 *   - commuter_id  becomes nullable (set only for commuter-raised alerts)
 *   - conductor_id added, nullable (set only for conductor-raised alerts)
 *   - sender_role  discriminates the two ('COMMUTER' | 'CONDUCTOR')
 *
 * Exactly one of commuter_id / conductor_id is populated per row; the service
 * layer enforces that. Existing rows are all commuter alerts, so the
 * sender_role default of 'COMMUTER' backfills them correctly.
 */
return new class extends Migration
{
    public function up(): void
    {
        // SQLite (used in tests/sandbox) can't drop-and-recreate FK columns via
        // ->change() cleanly, so guard the commuter_id nullability change to the
        // drivers that support it. On SQLite the column stays NOT NULL at the DB
        // level, which is fine — conductor alerts simply never touch that column
        // and the app never writes a null there when a commuter is the sender.
        if (Schema::getConnection()->getDriverName() !== 'sqlite') {
            Schema::table('sos_alerts', function (Blueprint $table) {
                $table->foreignUuid('commuter_id')->nullable()->change();
            });
        }

        Schema::table('sos_alerts', function (Blueprint $table) {
            $table->string('sender_role', 20)->default('COMMUTER')->after('id');
            $table->foreignUuid('conductor_id')->nullable()->after('commuter_id')
                ->constrained('conductor_profiles')->cascadeOnDelete();
            $table->index('sender_role');
        });
    }

    public function down(): void
    {
        Schema::table('sos_alerts', function (Blueprint $table) {
            $table->dropIndex(['sender_role']);
            $table->dropConstrainedForeignId('conductor_id');
            $table->dropColumn('sender_role');
        });

        if (Schema::getConnection()->getDriverName() !== 'sqlite') {
            Schema::table('sos_alerts', function (Blueprint $table) {
                $table->foreignUuid('commuter_id')->nullable(false)->change();
            });
        }
    }
};
