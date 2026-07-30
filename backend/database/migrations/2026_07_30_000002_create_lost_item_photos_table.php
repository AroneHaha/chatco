<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Lost & Found multi-photo support (up to 3 per item, e-commerce style).
 *
 * `position` 0 is the thumbnail shown everywhere a single image was shown
 * before (grid cards, claim modals, etc.) — LostItemService keeps
 * lost_items.image_url synced to whatever sits at position 0, so every
 * existing single-image read site keeps working unmodified. Positions 1-2
 * are the extra gallery photos, only rendered in the detail views.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('lost_item_photos', function (Blueprint $table) {
            $table->uuid('id')->primary();
            // lost_items.id is string(36) (see 2026_07_06_000001_widen_lost_item_id_columns),
            // not a native uuid column — match claims.item_id's approach exactly.
            $table->string('item_id', 36);
            $table->foreign('item_id')->references('id')->on('lost_items')->cascadeOnDelete();
            $table->string('url', 500);
            $table->unsignedTinyInteger('position');
            $table->timestamps();

            $table->unique(['item_id', 'position']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('lost_item_photos');
    }
};
