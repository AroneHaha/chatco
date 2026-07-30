<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Sprint 6 (T4) — Announcements: add created_by + status columns.
 *
 * The base announcements table (0001_01_01_000040) has: id, type, title,
 * message, timestamps, softDeletes. For the T4 CRUD + per-user mark-as-read
 * scope we need:
 *
 *   - created_by : FK → users.id (admin who published the announcement)
 *   - status     : ENUM('ACTIVE','ARCHIVED'), default 'ACTIVE'
 *
 * Soft-archiving (status=ARCHIVED) keeps the row for audit but hides it
 * from the commuter/conductor feed. Soft-deletes (deleted_at) are already
 * present from the base migration for hard-removal audit.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('announcements', function (Blueprint $table) {
            $table->foreignUuid('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('status', 20)->default('ACTIVE')->after('message');
            $table->index('status');
        });
    }

    public function down(): void
    {
        Schema::table('announcements', function (Blueprint $table) {
            $table->dropIndex(['status']);
            $table->dropForeign(['created_by']);
            $table->dropColumn(['created_by', 'status']);
        });
    }
};
