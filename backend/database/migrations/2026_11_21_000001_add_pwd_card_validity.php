<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * A new file because the discount migrations have already run on deployed
     * databases. Existing PWD accounts keep a NULL date, which means their
     * discount never lapses; only new sign-ups, applications and renewals
     * record the "Valid until" printed on the card.
     */
    public function up(): void
    {
        Schema::table('commuter_profiles', function (Blueprint $table) {
            $table->date('pwd_valid_until')->nullable();
            // The daily expiry and reminder sweeps filter on both columns.
            $table->index(['commuter_type', 'pwd_valid_until'], 'pwd_renewal_due');
        });
        Schema::table('discount_applications', function (Blueprint $table) {
            // The date the commuter typed, checked by the admin against the card.
            $table->date('valid_until')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('discount_applications', function (Blueprint $table) {
            $table->dropColumn('valid_until');
        });
        Schema::table('commuter_profiles', function (Blueprint $table) {
            $table->dropIndex('pwd_renewal_due');
            $table->dropColumn('pwd_valid_until');
        });
    }
};
