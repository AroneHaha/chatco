<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Performance pass — Lost & Found data retrieval.
 *
 * Every list query (browse, admin list, my-claims, my-watchlist,
 * expireStale()) filters on lost_items.status and/or claims.status and
 * orders by created_at; several also filter on category or on
 * (item_id, status) / (claimant_id, created_at). None of these had a
 * dedicated index — only the primary keys and the single-column indexes
 * MySQL auto-creates for foreign key constraints — so as the tables grow
 * these become full scans. See LostItemService for the query shapes these
 * indexes are built for.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('lost_items', function (Blueprint $table) {
            // Covers: status/statuses[] filter + orderByDesc('created_at')
            // (every browse/admin list query), and the expireStale() sweep
            // (where status = AVAILABLE and created_at < cutoff).
            $table->index(['status', 'created_at'], 'lost_items_status_created_at_index');
            // Covers: category equality filter (browse + admin list).
            $table->index('category', 'lost_items_category_index');
        });

        Schema::table('claims', function (Blueprint $table) {
            // Covers: pending/approved-claim counts and lookups scoped to one
            // item (approveClaim's auto-reject query, rejectClaim/cancelClaim's
            // remaining-pending count).
            $table->index(['item_id', 'status'], 'claims_item_id_status_index');
            // Covers: myClaims() — a commuter's own claims, optionally
            // filtered by status, ordered by created_at desc.
            $table->index(['claimant_id', 'created_at'], 'claims_claimant_id_created_at_index');
        });
    }

    public function down(): void
    {
        Schema::table('lost_items', function (Blueprint $table) {
            $table->dropIndex('lost_items_status_created_at_index');
            $table->dropIndex('lost_items_category_index');
        });

        Schema::table('claims', function (Blueprint $table) {
            $table->dropIndex('claims_item_id_status_index');
            $table->dropIndex('claims_claimant_id_created_at_index');
        });
    }
};
