<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('commuter_email_change_limits', function (Blueprint $table) {
            $table->foreignUuid('user_id')->primary()->constrained('users')->cascadeOnDelete();
            $table->timestamp('blocked_until')->nullable();
            $table->timestamp('password_window_started_at')->nullable();
            $table->unsignedTinyInteger('password_failures')->default(0);
            $table->timestamp('password_blocked_until')->nullable();
            foreach (['old', 'new'] as $stage) {
                $table->timestamp("{$stage}_send_window_started_at")->nullable();
                $table->unsignedTinyInteger("{$stage}_sends")->default(0);
                $table->timestamp("{$stage}_last_sent_at")->nullable();
            }
        });

        Schema::create('commuter_email_change_requests', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('session_key', 64);
            $table->string('credential_fingerprint', 64);
            $table->string('old_email', 255);
            $table->string('new_email', 255)->nullable();
            $table->string('status', 20)->default('pending');
            $table->unsignedTinyInteger('old_failures')->default(0);
            $table->unsignedTinyInteger('new_failures')->default(0);
            $table->timestamp('identity_verified_at')->nullable();
            $table->timestamp('expires_at');
            $table->timestamps();
            $table->index(['user_id', 'created_at']);
            $table->index(['user_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('commuter_email_change_requests');
        Schema::dropIfExists('commuter_email_change_limits');
    }
};
