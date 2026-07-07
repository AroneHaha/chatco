<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Sprint 6 — Feedback table.
 *
 * Stores commuter feedback for a specific shift (one row per commuter per
 * shift). The shift_id FK anchors the feedback to the exact driver +
 * conductor + vehicle that were on duty at scan time, satisfying the S6
 * requirement that "feedback goes to both driver and conductor profiles."
 *
 * The (commuter_id, shift_id) UNIQUE constraint prevents duplicate feedback
 * spam — one rating per commuter per shift. The service layer maps a unique
 * violation to HTTP 409.
 *
 * Note: shift_logs.shift_id is a string(20) PK (not UUID), so the FK column
 * type must match.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('feedback', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('shift_id', 20);
            $table->foreign('shift_id')->references('shift_id')->on('shift_logs')->cascadeOnDelete();

            // Denormalized snapshot of the crew at submission time — matches
            // the shift_logs denormalization pattern (conductor_name etc.) so
            // feedback can be displayed without an extra join.
            $table->foreignUuid('vehicle_id')->constrained('vehicles');
            $table->foreignUuid('driver_id')->constrained('drivers');
            $table->foreignUuid('conductor_id')->constrained('conductor_profiles');
            $table->foreignUuid('commuter_id')->constrained('commuter_profiles');

            $table->unsignedTinyInteger('rating');          // 1-5
            $table->string('category', 50)->nullable();     // e.g. driving, cleanliness, conduct
            $table->text('comment')->nullable();
            $table->timestamps();

            // One feedback per commuter per shift — prevents spam.
            $table->unique(['commuter_id', 'shift_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('feedback');
    }
};
