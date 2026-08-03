<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Sprint 6 (T3) — Make claimant_contact + claimant_email nullable on claims.
 *
 * The original S1 claims table defined claimant_contact and claimant_email as
 * NOT NULL. The revised S6 LostItemService derives these from the authed
 * commuter's profile, but the commuter may legitimately omit contact info
 * (the claim form only requires `proof`). When the client sends only proof,
 * the service defaults claimant_contact to null, which violated the NOT NULL
 * constraint and caused a 500 instead of the expected 201.
 *
 * This migration makes both columns nullable. The service also now falls back
 * to the commuter profile's contact_number/email, but the schema should not
 * hard-require them either — a commuter should be able to submit a claim
 * with just proof of ownership.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('claims', function (Blueprint $table) {
            $table->string('claimant_contact', 20)->nullable()->change();
            $table->string('claimant_email', 255)->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('claims', function (Blueprint $table) {
            $table->string('claimant_contact', 20)->nullable(false)->change();
            $table->string('claimant_email', 255)->nullable(false)->change();
        });
    }
};
