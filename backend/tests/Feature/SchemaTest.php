<?php

namespace Tests\Feature;

use Illuminate\Support\Facades\Schema;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SchemaTest extends TestCase
{
    use RefreshDatabase;

    // ── Required Tables ──────────────────────────────────────────

    public function test_users_table_exists(): void
    {
        $this->assertTrue(Schema::hasTable('users'));
    }

    public function test_personal_access_tokens_table_exists(): void
    {
        $this->assertTrue(Schema::hasTable('personal_access_tokens'));
    }

    public function test_commuter_profiles_table_exists(): void
    {
        $this->assertTrue(Schema::hasTable('commuter_profiles'));
    }

    public function test_conductor_profiles_table_exists(): void
    {
        $this->assertTrue(Schema::hasTable('conductor_profiles'));
    }

    public function test_admin_profiles_table_exists(): void
    {
        $this->assertTrue(Schema::hasTable('admin_profiles'));
    }

    public function test_drivers_table_exists(): void
    {
        $this->assertTrue(Schema::hasTable('drivers'));
    }

    public function test_routes_table_exists(): void
    {
        $this->assertTrue(Schema::hasTable('routes'));
    }

    public function test_fare_points_table_exists(): void
    {
        $this->assertTrue(Schema::hasTable('fare_points'));
    }

    public function test_vehicles_table_exists(): void
    {
        $this->assertTrue(Schema::hasTable('vehicles'));
    }

    public function test_shift_logs_table_exists(): void
    {
        $this->assertTrue(Schema::hasTable('shift_logs'));
    }

    public function test_transactions_table_exists(): void
    {
        $this->assertTrue(Schema::hasTable('transactions'));
    }

    public function test_gcash_payment_intents_table_exists(): void
    {
        $this->assertTrue(Schema::hasTable('gcash_payment_intents'));
    }

    public function test_remittances_table_exists(): void
    {
        $this->assertTrue(Schema::hasTable('remittances'));
    }

    public function test_announcements_table_exists(): void
    {
        $this->assertTrue(Schema::hasTable('announcements'));
    }

    public function test_lost_items_table_exists(): void
    {
        $this->assertTrue(Schema::hasTable('lost_items'));
    }

    public function test_claims_table_exists(): void
    {
        $this->assertTrue(Schema::hasTable('claims'));
    }

    public function test_vouchers_table_exists(): void
    {
        $this->assertTrue(Schema::hasTable('vouchers'));
    }

    // ── Sprint 2 Tables ──────────────────────────────────────────

    public function test_vehicle_locations_table_exists(): void
    {
        $this->assertTrue(Schema::hasTable('vehicle_locations'));
    }

    // ── Sprint 3 Tables ──────────────────────────────────────────

    public function test_hails_table_exists(): void
    {
        $this->assertTrue(Schema::hasTable('hails'));
    }

    // ── Column Checks ────────────────────────────────────────────

    public function test_vehicle_locations_has_required_columns(): void
    {
        $columns = ['vehicle_id', 'conductor_id', 'lat', 'lng', 'speed', 'heading', 'capacity_status', 'updated_at'];

        foreach ($columns as $column) {
            $this->assertTrue(
                Schema::hasColumn('vehicle_locations', $column),
                "Missing column: vehicle_locations.{$column}"
            );
        }
    }

    public function test_vehicle_locations_has_no_wallet_columns(): void
    {
        $this->assertFalse(Schema::hasColumn('vehicle_locations', 'wallet_id'));
        $this->assertFalse(Schema::hasColumn('vehicle_locations', 'wallet_balance'));
    }

    public function test_shift_logs_has_status_column(): void
    {
        $this->assertTrue(Schema::hasColumn('shift_logs', 'status'));
    }

    public function test_shift_logs_has_driver_id_column(): void
    {
        $this->assertTrue(Schema::hasColumn('shift_logs', 'driver_id'));
    }

    public function test_vehicles_has_active_shift_id_column(): void
    {
        $this->assertTrue(Schema::hasColumn('vehicles', 'active_shift_id'));
    }

    public function test_drivers_has_active_shift_id_column(): void
    {
        $this->assertTrue(Schema::hasColumn('drivers', 'active_shift_id'));
    }

    public function test_hails_has_required_columns(): void
    {
        $columns = ['id', 'commuter_id', 'vehicle_id', 'conductor_id', 'commuter_lat', 'commuter_lng', 'distance_m', 'status', 'expires_at'];

        foreach ($columns as $column) {
            $this->assertTrue(
                Schema::hasColumn('hails', $column),
                "Missing column: hails.{$column}"
            );
        }
    }
}
