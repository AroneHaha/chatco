<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('commuter_profiles', function (Blueprint $table) {
            // Existing and staff-created accounts have not made this declaration.
            $table->string('terms_version', 32)->nullable();
            $table->string('privacy_version', 32)->nullable();
            $table->timestamp('terms_accepted_at')->nullable();
            $table->timestamp('privacy_acknowledged_at')->nullable();
            $table->timestamp('registration_confirmed_at')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('commuter_profiles', function (Blueprint $table) {
            $table->dropColumn([
                'terms_version', 'privacy_version', 'terms_accepted_at',
                'privacy_acknowledged_at', 'registration_confirmed_at',
            ]);
        });
    }
};
