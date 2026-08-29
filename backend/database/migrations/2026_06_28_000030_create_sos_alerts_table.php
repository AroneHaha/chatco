<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Sprint 6 (T5) — SOS alerts table.
 *
 * A commuter in distress hits the SOS button; the backend stores the alert
 * with their current lat/lng + optional note. Admins acknowledge and
 * resolve alerts via the admin dashboard.
 *
 * Status lifecycle: ACTIVE → ACKNOWLEDGED → RESOLVED
 * (admin may skip ACK and go straight to RESOLVE — both transitions allowed)
 *
 * Rate-limited at 1 request per minute per commuter_id (throttle:sos
 * defined in AppServiceProvider) to prevent abuse. The alert is purely a
 * notification + audit record — it does NOT dispatch emergency services,
 * does NOT make payments, does NOT mutate the commuter's account.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('sos_alerts', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('commuter_id')->constrained('commuter_profiles')->cascadeOnDelete();
            $table->decimal('lat', 10, 7);
            $table->decimal('lng', 10, 7);
            $table->text('note')->nullable();
            $table->string('status', 20)->default('ACTIVE');
            $table->foreignUuid('acknowledged_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('acknowledged_at')->nullable();
            $table->foreignUuid('resolved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('resolved_at')->nullable();
            $table->timestamps();

            $table->index('status');
            $table->index('commuter_id');
            $table->index('created_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sos_alerts');
    }
};
