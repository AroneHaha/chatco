<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Generic key-value settings store for admin configuration pages:
 * - Financial Rules (discount tiers, rides-for-free reward)
 * - Operations Rules (speed limit, max shift hours)
 * - Safety Notifications (emergency hotline, SOS email, templates)
 * - App Configuration (maintenance mode, feature toggles)
 *
 * One table for all 4 pages — each row is a single key-value pair
 * grouped by category.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('settings', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('key', 100)->unique();
            $table->text('value')->nullable();
            $table->string('category', 50)->default('general');
            $table->foreignUuid('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('settings');
    }
};
