<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Models\User;
use App\Models\AdminProfile;
use App\Models\CommuterProfile;
use App\Models\ConductorProfile;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class PlaceholderEndpointsTest extends TestCase
{
    use RefreshDatabase;

    private string $adminToken;
    private string $commuterToken;
    private string $conductorToken;

    protected function setUp(): void
    {
        parent::setUp();

        $admin = User::create([
            'email'    => 'admin@test.com',
            'password' => Hash::make('password123'),
            'role'     => UserRole::ADMIN,
        ]);
        AdminProfile::create(['id' => $admin->id, 'first_name' => 'Admin', 'last_name' => 'Test']);
        $this->adminToken = $admin->createToken('test')->plainTextToken;

        $commuter = User::create([
            'email'    => 'commuter@test.com',
            'password' => Hash::make('password123'),
            'role'     => UserRole::COMMUTER,
        ]);
        CommuterProfile::create([
            'id'                  => $commuter->id,
            'first_name'          => 'Commuter',
            'surname'             => 'Test',
            'birthdate'           => '1995-01-01',
            'gender'              => 'Male',
            'email'               => 'commuter@test.com',
            'contact_number'      => '+639170000000',
            'commuter_type'       => 'Regular',
            'username'            => 'commuter_test',
            'language_preference' => 'en',
            'account_status'      => 'ACTIVE',
            'verified_at'         => now(),
        ]);
        $this->commuterToken = $commuter->createToken('test')->plainTextToken;

        $conductor = User::create([
            'email'    => 'conductor@test.com',
            'password' => Hash::make('password123'),
            'role'     => UserRole::CONDUCTOR,
        ]);
        ConductorProfile::create([
            'id'                 => $conductor->id,
            'first_name'         => 'Conductor',
            'last_name'          => 'Test',
            'birthday'           => '1990-01-01',
            'generated_username' => 'conductor_test',
            'generated_password' => Hash::make('password123'),
        ]);
        $this->conductorToken = $conductor->createToken('test')->plainTextToken;
    }

    private function assertNotImplementedResponse(string $method, string $uri, string $token): void
    {
        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->{$method}($uri);

        $response->assertStatus(501);
        $response->assertExactJson([
            'success' => false,
            'data'    => null,
            'message' => 'Not Implemented',
            'errors'  => null,
            'meta'    => null,
        ]);
    }

    // ── Commuter Endpoints (3) ───────────────────────────────────

    public function test_commuter_profile_returns_501(): void
    {
        $this->assertNotImplementedResponse('getJson', '/api/v1/commuter/profile', $this->commuterToken);
    }

    public function test_commuter_trips_returns_501(): void
    {
        $this->assertNotImplementedResponse('getJson', '/api/v1/commuter/trips', $this->commuterToken);
    }

    public function test_commuter_rewards_returns_501(): void
    {
        $this->assertNotImplementedResponse('getJson', '/api/v1/commuter/rewards', $this->commuterToken);
    }

    // ── Conductor Endpoints ──────────────────────────────────────
    // Sprint 2 implemented: /shift, /shifts/start, /remittances (POST),
    // /location, /capacity-status, /shift-logs, /profile, /units, /drivers.
    // Sprint 4 implemented /transactions + /earnings, so there are no
    // remaining conductor 501 stubs.

<<<<<<< HEAD
    // ── Admin Endpoints (7) ──────────────────────────────────────
=======
    // ── Admin Endpoints (4 remaining stubs) ─────────────────────
>>>>>>> 3f24a29af7577a3e326c94f31a3e69b34996692d

    public function test_admin_dashboard_returns_501(): void
    {
        $this->assertNotImplementedResponse('getJson', '/api/v1/admin/dashboard', $this->adminToken);
    }

    public function test_admin_users_returns_501(): void
    {
        $this->assertNotImplementedResponse('getJson', '/api/v1/admin/users', $this->adminToken);
    }

<<<<<<< HEAD
    public function test_admin_drivers_returns_501(): void
    {
        $this->assertNotImplementedResponse('getJson', '/api/v1/admin/drivers', $this->adminToken);
    }

    public function test_admin_vehicles_returns_501(): void
    {
        $this->assertNotImplementedResponse('getJson', '/api/v1/admin/vehicles', $this->adminToken);
    }

    public function test_admin_routes_returns_501(): void
    {
        $this->assertNotImplementedResponse('getJson', '/api/v1/admin/routes', $this->adminToken);
    }

    // Admin /transactions, /remittances, /shift-logs implemented in Sprint 4
    // (each returns real DB data, with eager-loading), so they are no longer
    // 501 stubs.
=======
    // Admin /drivers, /vehicles, /routes, /transactions, /shift-logs all
    // implemented (return real DB data). Admin /remittances implemented in
    // Sprint 4. Admin /vehicles POST/PUT/DELETE implemented for fleet CRUD.
>>>>>>> 3f24a29af7577a3e326c94f31a3e69b34996692d

    public function test_admin_announcements_returns_501(): void
    {
        $this->assertNotImplementedResponse('getJson', '/api/v1/admin/announcements', $this->adminToken);
    }

    public function test_admin_lost_items_returns_501(): void
    {
        $this->assertNotImplementedResponse('getJson', '/api/v1/admin/lost-items', $this->adminToken);
    }

    // ── Payment Endpoints ────────────────────────────────────────
    // Sprint 4 replaced the initiate/verify/history stubs with the real
    // fare/payment flow (conductor GCash initiate, commuter claim, status
    // polling, webhook), so there are no remaining payment 501 stubs.

    // ── QR Endpoints (3) ─────────────────────────────────────────

    public function test_qr_generate_returns_501(): void
    {
        $this->assertNotImplementedResponse('postJson', '/api/v1/qr/generate', $this->commuterToken);
    }

    public function test_qr_validate_returns_501(): void
    {
        $this->assertNotImplementedResponse('postJson', '/api/v1/qr/validate', $this->commuterToken);
    }

    public function test_qr_scan_returns_501(): void
    {
        $this->assertNotImplementedResponse('postJson', '/api/v1/qr/scan', $this->commuterToken);
    }

    // ── Total Count Verification ─────────────────────────────────

<<<<<<< HEAD
    public function test_total_placeholder_endpoints_is_13(): void
    {
        // 3 commuter + 7 admin + 3 QR = 13
        // Wallet/topup stubs removed (wallet is permanently eliminated).
        // Sprint 2 implemented the conductor endpoints; Sprint 4 implemented
        // the conductor /transactions, the payment initiate/verify/history
        // endpoints, and the admin /transactions + /remittances + /shift-logs
        // endpoints, so those are no longer 501 stubs.
        $this->assertEquals(13, 3 + 7 + 3);
=======
    public function test_total_placeholder_endpoints_is_10(): void
    {
        // 3 commuter + 4 admin + 3 QR = 10
        // Wallet/topup stubs removed (wallet is permanently eliminated).
        // Sprint 2 implemented the conductor endpoints; Sprint 4 implemented
        // the conductor /transactions + the payment initiate/verify/history
        // endpoints + the admin /remittances endpoint.
        // Sprint 5 implemented admin /drivers, /vehicles, /routes,
        // /transactions, /shift-logs (all return real DB data now),
        // plus admin vehicle CRUD (POST/PUT/DELETE /vehicles).
        $this->assertEquals(10, 3 + 4 + 3);
>>>>>>> 3f24a29af7577a3e326c94f31a3e69b34996692d
    }
}
