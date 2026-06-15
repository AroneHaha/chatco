<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('commuter_profiles', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreign('id')->references('id')->on('users')->onDelete('cascade');
            $table->string('first_name', 100);
            $table->string('middle_name', 100)->nullable();
            $table->string('surname', 100);
            $table->date('birthdate');
            $table->string('gender', 20);
            $table->string('email', 255);
            $table->string('contact_number', 20);
            $table->string('commuter_type', 20);
            $table->string('applied_type', 20)->nullable();
            $table->string('username', 50)->unique();
            $table->string('language_preference', 20);
            $table->string('account_status', 30);
            $table->string('id_image_url', 500)->nullable();
            $table->timestamp('verified_at')->nullable();
            $table->string('rejection_reason', 500)->nullable();
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('commuter_profiles');
    }
};