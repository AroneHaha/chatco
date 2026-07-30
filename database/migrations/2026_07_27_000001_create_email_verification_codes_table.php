<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Sign-up email verification codes.
 *
 * Deliberately separate from password_reset_tokens even though the shape is
 * similar: this row exists BEFORE any user account does, and it carries a
 * verified_at stamp that the registration endpoint reads as proof the
 * applicant controls the inbox. Merging the two tables would mean a pending
 * reset and a pending sign-up on the same address could overwrite each other.
 *
 * One row per email — requesting a new code overwrites the old one.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('email_verification_codes', function (Blueprint $table) {
            $table->string('email')->primary();
            $table->string('token');                              // hashed 6-digit code
            $table->unsignedTinyInteger('attempts')->default(0);   // wrong guesses so far
            $table->timestamp('verified_at')->nullable();          // set once the code matches
            $table->timestamp('created_at')->nullable();           // drives the code TTL
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('email_verification_codes');
    }
};
