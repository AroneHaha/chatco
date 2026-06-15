<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('fare_points', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('route_id')->constrained('routes')->cascadeOnDelete();
            $table->integer('point_number');
            $table->string('code', 10);
            $table->string('name', 100);
            $table->string('landmarks', 500)->nullable();
            $table->string('sub_stops', 500)->nullable();
            $table->decimal('regular_fare', 10, 2);
            $table->decimal('discounted_fare', 10, 2);
            $table->decimal('latitude', 10, 7)->nullable();
            $table->decimal('longitude', 10, 7)->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('fare_points');
    }
};