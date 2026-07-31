<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('shift_logs', function (Blueprint $table) {
            $table->boolean('is_on_break')->default(false)->index();
            $table->timestamp('break_started_at')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('shift_logs', function (Blueprint $table) {
            $table->dropIndex(['is_on_break']);
            $table->dropColumn(['is_on_break', 'break_started_at']);
        });
    }
};
