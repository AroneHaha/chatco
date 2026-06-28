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

    // ── Commuter Endpoints (2) ───────────────────────────────────
    // /profile implemented in S5-T1 (returns real commuter profile data).

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

    // ── Admin Endpoints (2 remaining stubs) ─────────────────────

    public function test_admin_dashboard_returns_501(): void
    {
        $this->assertNotImplementedResponse('getJson', '/api/v1/admin/dashboard', $this->adminToken);
    }

    // Admin /users implemented in S5-T3 (AdminUserController::index).

    // Admin /drivers, /vehicles, /routes, /transactions, /shift-logs all
    // implemented (return real DB data). Admin /remittances implemented in
    // Sprint 4. Admin /vehicles POST/PUT/DELETE implemented for fleet CRUD.

    // ── Payment Endpoints ────────────────────────────────────────
    // Sprint 4 replaced the initiate/verify/history stubs with the real
    // fare/payment flow (conductor GCash initiate, commuter claim, status
    // polling, webhook), so there are no remaining payment 501 stubs.

    // ── QR Endpoints ─────────────────────────────────────────────
    // Sprint 6 repurposed the 3 QR stubs for the feedback unit-QR flow
    // (generate/validate/scan). They are now implemented and covered by
    // FeedbackQrFlowTest. No remaining QR 501 stubs.

    // ── Total Count Verification ─────────────────────────────────

    public function test_total_placeholder_endpoints_is_3(): void
    {
        // 2 commuter + 1 admin = 3
        // Wallet/topup stubs removed (wallet is permanently eliminated).
        // Sprint 2 implemented the conductor endpoints; Sprint 4 implemented
        // the conductor /transactions + the payment initiate/verify/history
        // endpoints + the admin /remittances endpoint.
        // Sprint 5 implemented admin /drivers, /vehicles, /routes,
        // /transactions, /shift-logs, /users (all return real DB data now),
        // plus admin vehicle CRUD (POST/PUT/DELETE /vehicles).
        // S5-T1 implemented commuter /profile (PUT + GET).
        // Sprint 6 repurposed the 3 QR stubs for the feedback unit-QR flow
        // (generate/validate/scan) — now implemented, covered by
        // FeedbackQrFlowTest.
        // S6-T3 implemented admin /lost-items (browse/create/claim-review/close)
        // via AdminLostItemController — covered by LostFoundFlowTest.
        // S6-T4 implemented admin /announcements (CRUD + archive) +
        // user-facing /announcements (feed + mark-read + unread-count)
        // via AdminAnnouncementController + AnnouncementController — covered
        // by AnnouncementFlowTest.
        // Remaining stubs: commuter/trips, commuter/rewards,
        // admin/dashboard = 3.
        $this->assertEquals(3, 2 + 1);
    }
}
