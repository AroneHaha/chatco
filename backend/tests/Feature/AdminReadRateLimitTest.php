<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Route;
use Tests\TestCase;

class AdminReadRateLimitTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Cache::flush();
    }

    public function test_rapid_filter_changes_do_not_trip_the_admin_read_limit(): void
    {
        $this->actingAs(User::factory()->admin()->create());
        $filters = ['', '?status=CLOSED', '?status=CLAIMED', '?status=APPROVED'];

        // Well past the old shared 60/min bucket: a burst of filter clicks
        // across two list pages within the same minute.
        for ($click = 0; $click < 30; $click++) {
            $this->getJson('/api/v1/admin/lost-items'.$filters[$click % 4])->assertOk();
            $this->getJson('/api/v1/admin/users?page='.($click % 3 + 1))->assertOk();
            $this->getJson('/api/v1/admin/lost-items/recent-claims')->assertOk();
        }
    }

    public function test_admin_read_limit_is_bounded_per_admin_and_recovers(): void
    {
        $admin = User::factory()->admin()->create();
        $this->actingAs($admin);
        for ($attempt = 0; $attempt < 240; $attempt++) {
            $this->getJson('/api/v1/admin/users')->assertOk();
        }
        $this->getJson('/api/v1/admin/users')->assertStatus(429)
            ->assertJsonPath('message', 'Too many requests. Please slow down.');
        $this->getJson('/api/v1/admin/lost-items')->assertStatus(429);
        // Monitoring polling keeps its own bucket.
        $this->getJson('/api/v1/admin/monitoring')->assertOk();

        $this->actingAs(User::factory()->admin()->create());
        $this->getJson('/api/v1/admin/users')->assertOk();

        $this->travel(61)->seconds();
        $this->actingAs($admin);
        $this->getJson('/api/v1/admin/users')->assertOk();
    }

    public function test_admin_reads_no_longer_share_the_conductor_read_bucket(): void
    {
        $adminReads = collect(Route::getRoutes()->getRoutes())->filter(
            fn ($route) => str_starts_with($route->uri(), 'api/v1/admin/') && in_array('GET', $route->methods(), true),
        );

        $this->assertNotEmpty($adminReads);
        foreach ($adminReads as $route) {
            $this->assertNotContains('throttle:conductor-read', $route->gatherMiddleware(), $route->uri());
        }
    }
}
