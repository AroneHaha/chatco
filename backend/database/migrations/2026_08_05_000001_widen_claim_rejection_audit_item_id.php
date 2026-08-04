<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * claim_rejection_audits.item_id was introduced after lost_items.id had been
 * widened to 36-char UUIDs, but the audit FK was accidentally created with
 * the old 20-char length. MySQL rejects rejection audits with SQLSTATE 22001.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (Schema::getConnection()->getDriverName() === 'sqlite') {
            return;
        }

        Schema::table('claim_rejection_audits', function (Blueprint $table) {
            $table->dropForeign(['item_id']);
        });

        Schema::table('claim_rejection_audits', function (Blueprint $table) {
            $table->string('item_id', 36)->change();
        });

        Schema::table('claim_rejection_audits', function (Blueprint $table) {
            $table->foreign('item_id')->references('id')->on('lost_items')->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        if (Schema::getConnection()->getDriverName() === 'sqlite') {
            return;
        }

        Schema::table('claim_rejection_audits', function (Blueprint $table) {
            $table->dropForeign(['item_id']);
        });

        Schema::table('claim_rejection_audits', function (Blueprint $table) {
            $table->string('item_id', 20)->change();
        });

        Schema::table('claim_rejection_audits', function (Blueprint $table) {
            $table->foreign('item_id')->references('id')->on('lost_items')->cascadeOnDelete();
        });
    }
};
