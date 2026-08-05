<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('transactions', function (Blueprint $table) {
            $table->string('payment_reconciliation_status', 30)->nullable()->after('payment_metadata')->index();
            $table->string('payment_reconciliation_reason')->nullable()->after('payment_reconciliation_status');
            $table->timestamp('payment_reconciliation_required_at')->nullable()->after('payment_reconciliation_reason');
            $table->timestamp('payment_reconciliation_resolved_at')->nullable()->after('payment_reconciliation_required_at');
        });
    }

    public function down(): void
    {
        Schema::table('transactions', function (Blueprint $table) {
            $table->dropIndex(['payment_reconciliation_status']);
            $table->dropColumn([
                'payment_reconciliation_status',
                'payment_reconciliation_reason',
                'payment_reconciliation_required_at',
                'payment_reconciliation_resolved_at',
            ]);
        });
    }
};
