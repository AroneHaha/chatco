<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('shift_logs', function (Blueprint $table) {
            $table->string('operating_device_id', 100)->nullable()->after('status');
            $table->string('operating_device_type', 16)->nullable()->after('operating_device_id');
            $table->timestamp('operating_device_claimed_at')->nullable()->after('operating_device_type');
        });

        Schema::table('transactions', function (Blueprint $table) {
            $table->string('source_device_id', 100)->nullable()->after('idempotency_key');
            $table->timestamp('offline_created_at')->nullable()->after('source_device_id');
            $table->timestamp('synced_at')->nullable()->after('offline_created_at');
        });

        Schema::table('payment_groups', function (Blueprint $table) {
            $table->string('source_device_id', 100)->nullable()->after('idempotency_key');
            $table->timestamp('offline_created_at')->nullable()->after('source_device_id');
            $table->timestamp('synced_at')->nullable()->after('offline_created_at');
        });
    }

    public function down(): void
    {
        Schema::table('payment_groups', function (Blueprint $table) {
            $table->dropColumn(['source_device_id', 'offline_created_at', 'synced_at']);
        });

        Schema::table('transactions', function (Blueprint $table) {
            $table->dropColumn(['source_device_id', 'offline_created_at', 'synced_at']);
        });

        Schema::table('shift_logs', function (Blueprint $table) {
            $table->dropColumn([
                'operating_device_id',
                'operating_device_type',
                'operating_device_claimed_at',
            ]);
        });
    }
};
