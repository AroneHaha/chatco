<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('claims', function (Blueprint $table) {
            $table->timestamp('approved_at')->nullable()->after('reviewed_at');
            $table->timestamp('rejected_at')->nullable()->after('approved_at');
            $table->timestamp('released_at')->nullable()->after('rejected_at');
        });
    }

    public function down(): void
    {
        Schema::table('claims', function (Blueprint $table) {
            $table->dropColumn(['approved_at', 'rejected_at', 'released_at']);
        });
    }
};
