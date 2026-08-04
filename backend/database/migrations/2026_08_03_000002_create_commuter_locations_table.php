<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('commuter_locations', function (Blueprint $table) {
            $table->foreignUuid('commuter_id')->primary()
                ->constrained('commuter_profiles')->cascadeOnDelete();
            $table->decimal('latitude', 10, 7);
            $table->decimal('longitude', 10, 7);
            $table->decimal('accuracy', 8, 2)->nullable();
            $table->timestamps();
            $table->index('updated_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('commuter_locations');
    }
};
