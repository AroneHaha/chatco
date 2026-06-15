<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('vouchers', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('code', 20)->unique();
            $table->foreignUuid('commuter_id')->nullable()->constrained('commuter_profiles')->nullOnDelete();
            $table->string('type', 20);
            $table->string('status', 20);
            $table->decimal('amount', 10, 2)->nullable();
            $table->timestamp('expires_at')->nullable();
            $table->string('ride_origin', 100);
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('vouchers');
    }
};