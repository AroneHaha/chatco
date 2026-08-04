<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('claim_rejection_audits', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('claim_id');
            $table->string('item_id', 36);
            $table->uuid('claimant_id')->nullable();
            $table->foreignUuid('rejected_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('previous_status', 20);
            $table->string('resulting_status', 20);
            $table->text('rejection_reason')->nullable();
            $table->timestamps();

            $table->foreign('claim_id')->references('id')->on('claims')->cascadeOnDelete();
            $table->foreign('item_id')->references('id')->on('lost_items')->cascadeOnDelete();
            $table->foreign('claimant_id')->references('id')->on('commuter_profiles')->nullOnDelete();
            $table->index(['item_id', 'claimant_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('claim_rejection_audits');
    }
};
