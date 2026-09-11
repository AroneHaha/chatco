<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('conductor_profiles', function (Blueprint $table) {
            $table->string('address', 255)->nullable()->after('contact');
            $table->string('emergency_contact_name', 100)->nullable()->after('address');
            $table->string('emergency_contact_number', 20)->nullable()->after('emergency_contact_name');
            $table->string('emergency_contact_relationship', 30)->nullable()->after('emergency_contact_number');
        });
    }

    public function down(): void
    {
        Schema::table('conductor_profiles', function (Blueprint $table) {
            $table->dropColumn([
                'address',
                'emergency_contact_name',
                'emergency_contact_number',
                'emergency_contact_relationship',
            ]);
        });
    }
};
