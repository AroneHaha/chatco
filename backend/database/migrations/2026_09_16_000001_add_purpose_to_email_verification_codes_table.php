<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Generalizes email_verification_codes to hold more than one pending
 * verification per address at once, by adding a `purpose` discriminator and
 * widening the primary key from `email` alone to (email, purpose).
 *
 * Needed for the authenticated commuter change-password flow (which reuses
 * this same table/service with purpose = 'change_password') without
 * colliding with a concurrent sign-up verification for the same address —
 * exactly the collision the original migration's docblock says this table
 * was split from password_reset_tokens to avoid in the first place.
 *
 * Existing rows (all pre-registration sign-up codes) default to
 * 'registration', so EmailVerificationService's existing call sites keep
 * working unchanged.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('email_verification_codes', function (Blueprint $table) {
            $table->string('purpose')->default('registration')->after('email');
        });

        Schema::table('email_verification_codes', function (Blueprint $table) {
            $table->dropPrimary();
        });

        Schema::table('email_verification_codes', function (Blueprint $table) {
            $table->primary(['email', 'purpose']);
        });
    }

    public function down(): void
    {
        Schema::table('email_verification_codes', function (Blueprint $table) {
            $table->dropPrimary();
        });

        Schema::table('email_verification_codes', function (Blueprint $table) {
            $table->primary('email');
        });

        Schema::table('email_verification_codes', function (Blueprint $table) {
            $table->dropColumn('purpose');
        });
    }
};
