<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Models\CommuterProfile;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class MobileCommuterIsolationTest extends TestCase
{
    use RefreshDatabase;

    private User $commuter;
    private User $conductor;

    protected function setUp(): void
    {
        parent::setUp();

        $this->commuter = User::create([
            'email' => 'commuter_mobile@example.com',
            'password' => Hash::make('password123'),
            'role' => UserRole::COMMUTER,
        ]);

        CommuterProfile::create([
            'id' => $this->commuter->id,
            'first_name' => 'Maria',
            'surname' => 'Santos',
            'birthdate' => '1995-03-15',
            'gender' => 'Female',
            'email' => 'commuter_mobile@example.com',
            'contact_number' => '+639181234567',
            'commuter_type' => 'Regular',
            'username' => 'mariasantos',
            'language_preference' => 'en',
            'account_status' => 'ACTIVE',
            'verified_at' => now(),
        ]);

        $this->conductor = User::create([
            'email' => 'conductor_mobile@example.com',
            'password' => Hash::make('password123'),
            'role' => UserRole::CONDUCTOR,
        ]);
    }

    public function test_mobile_commuter_routes_require_authentication(): void
    {
        $this->getJson('/api/v1/mobile/commuter/profile')->assertUnauthorized();
        $this->getJson('/api/v1/mobile/commuter/trips')->assertUnauthorized();
        $this->getJson('/api/v1/mobile/commuter/rewards')->assertUnauthorized();
    }

    public function test_mobile_commuter_routes_reject_non_commuter_roles(): void
    {
        Sanctum::actingAs($this->conductor);

        $this->getJson('/api/v1/mobile/commuter/profile')->assertForbidden();
        $this->getJson('/api/v1/mobile/commuter/trips')->assertForbidden();
        $this->getJson('/api/v1/mobile/commuter/rewards')->assertForbidden();
    }

    public function test_mobile_commuter_routes_allow_authenticated_commuter(): void
    {
        Sanctum::actingAs($this->commuter);

        $res = $this->getJson('/api/v1/mobile/commuter/profile')->assertOk();
        $this->assertSame('Maria', $res->json('data.profile.first_name'));

        $this->getJson('/api/v1/mobile/commuter/trips')->assertOk();
        $this->getJson('/api/v1/mobile/commuter/rewards')->assertOk();
        $this->getJson('/api/v1/mobile/commuter/watchlist')->assertOk();
        $this->getJson('/api/v1/mobile/commuter/claims')->assertOk();
        $this->getJson('/api/v1/mobile/commuter/announcements')->assertOk();
    }

    public function test_legacy_web_commuter_routes_remain_intact(): void
    {
        Sanctum::actingAs($this->commuter);

        $res = $this->getJson('/api/v1/commuter/profile')->assertOk();
        $this->assertSame('Maria', $res->json('data.profile.first_name'));
        $this->getJson('/api/v1/commuter/trips')->assertOk();
        $this->getJson('/api/v1/commuter/rewards')->assertOk();
    }
}
