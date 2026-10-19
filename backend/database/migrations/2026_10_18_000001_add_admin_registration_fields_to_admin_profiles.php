<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('admin_profiles', function (Blueprint $table) {
            // Nullable for existing admins; new admin registration requires all three.
            $table->string('username', 50)->nullable();
            $table->string('contact_number', 20)->nullable();
            $table->string('address', 255)->nullable();
            $table->unique('username');
        });
    }

    public function down(): void
    {
        Schema::table('admin_profiles', function (Blueprint $table) {
            $table->dropUnique(['username']);
            $table->dropColumn(['username', 'contact_number', 'address']);
        });
    }
};
