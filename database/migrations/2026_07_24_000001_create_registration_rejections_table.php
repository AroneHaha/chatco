<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Append-only log of rejected commuter registrations.
 *
 * A rejected registration is soft-deleted and its email/username are freed for
 * re-registration, so the commuter_profiles row can't reliably carry a strike
 * count across attempts. This table survives that: each admin rejection writes
 * one row keyed on the applicant's NORMALISED identity (email + contact
 * number), letting AuthService count prior strikes and enforce a cooldown
 * (see config/registration.php + App\Services\RegistrationGuard).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('registration_rejections', function (Blueprint $table) {
            $table->uuid('id')->primary();

            // Normalised identity the strike is counted against. Email is
            // lower-cased/trimmed; contact_number is reduced to digits. Either
            // one matching a fresh registration counts as the same applicant.
            $table->string('email', 255)->index();
            $table->string('contact_number', 20)->nullable()->index();

            // The user id of the rejected account (soft-deleted), kept for
            // traceability. Not a FK — the row must outlive hard-deletes.
            $table->uuid('rejected_user_id')->nullable();

            $table->string('reason', 500);

            // 1 for the first rejection of this identity, 2 for the second, etc.
            $table->unsignedInteger('attempt_number')->default(1);

            // Set to now()+cooldown_days when this rejection reached the
            // threshold; null otherwise. A future value blocks re-registration.
            $table->timestamp('blocked_until')->nullable()->index();

            // Admin who performed the rejection (nullable for system actions).
            $table->uuid('rejected_by')->nullable();

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('registration_rejections');
    }
};
