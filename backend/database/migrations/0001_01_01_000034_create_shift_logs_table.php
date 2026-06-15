<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('shift_logs', function (Blueprint $table) {
            $table->string('shift_id', 20)->primary();
            $table->foreignUuid('conductor_id')->constrained('conductor_profiles');
            $table->string('conductor_name', 100);
            $table->foreignUuid('driver_id')->constrained('drivers');
            $table->string('driver_name', 100);
            $table->foreignUuid('vehicle_id')->constrained('vehicles');
            $table->string('unit_number', 20);
            $table->string('plate_number', 20);
            $table->foreignUuid('route_id')->nullable()->constrained('routes');
            $table->string('route_name', 100)->nullable();
            $table->timestamp('time_in');
            $table->timestamp('time_out')->nullable();
            $table->boolean('is_active')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('shift_logs');
    }
};