<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('announcements', function (Blueprint $table) {
            $table->string('type', 50)->change();
        });
    }

    public function down(): void
    {
        if (DB::table('announcements')->whereRaw('CHAR_LENGTH(type) > 20')->exists()) {
            throw new RuntimeException('Cannot reduce announcements.type to 20 characters while longer notification types exist.');
        }

        Schema::table('announcements', function (Blueprint $table) {
            $table->string('type', 20)->change();
        });
    }
};
