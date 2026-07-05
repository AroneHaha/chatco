<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Fix: lost_items.id was created as VARCHAR(20) but the LostItem model
 * generates 36-char UUIDs, so every insert failed on MySQL with
 * "1406 Data too long for column 'id'". The FK columns that reference it
 * (claims.item_id, lost_item_watchlists.item_id) carry the same 20-char cap
 * and are widened together.
 *
 * The bug never surfaced in the test suite because tests run on SQLite,
 * which does not enforce VARCHAR lengths.
 */
return new class extends Migration
{
    public function up(): void
    {
        // SQLite doesn't enforce VARCHAR lengths (nothing to fix) and can't
        // drop foreign keys in place — skip entirely on the test driver.
        if (Schema::getConnection()->getDriverName() === 'sqlite') {
            return;
        }

        // Drop the FKs that reference lost_items.id so the PK can be altered.
        Schema::table('claims', function (Blueprint $table) {
            $table->dropForeign(['item_id']);
        });
        Schema::table('lost_item_watchlists', function (Blueprint $table) {
            $table->dropForeign(['item_id']);
        });

        Schema::table('lost_items', function (Blueprint $table) {
            $table->string('id', 36)->change();
        });
        Schema::table('claims', function (Blueprint $table) {
            $table->string('item_id', 36)->change();
        });
        Schema::table('lost_item_watchlists', function (Blueprint $table) {
            $table->string('item_id', 36)->change();
        });

        // Restore the FKs (same cascade behaviour as the original migrations).
        Schema::table('claims', function (Blueprint $table) {
            $table->foreign('item_id')->references('id')->on('lost_items')->cascadeOnDelete();
        });
        Schema::table('lost_item_watchlists', function (Blueprint $table) {
            $table->foreign('item_id')->references('id')->on('lost_items')->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        if (Schema::getConnection()->getDriverName() === 'sqlite') {
            return;
        }

        // NOTE: shrinking back to 20 will fail if any 36-char UUIDs exist —
        // intentional, since truncating primary keys would corrupt the data.
        Schema::table('claims', function (Blueprint $table) {
            $table->dropForeign(['item_id']);
        });
        Schema::table('lost_item_watchlists', function (Blueprint $table) {
            $table->dropForeign(['item_id']);
        });

        Schema::table('lost_items', function (Blueprint $table) {
            $table->string('id', 20)->change();
        });
        Schema::table('claims', function (Blueprint $table) {
            $table->string('item_id', 20)->change();
        });
        Schema::table('lost_item_watchlists', function (Blueprint $table) {
            $table->string('item_id', 20)->change();
        });

        Schema::table('claims', function (Blueprint $table) {
            $table->foreign('item_id')->references('id')->on('lost_items')->cascadeOnDelete();
        });
        Schema::table('lost_item_watchlists', function (Blueprint $table) {
            $table->foreign('item_id')->references('id')->on('lost_items')->cascadeOnDelete();
        });
    }
};
