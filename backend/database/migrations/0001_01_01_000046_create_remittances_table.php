<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('remittances', function (Blueprint $table) {
            $table->string('shift_id', 20)->primary();
            $table->foreign('shift_id')->references('shift_id')->on('shift_logs')->cascadeOnDelete();
            $table->date('date');
            $table->foreignUuid('conductor_id')->constrained('conductor_profiles');
            $table->string('conductor_name', 100);
            $table->foreignUuid('driver_id')->constrained('drivers');
            $table->string('driver_name', 100);
            $table->foreignUuid('vehicle_id')->constrained('vehicles');
            $table->string('unit_number', 20);
            $table->integer('total_passengers');
            $table->decimal('gcash_scanned_total', 10, 2)->default(0);
            $table->decimal('gcash_direct_total', 10, 2)->default(0);
            $table->decimal('voucher_total', 10, 2)->default(0);
            $table->decimal('total_cashless', 10, 2)->default(0);
            $table->decimal('cash_declared', 10, 2)->default(0);
            $table->decimal('cash_total', 10, 2)->default(0);
            $table->decimal('gcash_total', 10, 2)->default(0);
            $table->string('remittance_status', 20);
            $table->timestamp('time_in');
            $table->timestamp('time_out')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('remittances');
    }
};