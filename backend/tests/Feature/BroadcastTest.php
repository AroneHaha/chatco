<?php

namespace Tests\Feature;

use App\Events\VehicleLocationUpdated;
use App\Models\Driver;
use App\Models\Route;
use App\Models\ShiftLog;
use App\Models\User;
use App\Models\Vehicle;
use Illuminate\Broadcasting\Channel;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

class BroadcastTest extends TestCase
{
    use RefreshDatabase;

    /**
     * The VehicleLocationUpdated event is a ShouldBroadcast value object.
     * We test its broadcast contract (channel, event name, payload) by
     * instantiating it directly and calling the broadcast methods —
     * this avoids depending on Broadcast::fake() (which was removed in
     * this Laravel version) and tests the event class in isolation.
     */
    public function test_vehicle_location_updated_event_broadcasts_on_vehicles_channel(): void
    {
        $payload = [
            'vehicle_id' => 'test-vehicle-id',
            'plate_number' => 'ABC123',
            'vehicle_type' => 'Jeepney',
            'lat' => 14.5995,
            'lng' => 120.9842,
            'speed' => 45.50,
            'heading' => 180.00,
            'capacity_status' => 'AVAILABLE',
            'route_name' => 'Route 1',
            'updated_at' => now()->toIso8601String(),
        ];

        $event = new VehicleLocationUpdated($payload);

        // Broadcasts on the public 'vehicles' channel
        $channel = $event->broadcastOn();
        $this->assertInstanceOf(Channel::class, $channel);
        $this->assertEquals('vehicles', $channel->name);

        // Event name matches the frontend listener expectation
        $this->assertEquals('VehicleLocationUpdated', $event->broadcastAs());

        // Payload is passed through unchanged
        $this->assertEquals($payload, $event->broadcastWith());
        $this->assertEquals($payload['vehicle_id'], $event->broadcastWith()['vehicle_id']);
    }

    public function test_vehicles_channel_is_public(): void
    {
        /** @var \App\Models\User $commuter */
        $commuter = User::factory()->commuter()->create();

        $response = $this->actingAs($commuter)
            ->postJson('/broadcasting/auth', [
                'channel_name' => 'vehicles',
                'socket_id' => '1234.5678',
            ]);

        // Public channel returns true (no auth required)
        $response->assertOk();
    }

    /**
     * VehicleLocationUpdated implements ShouldBroadcast (not
     * ShouldBroadcastNow), so it is dispatched onto the queue rather
     * than fired inline. This test fakes the queue and asserts that a
     * GPS update via POST /api/conductor/location pushes the event
     * onto the queue — proving the asynchronous broadcast path is
     * wired up correctly.
     *
     * Note: phpunit.xml sets QUEUE_CONNECTION=sync, which means the
     * queue worker runs in the same process. Queue::fake() intercepts
     * the push BEFORE any worker runs, so assertPushed works without
     * needing a separate worker process.
     */
    public function test_vehicle_location_updated_is_queued(): void
    {
        Queue::fake();

        // Fixture — matches LocationTest::setUp() pattern.
        $conductor = User::factory()->conductor()->create();
        $vehicle = Vehicle::factory()->create();
        $driver = Driver::factory()->create();
        $route = Route::factory()->create();

        $shift = ShiftLog::create([
            'shift_id' => 'SFT-' . now()->format('YmdHis'),
            'conductor_id' => $conductor->id,
            'driver_id' => $driver->id,
            'vehicle_id' => $vehicle->id,
            'route_id' => $route->id,
            'conductor_name' => 'Conductor Test',
            'driver_name' => $driver->first_name . ' ' . $driver->last_name,
            'plate_number' => $vehicle->plate_number,
            'unit_number' => $vehicle->unit_number,
            'time_in' => now(),
            'status' => 'ACTIVE',
        ]);

        $vehicle->update(['active_shift_id' => $shift->shift_id]);
        $driver->update(['active_shift_id' => $shift->shift_id]);

        // Action — conductor sends a GPS update.
        $response = $this->actingAs($conductor)
            ->postJson('/api/conductor/location', [
                'lat' => 14.5995,
                'lng' => 120.9842,
            ]);

        $response->assertOk();

        // The VehicleLocationUpdated event must be pushed onto the
        // queue (not executed inline like ShouldBroadcastNow would).
        Queue::assertPushed(VehicleLocationUpdated::class);
    }
}