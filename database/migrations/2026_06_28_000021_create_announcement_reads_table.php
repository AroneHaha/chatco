<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Sprint 6 (T4) — Per-user announcement read tracking.
 *
 * Each (announcement_id, user_id) pair records when a user marked an
 * announcement as read. This powers the bell-badge unread count and the
 * is_read flag on the announcement feed.
 *
 * Primary key is the composite (announcement_id, user_id) — one row per
 * user per announcement. Re-reading just refreshes read_at (upsert).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('announcement_reads', function (Blueprint $table) {
            $table->foreignUuid('announcement_id')->constrained('announcements')->cascadeOnDelete();
            $table->foreignUuid('user_id')->constrained('users')->cascadeOnDelete();
            $table->timestamp('read_at');
            $table->primary(['announcement_id', 'user_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('announcement_reads');
    }
};
