<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Sprint 6 (T3) — Claims review + audit columns.
 *
 * The base claims table (0001_01_01_000043) has: status (string), proof
 * (string). For the admin Approve/Reject workflow + audit trail:
 *
 *   - reviewed_by        : FK → users.id (admin who reviewed the claim)
 *   - reviewed_at        : timestamp (when the review happened)
 *   - rejection_reason   : text (why the claim was rejected, null if approved)
 *
 * Claim status lifecycle (enforced in LostItemService):
 *   PENDING → APPROVED (admin approves; item → RELEASED, released_to set)
 *   PENDING → REJECTED (admin rejects; rejection_reason required)
 *
 * Indexes: reviewed_by (admin audit queries), status (filter pending).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('claims', function (Blueprint $table) {
            $table->foreignUuid('reviewed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('reviewed_at')->nullable();
            $table->text('rejection_reason')->nullable();
            $table->index('reviewed_by');
            $table->index('status');
        });
    }

    public function down(): void
    {
        Schema::table('claims', function (Blueprint $table) {
            $table->dropIndex(['reviewed_by']);
            $table->dropIndex(['status']);
            $table->dropForeign(['reviewed_by']);
            $table->dropColumn(['reviewed_by', 'reviewed_at', 'rejection_reason']);
        });
    }
};
