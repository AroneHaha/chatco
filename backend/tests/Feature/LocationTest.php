<?php

namespace Tests\Feature;

use App\Enums\CapacityStatus;
use App\Enums\UserRole;
use App\Models\Driver;
use App\Models\Route;
use App\Models\ShiftLog;
use App\Models\User;
use App\Models\Vehicle;
use App\Models\VehicleLocation;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\WithFaker;
use Tests\TestCase;

class LocationTest extends TestCase
{
    use RefreshDatabase;

    private User $conductor;
    private Vehicle $vehicle;
    private Driver $driver;
    private Route $route;
    private ShiftLog $shift;

    protected function setUp(): void
    {
        parent::setUp();

        /** @var \App\Models\User $conductor */
        $this->conductor = User::factory()->create(['role' => UserRole::CONDUCTOR]);
        $this->vehicle = Vehicle::factory()->create();
        $this->driver = Driver::factory()->create();
        $this->route = Route::factory()->create();

        $this->shift = ShiftLog::create([
            'shift_id' => 'SFT-' . now()->format('YmdHis'),
            'conductor_id' => $this->conductor->id,
            'driver_id' => $this->driver->id,
            'vehicle_id' => $this->vehicle->id,
            'route_id' => $this->route->id,
            'conductor_name' => $this->conductor->first_name . ' ' . $this->conductor->last_name,
            'driver_name' => $this->driver->first_name . ' ' . $this->driver->last_name,
            'plate_number' => $this->vehicle->plate_number,
            'time_in' => now(),
            'status' => 'ACTIVE',
        ]);

        $this->vehicle->update(['active_shift_id' => $this->shift->shift_id]);
        $this->driver->update(['active_shift_id' => $this->shift->shift_id]);
    }

    public function test_conductor_can_update_location(): void
    {
        $response = $this->actingAs($this->conductor)
            ->postJson('/api/v1/conductor/location', [
                'vehicle_id' => $this->vehicle->id,
                'latitude' => 14.5995,
                'longitude' => 120.9842,
            ]);

        $response->assertOk();

        $this->assertDatabaseHas('vehicle_locations', [
            'vehicle_id' => $this->vehicle->id,
            'latitude' => 14.5995,
            'longitude' => 120.9842,
        ]);
    }

    public function test_conductor_can_update_location_with_speed_and_heading(): void
    {
        $response = $this->actingAs($this->conductor)
            ->postJson('/api/v1/conductor/location', [
                'vehicle_id' => $this->vehicle->id,
                'latitude' => 14.5995,
                'longitude' => 120.9842,
                'speed' => 45.50,
                'heading' => 180.00,
            ]);

        $response->assertOk();
    }

    public function test_location_update_requires_active_shift(): void
    {
        $this->shift->update(['status' => 'ENDED', 'time_out' => now()]);
        $this->vehicle->update(['active_shift_id' => null]);

        /** @var \App\Models\User $conductorNoShift */
        $conductorNoShift = User::factory()->create(['role' => UserRole::CONDUCTOR]);

        $response = $this->actingAs($conductorNoShift)
            ->postJson('/api/v1/conductor/location', [
                'vehicle_id' => $this->vehicle->id,
                'latitude' => 14.5995,
                'longitude' => 120.9842,
            ]);

        $response->assertStatus(422);
    }

    public function test_location_update_validates_coordinates(): void
    {
        $response = $this->actingAs($this->conductor)
            ->postJson('/api/v1/conductor/location', [
                'vehicle_id' => $this->vehicle->id,
                'latitude' => 999,
                'longitude' => 999,
            ]);

        $response->assertStatus(422);
    }

    public function test_location_upsert_updates_existing(): void
    {
        $this->actingAs($this->conductor)
            ->postJson('/api/v1/conductor/location', [
                'vehicle_id' => $this->vehicle->id,
                'latitude' => 14.5995,
                'longitude' => 120.9842,
            ]);

        $this->actingAs($this->conductor)
            ->postJson('/api/v1/conductor/location', [
                'vehicle_id' => $this->vehicle->id,
                'latitude' => 14.6000,
                'longitude' => 120.9850,
            ]);

        $this->assertEquals(1, VehicleLocation::count());
        $this->assertDatabaseHas('vehicle_locations', [
            'vehicle_id' => $this->vehicle->id,
            'latitude' => 14.6000,
        ]);
    }

    public function test_commuter_can_get_all_active_locations(): void
    {
        /** @var \App\Models\User $commuter */
        $commuter = User::factory()->create(['role' => UserRole::COMMUTER]);

        VehicleLocation::create([
            'vehicle_id' => $this->vehicle->id,
            'conductor_id' => $this->conductor->id,
            'latitude' => 14.5995,
            'longitude' => 120.9842,
        ]);

        $response = $this->actingAs($commuter)
            ->getJson('/api/v1/vehicles/locations');

        $response->assertOk();
        $response->assertJsonStructure([
            'success',
            'data' => [
                '*' => [
                    'vehicle_id',
                    'plate_number',
                    'latitude',
                    'longitude',
                ],
            ],
        ]);
    }

    public function test_conductor_can_update_capacity_status(): void
    {
        $response = $this->actingAs($this->conductor)
            ->postJson('/api/v1/conductor/capacity-status', [
                'vehicle_id' => $this->vehicle->id,
                'capacity_status' => 'STANDING',
            ]);

        $response->assertOk();

        $this->assertDatabaseHas('vehicle_locations', [
            'vehicle_id' => $this->vehicle->id,
            'capacity_status' => 'STANDING',
        ]);
    }

    public function test_capacity_status_validates_enum(): void
    {
        $response = $this->actingAs($this->conductor)
            ->postJson('/api/v1/conductor/capacity-status', [
                'vehicle_id' => $this->vehicle->id,
                'capacity_status' => 'INVALID',
            ]);

        $response->assertStatus(422);
    }

    public function test_non_conductor_cannot_update_location(): void
    {
        /** @var \App\Models\User $commuter */
        $commuter = User::factory()->create(['role' => UserRole::COMMUTER]);

        $response = $this->actingAs($commuter)
            ->postJson('/api/v1/conductor/location', [
                'vehicle_id' => $this->vehicle->id,
                'latitude' => 14.5995,
                'longitude' => 120.9842,
            ]);

        $response->assertForbidden();
    }

    public function test_unauthenticated_cannot_access_locations(): void
    {
        $response = $this->getJson('/api/v1/vehicles/locations');
        $response->assertUnauthorized();
    }
}