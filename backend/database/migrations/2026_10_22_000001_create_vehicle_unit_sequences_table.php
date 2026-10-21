<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // A shared row serializes unit allocation across application instances.
        // Initialize its value on first use, after existing vehicles are seeded.
        Schema::create('vehicle_unit_sequences', function (Blueprint $table) {
            $table->unsignedTinyInteger('id')->primary();
            $table->unsignedBigInteger('last_number')->nullable();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('vehicle_unit_sequences');
    }
};
