<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('voucher_generation_batches', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('admin_id')->constrained('users');
            $table->uuid('idempotency_key');
            $table->string('request_hash', 64);
            $table->unsignedSmallInteger('quantity');
            $table->boolean('allow_duplicates')->default(false);
            $table->timestamps();
            $table->unique(['admin_id', 'idempotency_key'], 'voucher_batches_request_unique');
        });

        Schema::table('vouchers', function (Blueprint $table) {
            $table->foreignUuid('generation_batch_id')->nullable()->constrained('voucher_generation_batches');
            $table->unsignedSmallInteger('recipient_slot')->default(0);
            $table->unique(['generation_batch_id', 'commuter_id', 'recipient_slot'], 'vouchers_batch_recipient_unique');
            $table->index(['commuter_id', 'status', 'expires_at'], 'vouchers_redemption_index');
            $table->index(['created_at', 'id'], 'vouchers_admin_list_index');
        });

        Schema::table('commuter_profiles', function (Blueprint $table) {
            $table->index(['account_status', 'deleted_at', 'id'], 'commuters_voucher_selection_index');
        });
    }

    public function down(): void
    {
        Schema::table('commuter_profiles', fn (Blueprint $table) => $table->dropIndex('commuters_voucher_selection_index'));
        Schema::table('vouchers', function (Blueprint $table) {
            $table->dropUnique('vouchers_batch_recipient_unique');
            $table->dropIndex('vouchers_redemption_index');
            $table->dropIndex('vouchers_admin_list_index');
            $table->dropConstrainedForeignId('generation_batch_id');
            $table->dropColumn('recipient_slot');
        });
        Schema::dropIfExists('voucher_generation_batches');
    }
};
