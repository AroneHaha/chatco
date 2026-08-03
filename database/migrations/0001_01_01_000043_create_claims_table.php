<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('claims', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('item_id', 20);
            $table->foreign('item_id')->references('id')->on('lost_items')->cascadeOnDelete();
            $table->foreignUuid('claimant_id')->constrained('commuter_profiles');
            $table->string('claimant_name', 100);
            $table->string('claimant_contact', 20);
            $table->string('claimant_email', 255);
            $table->string('status', 20);
            $table->string('proof', 500)->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('claims');
    }
};