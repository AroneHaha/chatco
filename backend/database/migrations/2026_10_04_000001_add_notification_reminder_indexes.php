<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Existing migrations may already be deployed; add indexes without rewriting them.
        Schema::table('announcements', function (Blueprint $table) {
            $table->index(['type', 'reference_id', 'created_at'], 'announcements_reminder_lookup_index');
        });
        Schema::table('commuter_profiles', function (Blueprint $table) {
            $table->index(['account_status', 'created_at'], 'commuter_pending_age_index');
        });
    }

    public function down(): void
    {
        Schema::table('announcements', fn (Blueprint $table) => $table->dropIndex('announcements_reminder_lookup_index'));
        Schema::table('commuter_profiles', fn (Blueprint $table) => $table->dropIndex('commuter_pending_age_index'));
    }
};
