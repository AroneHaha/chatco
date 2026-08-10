<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('lost_items', function (Blueprint $table) {
            $table->timestamp('available_since')->nullable()->after('expired_at');
            $table->index(['status', 'available_since'], 'lost_items_status_available_since_index');
        });
    }

    public function down(): void
    {
        Schema::table('lost_items', function (Blueprint $table) {
            $table->dropIndex('lost_items_status_available_since_index');
            $table->dropColumn('available_since');
        });
    }
};
