<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Models\Driver;
use App\Models\Route;
use App\Models\User;
use App\Models\Vehicle;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class Sprint2RoleAccessTest extends TestCase
{
    use RefreshDatabase;

    public function test_commuter_cannot_access_conductor_shift_start(): void
    {
        /** @var \App\Models\User $commuter */
        $commuter = User::factory()->create(['role' => UserRole::COMMUTER]);
        $vehicle = Vehicle::factory()->create();
        $driver = Driver::factory()->create();
        $route = Route::factory()->create();

        $response = $this->actingAs($commuter)
            ->postJson('/api/conductor/shift/start', [
                'vehicle_id' => $vehicle->id,
                'driver_id' => $driver->id,
                'route_id' => $route->id,
            ]);

        $response->assertForbidden();
    }

    public function test_admin_cannot_start_shift(): void
    {
        /** @var \App\Models\User $admin */
        $admin = User::factory()->create(['role' => UserRole::ADMIN]);
        $vehicle = Vehicle::factory()->create();
        $driver = Driver::factory()->create();
        $route = Route::factory()->create();

        $response = $this->actingAs($admin)
            ->postJson('/api/conductor/shift/start', [
                'vehicle_id' => $vehicle->id,
                'driver_id' => $driver->id,
                'route_id' => $route->id,
            ]);

        $response->assertForbidden();
    }

    public function test_commuter_cannot_update_vehicle_location(): void
    {
        /** @var \App\Models\User $commuter */
        $commuter = User::factory()->create(['role' => UserRole::COMMUTER]);
        $vehicle = Vehicle::factory()->create();

        $response = $this->actingAs($commuter)
            ->postJson('/api/conductor/location', [
                'vehicle_id' => $vehicle->id,
                'latitude' => 14.5995,
                'longitude' => 120.9842,
            ]);

        $response->assertForbidden();
    }

    public function test_admin_cannot_update_vehicle_location(): void
    {
        /** @var \App\Models\User $admin */
        $admin = User::factory()->create(['role' => UserRole::ADMIN]);
        $vehicle = Vehicle::factory()->create();

        $response = $this->actingAs($admin)
            ->postJson('/api/conductor/location', [
                'vehicle_id' => $vehicle->id,
                'latitude' => 14.5995,
                'longitude' => 120.9842,
            ]);

        $response->assertForbidden();
    }

    public function test_conductor_can_access_own_routes(): void
    {
        /** @var \App\Models\User $conductor */
        $conductor = User::factory()->create(['role' => UserRole::CONDUCTOR]);

        $response = $this->actingAs($conductor)
            ->getJson('/api/conductor/shift');

        $response->assertOk();
    }

    public function test_any_authenticated_user_can_view_vehicle_locations(): void
    {
        /** @var \App\Models\User $commuter */
        $commuter = User::factory()->create(['role' => UserRole::COMMUTER]);

        /** @var \App\Models\User $admin */
        $admin = User::factory()->create(['role' => UserRole::ADMIN]);

        $commuterResponse = $this->actingAs($commuter)
            ->getJson('/api/vehicles/locations');
        $commuterResponse->assertOk();

        $adminResponse = $this->actingAs($admin)
            ->getJson('/api/vehicles/locations');
        $adminResponse->assertOk();
    }

    public function test_guest_cannot_access_any_protected_route(): void
    {
        $this->getJson('/api/conductor/shift')->assertUnauthorized();
        $this->getJson('/api/vehicles/locations')->assertUnauthorized();
        $this->postJson('/api/conductor/location', [])->assertUnauthorized();
        $this->postJson('/api/conductor/shift/start', [])->assertUnauthorized();
    }
}