<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('activity_logs', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('category', 30);
            $table->string('description', 500);
            // Nullable — a null actor renders as "System" on the admin table
            // (e.g. a future automated/non-admin-triggered event).
            $table->foreignUuid('actor_id')->nullable()->constrained('users')->nullOnDelete();
            // Snapshotted at write time (not resolved live via the actor_id
            // relation) so a log entry stays meaningful even if the admin
            // account is later renamed or deleted.
            $table->string('actor_name', 100)->nullable();
            $table->timestamps();

            $table->index(['category', 'created_at']);
            $table->index('created_at');
            // Explicit — foreignUuid()->constrained() doesn't guarantee an
            // index on every driver (e.g. Postgres doesn't auto-index FKs).
            $table->index('actor_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('activity_logs');
    }
};
