<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    /**
     * shared_ride_links table — powers the "Share Live Location" feature.
     *
     * A commuter generates a tracking token → shares the URL → anyone with
     * the URL can see the commuter's live GPS position on a map for a
     * limited time (default 30 min). The commuter's GPS is updated via the
     * existing hail/tracking flow or this table's lat/lng columns.
     */
    public function up(): void
    {
        Schema::create('shared_ride_links', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('commuter_id')->constrained('commuter_profiles')->cascadeOnDelete();
            $table->string('token', 64)->unique();
            $table->decimal('lat', 10, 7)->nullable();
            $table->decimal('lng', 10, 7)->nullable();
            $table->timestamp('expires_at');
            $table->timestamp('last_updated_at')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('shared_ride_links');
    }
};
