<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Route;
use Tests\TestCase;

class AdminMonitoringRateLimitTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Cache::flush();
    }

    public function test_normal_monitoring_polling_leaves_room_for_navigation(): void
    {
        $this->actingAs(User::factory()->admin()->create());
        $feeds = [
            '/api/v1/admin/monitoring',
            '/api/v1/admin/monitoring/overspeed',
            '/api/v1/admin/monitoring/demand-zones',
            '/api/v1/admin/sos?status=ACTIVE',
            '/api/v1/admin/sos?status=RESOLVED',
        ];

        // Two tabs polling for a minute, plus navigating to another module.
        for ($poll = 0; $poll < 24; $poll++) {
            foreach ($feeds as $feed) {
                $this->getJson($feed)->assertOk();
            }
            $this->getJson('/api/v1/admin/users')->assertOk();
        }
        foreach ($feeds as $feed) {
            $this->getJson($feed)->assertOk();
        }
    }

    public function test_monitoring_limit_is_bounded_per_admin_and_recovers(): void
    {
        $admin = User::factory()->admin()->create();
        $this->actingAs($admin);
        for ($attempt = 0; $attempt < 180; $attempt++) {
            $this->getJson('/api/v1/admin/monitoring')->assertOk();
        }
        $this->getJson('/api/v1/admin/monitoring')->assertStatus(429)
            ->assertJsonPath('message', 'Too many requests. Please slow down.');
        $this->getJson('/api/v1/admin/users')->assertOk();
        $this->getJson('/api/v1/admin/sos?status=ACTIVE')->assertStatus(429);

        $this->actingAs(User::factory()->admin()->create());
        $this->getJson('/api/v1/admin/monitoring')->assertOk();

        $this->travel(61)->seconds();
        $this->actingAs($admin);
        $this->getJson('/api/v1/admin/monitoring')->assertOk();
    }

    public function test_monitoring_reads_keep_their_authentication_and_mutation_limits(): void
    {
        $this->getJson('/api/v1/admin/monitoring')->assertUnauthorized();
        $this->actingAs(User::factory()->conductor()->create());
        $this->getJson('/api/v1/admin/monitoring')->assertForbidden();

        foreach (['acknowledge', 'resolve'] as $action) {
            $middleware = Route::getRoutes()->match(
                Request::create('/api/v1/admin/sos/alert-id/'.$action, 'PATCH'),
            )->gatherMiddleware();
            $this->assertContains('throttle:admin-write', $middleware);
        }
    }
}
