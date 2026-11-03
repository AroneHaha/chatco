<?php

namespace Tests\Feature;

use App\Models\Route;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class DynamicRouteTest extends TestCase
{
    use RefreshDatabase;

    public function test_public_endpoint_returns_the_saved_route_line(): void
    {
        $route = Route::factory()->create([
            'name' => 'Saved Corridor',
            'status' => 'ACTIVE',
            'geometry' => [[14.90, 120.70], [14.80, 120.80]],
        ]);

        $this->getJson('/api/v1/routes/active')
            ->assertOk()
            ->assertJsonPath('data.id', $route->id)
            ->assertJsonPath('data.coordinates.1.1', 120.80)
            ->assertJsonMissingPath('data.version');
    }

    public function test_active_route_without_a_saved_line_is_skipped(): void
    {
        Route::factory()->create(['status' => 'ACTIVE', 'geometry' => null]);

        $this->getJson('/api/v1/routes/active')->assertNotFound();
    }

    public function test_saving_the_route_line_replaces_it_in_place_with_no_history(): void
    {
        $admin = User::factory()->admin()->create();
        $route = Route::factory()->create(['status' => 'INACTIVE', 'geometry' => [[14.90, 120.70], [14.80, 120.80]]]);
        $geometry = [[14.90, 120.70], [14.85, 120.75], [14.80, 120.80]];

        $this->actingAs($admin, 'sanctum')
            ->putJson("/api/v1/admin/routes/{$route->id}/geometry", [
                'geometry' => $geometry,
                'waypoints' => [$geometry[0], $geometry[2]],
            ])
            ->assertOk()
            ->assertJsonPath('data.status', 'ACTIVE')
            ->assertJsonPath('data.geometry.1.0', 14.85)
            ->assertJsonPath('data.waypoints', [$geometry[0], $geometry[2]]);

        // Live immediately, and nothing about the previous line is kept.
        $this->getJson("/api/v1/routes/active?route_id={$route->id}")
            ->assertOk()
            ->assertJsonPath('data.coordinates.1.0', 14.85);
        $this->assertFalse(Schema::hasTable('route_versions'));
        $this->assertDatabaseHas('activity_logs', ['description' => "Updated the route line of {$route->name}"]);

        $this->actingAs($admin, 'sanctum')
            ->putJson("/api/v1/admin/routes/{$route->id}/geometry", ['geometry' => [[14.90, 120.70]], 'waypoints' => []])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['geometry', 'waypoints']);
    }

    public function test_route_still_used_by_a_vehicle_cannot_be_deleted(): void
    {
        $admin = User::factory()->admin()->create();
        $route = Route::factory()->create();
        \App\Models\Vehicle::factory()->create(['route_id' => $route->id]);

        $this->actingAs($admin, 'sanctum')
            ->deleteJson("/api/v1/admin/routes/{$route->id}")
            ->assertStatus(409)
            ->assertJsonPath('message', 'Move assigned vehicles and Fare Points before deleting this route.');

        $this->assertDatabaseHas('routes', ['id' => $route->id]);
    }

    public function test_fare_point_change_keeps_the_live_route_line(): void
    {
        $admin = User::factory()->admin()->create();
        $line = [[14.90, 120.70], [14.80, 120.80]];
        $route = Route::factory()->create(['status' => 'ACTIVE', 'geometry' => $line]);

        $this->actingAs($admin, 'sanctum')
            ->postJson('/api/v1/admin/fare-points', [
                'route_id' => $route->id,
                'point_number' => 1,
                'code' => 'P01',
                'name' => 'New Point Area',
                'regular_fare' => 18,
                'discounted_fare' => 14.4,
                'latitude' => 14.85,
                'longitude' => 120.75,
            ])
            ->assertCreated();

        $this->assertSame($line, $route->fresh()->geometry);
        $this->getJson("/api/v1/routes/active?route_id={$route->id}")
            ->assertOk()
            ->assertJsonPath('data.coordinates', $line);
    }
}
