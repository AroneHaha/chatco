<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('lost_items', function (Blueprint $table) {
            $table->string('id', 20)->primary();
            $table->string('item_name', 200);
            $table->text('description');
            $table->string('image_url', 500)->nullable();
            $table->string('plate_number', 20)->nullable();
            $table->string('driver_name', 100)->nullable();
            $table->string('conductor_name', 100)->nullable();
            $table->foreignUuid('vehicle_id')->constrained('vehicles');
            $table->string('estimated_time_lost', 100)->nullable();
            $table->string('category', 20)->nullable();
            $table->foreignUuid('reported_by_id')->constrained('users');
            $table->string('reported_by_role', 20)->nullable();
            $table->string('reporter_name', 100)->nullable();
            $table->string('status', 20)->nullable();
            $table->string('claimed_by', 100)->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('lost_items');
    }
};