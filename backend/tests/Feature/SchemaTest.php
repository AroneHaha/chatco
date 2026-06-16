<?php

namespace Tests\Feature;

use Illuminate\Support\Facades\Schema;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SchemaTest extends TestCase
{
    use RefreshDatabase;

    public function test_vehicle_locations_table_exists(): void
    {
        $this->assertTrue(Schema::hasTable('vehicle_locations'));
    }

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
}