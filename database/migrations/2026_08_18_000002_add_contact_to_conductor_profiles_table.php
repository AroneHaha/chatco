<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Conductors never had a contact number field — Fleet Management's "Add
 * Conductor" flow only asked for name + birthday. Nullable (not required at
 * the DB level) so existing conductors aren't broken; the app-level
 * validation on create/update enforces the PH mobile format (09XXXXXXXXX)
 * going forward, same as drivers.contact.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('conductor_profiles') && ! Schema::hasColumn('conductor_profiles', 'contact')) {
            Schema::table('conductor_profiles', function (Blueprint $table) {
                $table->string('contact', 20)->nullable()->after('birthday');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('conductor_profiles') && Schema::hasColumn('conductor_profiles', 'contact')) {
            Schema::table('conductor_profiles', function (Blueprint $table) {
                $table->dropColumn('contact');
            });
        }
    }
};
