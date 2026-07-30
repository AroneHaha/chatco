<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('user_suspensions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('user_id')->index();
            $table->string('reason_code', 50);
            $table->string('reason', 500);
            $table->timestamp('starts_at');
            $table->timestamp('ends_at')->nullable()->index();
            $table->boolean('is_permanent')->default(false);
            $table->uuid('suspended_by')->nullable();
            $table->timestamp('lifted_at')->nullable()->index();
            $table->uuid('lifted_by')->nullable();
            $table->timestamps();

            $table->foreign('user_id')->references('id')->on('users')->cascadeOnDelete();
            $table->foreign('suspended_by')->references('id')->on('users')->nullOnDelete();
            $table->foreign('lifted_by')->references('id')->on('users')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('user_suspensions');
    }
};
