<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Sprint 6 (T3) — Lost & Found Watchlist.
 *
 * Commuters can bookmark items they believe may belong to them so they can
 * easily track status changes (e.g. item gets claimed, released, or closed).
 *
 * One watchlist entry per commuter per item (unique composite). Removing an
 * item from the watchlist is a simple DELETE — no soft-deletes needed since
 * the watchlist is a UI convenience, not an audit record.
 *
 * FK cascade: if the item or commuter profile is deleted, the watchlist
 * entries go with them.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('lost_item_watchlists', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('item_id', 20);
            $table->foreign('item_id')->references('id')->on('lost_items')->cascadeOnDelete();
            $table->foreignUuid('commuter_id')->constrained('commuter_profiles')->cascadeOnDelete();
            $table->timestamps();

            // One entry per commuter per item — enforced at DB level.
            $table->unique(['item_id', 'commuter_id']);
            $table->index('commuter_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('lost_item_watchlists');
    }
};
