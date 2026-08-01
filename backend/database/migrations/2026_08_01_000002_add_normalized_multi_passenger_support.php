<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('transactions', function (Blueprint $table) {
            $table->unsignedSmallInteger('total_passengers')->default(1)->after('final_amount');
            $table->decimal('gross_amount', 10, 2)->nullable()->after('total_passengers');
            $table->foreignUuid('payer_id')->nullable()->after('passenger_id')
                ->constrained('commuter_profiles')->nullOnDelete();
            $table->string('payer_name_snapshot', 100)->nullable()->after('payer_id');
            $table->index(['payer_id', 'status']);
        });

        DB::table('transactions')->update([
            'gross_amount' => DB::raw('final_amount + COALESCE(discount_amount, 0)'),
        ]);

        Schema::create('transaction_passengers', function (Blueprint $table) {
            $table->id();
            $table->string('transaction_id', 30);
            $table->foreign('transaction_id')->references('transaction_id')->on('transactions')->cascadeOnDelete();
            $table->string('passenger_type', 20);
            $table->unsignedSmallInteger('quantity');
            $table->decimal('unit_fare', 10, 2);
            $table->decimal('unit_discount_amount', 10, 2)->default(0);
            $table->decimal('subtotal', 10, 2);
            $table->timestamps();
            $table->unique(['transaction_id', 'passenger_type']);
            $table->index('passenger_type');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('transaction_passengers');
        Schema::table('transactions', function (Blueprint $table) {
            $table->dropIndex(['payer_id', 'status']);
            $table->dropConstrainedForeignId('payer_id');
            $table->dropColumn(['total_passengers', 'gross_amount', 'payer_name_snapshot']);
        });
    }
};
