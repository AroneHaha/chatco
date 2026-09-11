<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Mirrors drivers.status (string(20), nullable — see
     * 0001_01_01_000022_create_drivers_table). NULL/'ACTIVE' reads as
     * active; 'DISABLED' is set by AdminController::disableConductor and
     * cleared back to 'ACTIVE' by resetConductorCredentials.
     */
    public function up(): void
    {
        Schema::table('conductor_profiles', function (Blueprint $table) {
            $table->string('status', 20)->nullable()->after('generated_username');
        });
    }

    public function down(): void
    {
        Schema::table('conductor_profiles', function (Blueprint $table) {
            $table->dropColumn('status');
        });
    }
};
