<?php

namespace Tests\Feature;

use App\Models\Driver;
use App\Models\Route;
use App\Models\ShiftLog;
use App\Models\User;
use App\Models\Vehicle;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ShiftTest extends TestCase
{
    use RefreshDatabase;

    private User $conductor;
    private Vehicle $vehicle;
    private Driver $driver;
    private Route $route;

    protected function setUp(): void
    {
        parent::setUp();

        /** @var \App\Models\User $conductor */
        $this->conductor = User::factory()->create(['role' => 'conductor']);
        $this->vehicle = Vehicle::factory()->create();
        $this->driver = Driver::factory()->create();
        $this->route = Route::factory()->create();
    }

    public function test_conductor_can_start_shift(): void
    {
        $response = $this->actingAs($this->conductor)
            ->postJson('/api/conductor/shift/start', [
                'vehicle_id' => $this->vehicle->id,
                'driver_id' => $this->driver->id,
                'route_id' => $this->route->id,
            ]);

        $response->assertCreated();

        $this->assertDatabaseHas('shift_logs', [
            'conductor_id' => $this->conductor->id,
            'driver_id' => $this->driver->id,
            'vehicle_id' => $this->vehicle->id,
            'route_id' => $this->route->id,
            'status' => 'ACTIVE',
        ]);

        $this->vehicle->refresh();
        $this->driver->refresh();
        $this->assertNotNull($this->vehicle->active_shift_id);
        $this->assertNotNull($this->driver->active_shift_id);
    }

    public function test_conductor_cannot_start_duplicate_shift(): void
    {
        $this->actingAs($this->conductor)
            ->postJson('/api/conductor/shift/start', [
                'vehicle_id' => $this->vehicle->id,
                'driver_id' => $this->driver->id,
                'route_id' => $this->route->id,
            ]);

        $response = $this->actingAs($this->conductor)
            ->postJson('/api/conductor/shift/start', [
                'vehicle_id' => Vehicle::factory()->create()->id,
                'driver_id' => Driver::factory()->create()->id,
                'route_id' => $this->route->id,
            ]);

        $response->assertStatus(409);
    }

    public function test_conductor_cannot_start_shift_if_vehicle_in_use(): void
    {
        $this->actingAs($this->conductor)
            ->postJson('/api/conductor/shift/start', [
                'vehicle_id' => $this->vehicle->id,
                'driver_id' => $this->driver->id,
                'route_id' => $this->route->id,
            ]);

        /** @var \App\Models\User $otherConductor */
        $otherConductor = User::factory()->create(['role' => 'conductor']);

        $response = $this->actingAs($otherConductor)
            ->postJson('/api/conductor/shift/start', [
                'vehicle_id' => $this->vehicle->id,
                'driver_id' => Driver::factory()->create()->id,
                'route_id' => $this->route->id,
            ]);

        $response->assertStatus(409);
    }

    public function test_conductor_cannot_start_shift_if_driver_in_use(): void
    {
        $this->actingAs($this->conductor)
            ->postJson('/api/conductor/shift/start', [
                'vehicle_id' => $this->vehicle->id,
                'driver_id' => $this->driver->id,
                'route_id' => $this->route->id,
            ]);

        /** @var \App\Models\User $otherConductor */
        $otherConductor = User::factory()->create(['role' => 'conductor']);

        $response = $this->actingAs($otherConductor)
            ->postJson('/api/conductor/shift/start', [
                'vehicle_id' => Vehicle::factory()->create()->id,
                'driver_id' => $this->driver->id,
                'route_id' => $this->route->id,
            ]);

        $response->assertStatus(409);
    }

    public function test_non_conductor_cannot_start_shift(): void
    {
        /** @var \App\Models\User $commuter */
        $commuter = User::factory()->create(['role' => 'commuter']);

        $response = $this->actingAs($commuter)
            ->postJson('/api/conductor/shift/start', [
                'vehicle_id' => $this->vehicle->id,
                'driver_id' => $this->driver->id,
                'route_id' => $this->route->id,
            ]);

        $response->assertForbidden();
    }

    public function test_conductor_can_end_shift_via_remittance(): void
    {
        $this->actingAs($this->conductor)
            ->postJson('/api/conductor/shift/start', [
                'vehicle_id' => $this->vehicle->id,
                'driver_id' => $this->driver->id,
                'route_id' => $this->route->id,
            ]);

        $shift = ShiftLog::where('conductor_id', $this->conductor->id)->first();

        $response = $this->actingAs($this->conductor)
            ->postJson('/api/conductor/shift/end', [
                'shift_id' => $shift->shift_id,
                'total_collected' => 5000.00,
                'remitted_amount' => 5000.00,
                'shortage' => 0,
            ]);

        $response->assertOk();

        $shift->refresh();
        $this->assertEquals('ENDED', $shift->status);
        $this->assertNotNull($shift->time_out);

        $this->vehicle->refresh();
        $this->driver->refresh();
        $this->assertNull($this->vehicle->active_shift_id);
        $this->assertNull($this->driver->active_shift_id);
    }

    public function test_conductor_cannot_end_other_conductor_shift(): void
    {
        $this->actingAs($this->conductor)
            ->postJson('/api/conductor/shift/start', [
                'vehicle_id' => $this->vehicle->id,
                'driver_id' => $this->driver->id,
                'route_id' => $this->route->id,
            ]);

        $shift = ShiftLog::where('conductor_id', $this->conductor->id)->first();

        /** @var \App\Models\User $otherConductor */
        $otherConductor = User::factory()->create(['role' => 'conductor']);

        $response = $this->actingAs($otherConductor)
            ->postJson('/api/conductor/shift/end', [
                'shift_id' => $shift->shift_id,
                'total_collected' => 5000.00,
                'remitted_amount' => 5000.00,
                'shortage' => 0,
            ]);

        $response->assertStatus(403);
    }

    public function test_conductor_can_get_active_shift(): void
    {
        $this->actingAs($this->conductor)
            ->postJson('/api/conductor/shift/start', [
                'vehicle_id' => $this->vehicle->id,
                'driver_id' => $this->driver->id,
                'route_id' => $this->route->id,
            ]);

        $response = $this->actingAs($this->conductor)
            ->getJson('/api/conductor/shift');

        $response->assertOk();
        $response->assertJsonPath('data.status', 'ACTIVE');
    }

    public function test_conductor_can_get_shift_list(): void
    {
        ShiftLog::create([
            'shift_id' => 'SFT-TEST001',
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

        $response = $this->actingAs($this->conductor)
            ->getJson('/api/conductor/remittances');

        $response->assertOk();
    }
}