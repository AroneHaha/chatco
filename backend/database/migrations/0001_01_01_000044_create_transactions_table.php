<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('transactions', function (Blueprint $table) {
            $table->string('transaction_id', 30)->primary();
            $table->string('shift_id', 20);
            $table->foreign('shift_id')->references('shift_id')->on('shift_logs')->cascadeOnDelete();
            $table->string('payment_method', 20);
            $table->decimal('final_amount', 10, 2);
            $table->foreignUuid('passenger_id')->nullable()->constrained('commuter_profiles')->nullOnDelete();
            $table->string('passenger_name', 100)->nullable();
            $table->string('passenger_role', 20)->nullable();
            $table->foreignUuid('pickup_stop_id')->constrained('fare_points');
            $table->foreignUuid('dropoff_stop_id')->constrained('fare_points');
            $table->string('pickup_name', 100)->nullable();
            $table->string('dropoff_name', 100)->nullable();
            $table->decimal('distance', 10, 2)->nullable();
            $table->decimal('base_fare', 10, 2)->nullable();
            $table->decimal('succeeding_km', 10, 2)->nullable();
            $table->decimal('discount_amount', 10, 2)->nullable();
            $table->string('conductor_name', 100)->nullable();
            $table->string('unit_number', 20)->nullable();
            $table->string('driver_name', 100)->nullable();
            $table->foreignUuid('voucher_id')->nullable()->constrained('vouchers')->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('transactions');
    }
};