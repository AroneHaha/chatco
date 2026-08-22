<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('shift_device_recoveries', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('shift_id', 20);
            $table->foreignUuid('recovered_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('previous_device_id', 100);
            $table->string('previous_device_type', 16)->nullable();
            $table->timestamp('previous_device_claimed_at')->nullable();
            $table->text('reason');
            $table->timestamps();

            $table->foreign('shift_id')->references('shift_id')->on('shift_logs')->cascadeOnDelete();
            $table->index(['shift_id', 'created_at'], 'shift_device_recoveries_shift_created_index');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('shift_device_recoveries');
    }
};
