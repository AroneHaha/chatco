<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Sprint 6 (T3) — Lost & Found release + audit columns.
 *
 * The base lost_items table (0001_01_01_000042) has: status (string),
 * claimed_by (name string). For the revised S6 workflow (Approve/Reject →
 * Released → record receiver + audit trail) we need:
 *
 *   - released_to   : FK → commuter_profiles.id (who received the item)
 *   - released_at   : timestamp (when the item was handed over)
 *   - closed_by     : FK → users.id (admin who closed the item)
 *   - closed_at     : timestamp (when the item was closed)
 *
 * The item status lifecycle (enforced in LostItemService):
 *   AVAILABLE → CLAIMED (first claim submitted) → RELEASED (claim approved)
 *   → CLOSED (admin closes after handover)
 *
 * A rejected claim does NOT change the item status — the item stays CLAIMED
 * if other pending claims exist, or reverts to AVAILABLE if no pending claims
 * remain. This is handled in the service layer, not via DB constraints.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('lost_items', function (Blueprint $table) {
            $table->foreignUuid('released_to')->nullable()->constrained('commuter_profiles')->nullOnDelete();
            $table->timestamp('released_at')->nullable();
            $table->foreignUuid('closed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('closed_at')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('lost_items', function (Blueprint $table) {
            $table->dropForeign(['released_to']);
            $table->dropForeign(['closed_by']);
            $table->dropColumn(['released_to', 'released_at', 'closed_by', 'closed_at']);
        });
    }
};
