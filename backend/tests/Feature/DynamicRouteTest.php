<?php

namespace Tests\Feature;

use App\Models\Route;
use App\Models\RouteVersion;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DynamicRouteTest extends TestCase
{
    use RefreshDatabase;

    public function test_public_endpoint_returns_current_published_geometry(): void
    {
        $route = Route::factory()->create(['name' => 'Published Corridor']);
        RouteVersion::create([
            'route_id' => $route->id,
            'version' => 1,
            'status' => RouteVersion::STATUS_PUBLISHED,
            'geometry' => [[14.90, 120.70], [14.80, 120.80]],
            'waypoints' => [[14.90, 120.70], [14.80, 120.80]],
            'effective_from' => now()->subMinute(),
            'published_at' => now()->subMinute(),
        ]);

        $this->getJson('/api/v1/routes/active')
            ->assertOk()
            ->assertJsonPath('data.id', $route->id)
            ->assertJsonPath('data.version.number', 1)
            ->assertJsonPath('data.coordinates.1.1', 120.80);
    }

    public function test_admin_can_save_and_publish_a_new_route_version(): void
    {
        $admin = User::factory()->admin()->create();
        $route = Route::factory()->create();
        $geometry = [[14.90, 120.70], [14.85, 120.75], [14.80, 120.80]];

        $this->actingAs($admin, 'sanctum')
            ->putJson("/api/v1/admin/routes/{$route->id}/draft", [
                'geometry' => $geometry,
                'waypoints' => [$geometry[0], $geometry[2]],
                'notes' => 'Permanent reroute',
            ])
            ->assertOk()
            ->assertJsonPath('data.status', RouteVersion::STATUS_DRAFT);

        $this->actingAs($admin, 'sanctum')
            ->postJson("/api/v1/admin/routes/{$route->id}/publish", [
                'notes' => 'Approved permanent reroute',
            ])
            ->assertOk()
            ->assertJsonPath('data.status', RouteVersion::STATUS_PUBLISHED)
            ->assertJsonPath('data.is_temporary', false);

        $this->getJson("/api/v1/routes/active?route_id={$route->id}")
            ->assertOk()
            ->assertJsonPath('data.coordinates.1.0', 14.85);
    }

    public function test_detour_ending_before_it_starts_is_refused_with_a_clear_message(): void
    {
        $admin = User::factory()->admin()->create();
        $route = Route::factory()->create();

        $this->actingAs($admin, 'sanctum')
            ->postJson("/api/v1/admin/routes/{$route->id}/publish", [
                'effective_from' => now()->addDays(2)->toIso8601String(),
                'effective_until' => now()->addDay()->toIso8601String(),
            ])
            ->assertStatus(422)
            ->assertJsonPath('errors.effective_until.0', 'The detour expiration must be after its start time.');

        // No explicit start means the detour starts now, so an expiration in
        // the past is the same mistake and gets the same message.
        $this->actingAs($admin, 'sanctum')
            ->postJson("/api/v1/admin/routes/{$route->id}/publish", [
                'effective_until' => now()->subHour()->toIso8601String(),
            ])
            ->assertStatus(422)
            ->assertJsonPath('errors.effective_until', ['The detour expiration must be after its start time.']);
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

    public function test_expired_temporary_detour_falls_back_to_previous_version(): void
    {
        $route = Route::factory()->create();
        RouteVersion::create([
            'route_id' => $route->id,
            'version' => 1,
            'status' => RouteVersion::STATUS_PUBLISHED,
            'geometry' => [[14.90, 120.70], [14.80, 120.80]],
            'effective_from' => now()->subDays(2),
            'published_at' => now()->subDays(2),
        ]);
        RouteVersion::create([
            'route_id' => $route->id,
            'version' => 2,
            'status' => RouteVersion::STATUS_PUBLISHED,
            'geometry' => [[14.90, 120.70], [14.95, 120.90]],
            'effective_from' => now()->subHours(2),
            'effective_until' => now()->subHour(),
            'published_at' => now()->subHours(2),
        ]);

        $this->getJson("/api/v1/routes/active?route_id={$route->id}")
            ->assertOk()
            ->assertJsonPath('data.version.number', 1)
            ->assertJsonPath('data.coordinates.1.1', 120.80);
    }

    public function test_fare_point_coordinate_change_creates_an_unpublished_route_draft(): void
    {
        $admin = User::factory()->admin()->create();
        $route = Route::factory()->create();
        RouteVersion::create([
            'route_id' => $route->id,
            'version' => 1,
            'status' => RouteVersion::STATUS_PUBLISHED,
            'geometry' => [[14.90, 120.70], [14.80, 120.80]],
            'effective_from' => now()->subMinute(),
            'published_at' => now()->subMinute(),
        ]);

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

        $this->assertDatabaseHas('route_versions', [
            'route_id' => $route->id,
            'version' => 2,
            'status' => RouteVersion::STATUS_DRAFT,
            'geometry' => null,
        ]);

        $this->getJson("/api/v1/routes/active?route_id={$route->id}")
            ->assertOk()
            ->assertJsonPath('data.version.number', 1);
    }
}
