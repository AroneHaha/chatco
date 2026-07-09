<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('gcash_payment_intents', function (Blueprint $table) {
            $table->string('id', 30)->primary();
            $table->decimal('amount', 10, 2);
            $table->bigInteger('amount_in_centavos');
            $table->string('currency', 3)->default('PHP');
            $table->string('status', 20);
            $table->string('payment_method', 20);
            $table->foreignUuid('commuter_id')->constrained('commuter_profiles');
            $table->string('commuter_name', 100);
            $table->integer('pickup_point');
            $table->integer('dropoff_point');
            $table->foreignUuid('vehicle_id')->nullable()->constrained('vehicles')->nullOnDelete();
            $table->foreignUuid('conductor_id')->nullable()->constrained('conductor_profiles')->nullOnDelete();
            $table->string('shift_id', 20)->nullable();
            $table->foreign('shift_id')->references('shift_id')->on('shift_logs')->nullOnDelete();
            $table->string('paymongo_payment_id', 100)->nullable();
            $table->string('redirect_url', 500)->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('gcash_payment_intents');
    }
};