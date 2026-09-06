<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Sprint 8 (mobile alignment) — break support on shift_logs.
 *
 * The conductor mobile app (chatco-mobile) toggles break state from the
 * dashboard via POST /api/v1/conductor/break-status. The shift response
 * already maps `is_on_break` / `break_started_at`, so this migration adds
 * the backing columns.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('shift_logs', function (Blueprint $table) {
            if (! Schema::hasColumn('shift_logs', 'is_on_break')) {
                $table->boolean('is_on_break')->default(false)->after('notes');
            }
            if (! Schema::hasColumn('shift_logs', 'break_started_at')) {
                $table->timestamp('break_started_at')->nullable()->after('is_on_break');
            }
        });
    }

    public function down(): void
    {
        Schema::table('shift_logs', function (Blueprint $table) {
            if (Schema::hasColumn('shift_logs', 'break_started_at')) {
                $table->dropColumn('break_started_at');
            }
            if (Schema::hasColumn('shift_logs', 'is_on_break')) {
                $table->dropColumn('is_on_break');
            }
        });
    }
};
