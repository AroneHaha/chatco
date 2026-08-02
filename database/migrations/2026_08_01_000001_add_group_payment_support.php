<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('payment_groups', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('shift_id', 20);
            $table->foreign('shift_id')->references('shift_id')->on('shift_logs')->cascadeOnDelete();
            $table->string('payment_method', 20);
            $table->string('pickup_name', 100);
            $table->string('dropoff_name', 100);
            $table->json('passenger_breakdown');
            $table->unsignedInteger('passenger_count');
            $table->decimal('total_amount', 10, 2);
            $table->foreignUuid('payer_id')->nullable()->constrained('commuter_profiles')->nullOnDelete();
            $table->string('payer_name', 100)->nullable();
            $table->string('idempotency_key', 100)->nullable()->unique();
            $table->timestamps();
        });

        Schema::table('transactions', function (Blueprint $table) {
            $table->foreignUuid('group_id')->nullable()->after('shift_id')
                ->constrained('payment_groups')->cascadeOnDelete();
            $table->unsignedInteger('group_position')->nullable()->after('group_id');
            $table->boolean('reward_eligible')->default(true)->after('group_position');
            $table->string('payer_name', 100)->nullable()->after('passenger_name');
            $table->index(['group_id', 'group_position']);
        });
    }

    public function down(): void
    {
        Schema::table('transactions', function (Blueprint $table) {
            $table->dropIndex(['group_id', 'group_position']);
            $table->dropConstrainedForeignId('group_id');
            $table->dropColumn(['group_position', 'reward_eligible', 'payer_name']);
        });

        Schema::dropIfExists('payment_groups');
    }
};
