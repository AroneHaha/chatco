<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('vehicles', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('unit_number', 20)->unique();
            $table->string('plate_number', 20)->unique();
            $table->foreignUuid('route_id')->nullable()->constrained('routes')->nullOnDelete();
            $table->foreignUuid('driver_id')->nullable()->constrained('drivers')->nullOnDelete();
            $table->foreignUuid('conductor_id')->nullable()->constrained('conductor_profiles')->nullOnDelete();
            $table->string('status', 30)->nullable();
            $table->integer('speed')->nullable();
            $table->string('capacity_status', 20)->nullable();
            $table->decimal('latitude', 10, 7)->nullable();
            $table->decimal('longitude', 11, 7)->nullable();
            $table->timestamp('last_location_update')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('vehicles');
    }
};