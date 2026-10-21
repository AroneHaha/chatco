<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Backs the UniqueContactNumber lookup that runs on every sign-up, on-site
 * registration, admin edit and commuter profile edit.
 *
 * A plain index, not a unique one: rejected and deleted commuters keep their
 * profile row and number, so uniqueness is enforced against live accounts in
 * App\Rules\UniqueContactNumber instead. A new migration rather than an edit
 * to create_commuter_profiles_table, which has already run on deployed DBs.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('commuter_profiles', function (Blueprint $table) {
            $table->index('contact_number');
        });
    }

    public function down(): void
    {
        Schema::table('commuter_profiles', function (Blueprint $table) {
            $table->dropIndex(['contact_number']);
        });
    }
};
