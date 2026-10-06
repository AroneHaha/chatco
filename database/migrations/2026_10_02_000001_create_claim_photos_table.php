<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Optional proof-of-ownership photos on a commuter's Lost & Found claim
 * (up to 3), stored the same way as lost_item_photos.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('claim_photos', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('claim_id');
            $table->foreign('claim_id')->references('id')->on('claims')->cascadeOnDelete();
            $table->string('url', 500);
            $table->unsignedTinyInteger('position');
            $table->timestamps();

            $table->unique(['claim_id', 'position']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('claim_photos');
    }
};
