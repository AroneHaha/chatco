<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Sprint 6 (T3) — Make vehicle_id nullable on lost_items.
 *
 * The original S1 migration created lost_items.vehicle_id as NOT NULL (every
 * lost item had to be tied to a specific jeepney unit). The revised S6 scope
 * allows admins to report items without a known vehicle_id (e.g. items handed
 * to a station master without a plate number). The StoreLostItemRequest
 * already treats vehicle_id as nullable, but the DB column was NOT NULL,
 * causing INSERT failures when the field was omitted.
 *
 * This migration relaxes the constraint to nullable so the service-layer
 * `?? null` default actually persists. The existing FK to vehicles is
 * preserved (Laravel 11+ SQLite/MySQL change() keeps FK constraints).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('lost_items', function (Blueprint $table) {
            $table->foreignUuid('vehicle_id')->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('lost_items', function (Blueprint $table) {
            $table->foreignUuid('vehicle_id')->nullable(false)->change();
        });
    }
};
