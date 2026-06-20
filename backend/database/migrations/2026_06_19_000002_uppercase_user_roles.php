<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * One-time data repair: uppercase any lowercase role values in the users table.
 *
 * Background:
 * - UserRole enum only accepts UPPERCASE values ('ADMIN', 'CONDUCTOR', 'COMMUTER')
 * - The User model casts 'role' to UserRole::class
 * - Earlier test files and the duplicate route group used lowercase strings,
 *   which produced rows that fail to load via Eloquent ("X is not a valid
 *   backing value for enum App\Enums\UserRole")
 * - This migration repairs existing data; future writes are fixed at source
 *   via the test/route changes that ship alongside this migration.
 */
return new class extends Migration
{
    public function up(): void
    {
        DB::table('users')->where('role', 'admin')->update(['role' => 'ADMIN']);
        DB::table('users')->where('role', 'conductor')->update(['role' => 'CONDUCTOR']);
        DB::table('users')->where('role', 'commuter')->update(['role' => 'COMMUTER']);
    }

    public function down(): void
    {
        // No-op: rolling back cannot reliably reconstruct which rows were
        // originally lowercase vs. uppercase. The repair is idempotent and
        // safe to leave in place; reverting would re-introduce broken rows.
    }
};
