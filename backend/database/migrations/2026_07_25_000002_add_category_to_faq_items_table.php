<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * FAQ items are grouped by category on the public landing-page FAQ chat
 * (Getting Started, Payments & GCash, Riding & Tracking, Safety & Support,
 * Rewards & Loyalty). We store the category as a stable slug key; the
 * human label + emoji for each key live in the frontend metadata so admins
 * pick from a fixed list instead of re-typing labels/emojis.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('faq_items', function (Blueprint $table) {
            $table->string('category', 50)->default('getting-started')->after('answer');
            $table->index(['category', 'display_order']);
        });
    }

    public function down(): void
    {
        Schema::table('faq_items', function (Blueprint $table) {
            $table->dropIndex(['category', 'display_order']);
            $table->dropColumn('category');
        });
    }
};
