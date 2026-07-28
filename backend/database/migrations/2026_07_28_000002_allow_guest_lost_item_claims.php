<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('claims', function (Blueprint $table) {
            $table->uuid('claimant_id')->nullable()->change();
        });
    }

    public function down(): void
    {
        DB::table('claims')->whereNull('claimant_id')->delete();

        Schema::table('claims', function (Blueprint $table) {
            $table->uuid('claimant_id')->nullable(false)->change();
        });
    }
};
