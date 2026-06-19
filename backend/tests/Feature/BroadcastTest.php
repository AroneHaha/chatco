<?php

namespace Tests\Feature;

use App\Events\VehicleLocationUpdated;
use App\Models\Driver;
use App\Models\Route;
use App\Models\ShiftLog;
use App\Models\User;
use App\Models\Vehicle;
use App\Enums\UserRole;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Broadcast;
use Tests\TestCase;

class BroadcastTest extends TestCase
{
    use RefreshDatabase;

    public function test_vehicle_location_updated_event_broadcasts_on_vehicles_channel(): void
    {
        Broadcast::fake();

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

        broadcast(new VehicleLocationUpdated($payload));

        Broadcast::assertBroadcasted(function (VehicleLocationUpdated $event) use ($payload) {
            return $event->broadcastOn()->name === 'vehicles'
                && $event->broadcastAs() === 'VehicleLocationUpdated'
                && $event->broadcastWith()['vehicle_id'] === $payload['vehicle_id'];
        });
    }

    public function test_vehicles_channel_is_public(): void
    {
        /** @var \App\Models\User $commuter */
        $commuter = User::factory()->create(['role' => UserRole::COMMUTER]);

        $response = $this->actingAs($commuter)
            ->postJson('/broadcasting/auth', [
                'channel_name' => 'vehicles',
                'socket_id' => 'test-socket-id',
            ]);

        // Public channel returns true (no auth required)
        $response->assertOk();
    }
}