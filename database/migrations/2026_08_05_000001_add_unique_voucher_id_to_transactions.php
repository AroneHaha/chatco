<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $hasDuplicateVoucher = DB::table('transactions')
            ->whereNotNull('voucher_id')
            ->groupBy('voucher_id')
            ->havingRaw('COUNT(*) > 1')
            ->exists();

        if ($hasDuplicateVoucher) {
            throw new RuntimeException(
                'Cannot enforce unique voucher redemption: duplicate transactions.voucher_id values exist.'
            );
        }

        Schema::table('transactions', function (Blueprint $table) {
            // MySQL and SQLite both permit multiple NULL values in a UNIQUE
            // index, so ordinary CASH/GCASH transactions remain unaffected.
            $table->unique('voucher_id', 'transactions_voucher_id_unique');
        });
    }

    public function down(): void
    {
        Schema::table('transactions', function (Blueprint $table) {
            $table->dropUnique('transactions_voucher_id_unique');
        });
    }
};
