<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('settings', function (Blueprint $table) {
            $table->unsignedInteger('reward_rule_version')->nullable()->after('value');
        });

        Schema::table('transactions', function (Blueprint $table) {
            $table->unsignedInteger('reward_rule_version')->nullable()->after('reward_eligible');
            $table->timestamp('reward_earned_at', 6)->nullable()->after('paid_at');
            $table->index(
                [
                    'passenger_id',
                    'reward_rule_version',
                    'status',
                    'reward_eligible',
                    'payment_reconciliation_status',
                    'payment_method',
                    'reward_earned_at',
                ],
                'transactions_reward_progress_index'
            );
        });

        Schema::table('vouchers', function (Blueprint $table) {
            $table->unsignedInteger('reward_rule_version')->nullable()->after('reward_cycle_number');
            $table->timestamp('reward_earned_at', 6)->nullable()->after('reward_rule_version');
            $table->index(
                ['commuter_id', 'type', 'reward_rule_version'],
                'vouchers_reward_rule_index'
            );
        });

        // Version 1 represents all reward history that existed before threshold
        // changes became non-retroactive. Existing vouchers and progress remain
        // in that version; a later threshold change starts a fresh version.
        DB::table('settings')
            ->where('key', 'rides_for_free_reward')
            ->update(['reward_rule_version' => 1]);

        DB::table('transactions')
            ->whereNotNull('passenger_id')
            ->where('status', 'PAID')
            ->where('payment_method', '!=', 'VOUCHER')
            ->where('reward_eligible', true)
            ->whereNull('payment_reconciliation_status')
            ->update([
                'reward_rule_version' => 1,
                'reward_earned_at' => DB::raw('COALESCE(paid_at, created_at)'),
            ]);

        DB::table('vouchers')
            ->where('type', 'REWARD')
            ->update([
                'reward_rule_version' => 1,
                'reward_earned_at' => DB::raw('created_at'),
            ]);
    }

    public function down(): void
    {
        Schema::table('vouchers', function (Blueprint $table) {
            $table->dropIndex('vouchers_reward_rule_index');
            $table->dropColumn(['reward_rule_version', 'reward_earned_at']);
        });

        Schema::table('transactions', function (Blueprint $table) {
            $table->dropIndex('transactions_reward_progress_index');
            $table->dropColumn(['reward_rule_version', 'reward_earned_at']);
        });

        Schema::table('settings', function (Blueprint $table) {
            $table->dropColumn('reward_rule_version');
        });
    }
};
