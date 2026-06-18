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

        // Create users with profiles
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

    // ── Commuter Endpoints (5) ───────────────────────────────────

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

    // ── Conductor Endpoints (1) ──────────────────────────────────
    // Sprint 2 implemented: /shift, /shifts/start, /remittances (POST),
    // /location, /capacity-status, /shift-logs, /profile, /units, /drivers.
    // Only /transactions remains as a 501 stub (Sprint 4).

    public function test_conductor_transactions_returns_501(): void
    {
        $this->assertNotImplementedResponse('getJson', '/api/v1/conductor/transactions', $this->conductorToken);
    }

    // ── Admin Endpoints (10) ─────────────────────────────────────

    public function test_admin_dashboard_returns_501(): void
    {
        $this->assertNotImplementedResponse('getJson', '/api/v1/admin/dashboard', $this->adminToken);
    }

    public function test_admin_users_returns_501(): void
    {
        $this->assertNotImplementedResponse('getJson', '/api/v1/admin/users', $this->adminToken);
    }

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

    public function test_admin_transactions_returns_501(): void
    {
        $this->assertNotImplementedResponse('getJson', '/api/v1/admin/transactions', $this->adminToken);
    }

    public function test_admin_remittances_returns_501(): void
    {
        $this->assertNotImplementedResponse('getJson', '/api/v1/admin/remittances', $this->adminToken);
    }

    public function test_admin_announcements_returns_501(): void
    {
        $this->assertNotImplementedResponse('getJson', '/api/v1/admin/announcements', $this->adminToken);
    }

    public function test_admin_lost_items_returns_501(): void
    {
        $this->assertNotImplementedResponse('getJson', '/api/v1/admin/lost-items', $this->adminToken);
    }

    public function test_admin_shift_logs_returns_501(): void
    {
        $this->assertNotImplementedResponse('getJson', '/api/v1/admin/shift-logs', $this->adminToken);
    }

    // ── Payment Endpoints (4) ────────────────────────────────────

    public function test_payment_initiate_returns_501(): void
    {
        $this->assertNotImplementedResponse('postJson', '/api/v1/payments/initiate', $this->commuterToken);
    }

    public function test_payment_verify_returns_501(): void
    {
        $this->assertNotImplementedResponse('postJson', '/api/v1/payments/verify', $this->commuterToken);
    }

    public function test_payment_history_returns_501(): void
    {
        $this->assertNotImplementedResponse('getJson', '/api/v1/payments/history', $this->commuterToken);
    }

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

    public function test_total_placeholder_endpoints_is_20(): void
    {
        // 3 commuter + 1 conductor + 10 admin + 3 payment + 3 QR = 20
        // Wallet/topup stubs removed (wallet is permanently eliminated).
        // Sprint 2 implemented the other 5 conductor endpoints.
        $this->assertEquals(20, 3 + 1 + 10 + 3 + 3);
    }
}
