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

    public function test_route_upgrade_copies_only_the_effective_live_line(): void
    {
        $route = Route::factory()->create(['geometry' => null]);
        $migration = require database_path('migrations/2026_11_04_000001_move_route_geometry_to_routes_and_drop_route_versions.php');
        $migration->down();
        $line = [[14.90, 120.70], [14.80, 120.80]];
        foreach ([
            [1, 'PUBLISHED', now()->subDay(), $line],
            [2, 'PUBLISHED', now()->addDay(), [[15, 121], [15.1, 121.1]]],
            [3, 'DRAFT', null, [[16, 122], [16.1, 122.1]]],
        ] as [$version, $status, $effective, $geometry]) {
            \Illuminate\Support\Facades\DB::table('route_versions')->insert([
                'id' => (string) \Illuminate\Support\Str::uuid(), 'route_id' => $route->id,
                'version' => $version, 'status' => $status, 'geometry' => json_encode($geometry),
                'effective_from' => $effective, 'published_at' => now()->subHour(),
            ]);
        }
        $migration->up();
        $this->assertSame($line, $route->fresh()->geometry);
        $this->assertFalse(Schema::hasTable('route_versions'));
    }

    public function test_fare_upgrade_keeps_stop_identity_and_reprices_from_rules(): void
    {
        $route = Route::factory()->create();
        foreach ([5, 10] as $number) {
            \App\Models\FarePoint::create(['route_id' => $route->id, 'point_number' => $number,
                'code' => 'P'.$number, 'name' => 'Point '.$number, 'regular_fare' => 99, 'discounted_fare' => 88]);
        }
        $ids = \App\Models\FarePoint::where('route_id', $route->id)->orderBy('point_number')->pluck('id')->all();
        $migration = require database_path('migrations/2026_11_04_000002_derive_fare_point_fares_from_financial_rules.php');
        $migration->up();
        $points = \App\Models\FarePoint::where('route_id', $route->id)->orderBy('point_number')->get();
        $this->assertSame($ids, $points->pluck('id')->all());
        $this->assertSame([1, 2], $points->pluck('point_number')->all());
        $this->assertEquals([17, 17], $points->pluck('regular_fare')->all());
        $this->assertEquals([13.6, 13.6], $points->pluck('discounted_fare')->all());
    }

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
