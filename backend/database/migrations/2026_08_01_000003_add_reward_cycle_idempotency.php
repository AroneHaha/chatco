<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('vouchers', function (Blueprint $table) {
            $table->unsignedInteger('reward_cycle_number')->nullable()->after('ride_origin');
            $table->unique(['commuter_id', 'type', 'reward_cycle_number'], 'vouchers_reward_cycle_unique');
        });
    }

    public function down(): void
    {
        Schema::table('vouchers', function (Blueprint $table) {
            $table->dropUnique('vouchers_reward_cycle_unique');
            $table->dropColumn('reward_cycle_number');
        });
    }
};
