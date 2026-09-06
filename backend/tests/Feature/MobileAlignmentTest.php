<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Models\ConductorProfile;
use App\Models\Driver;
use App\Models\Remittance;
use App\Models\Route;
use App\Models\ShiftLog;
use App\Models\Transaction;
use App\Models\User;
use App\Models\Vehicle;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

/**
 * Sprint 8 (mobile alignment) — contract tests for the endpoints and
 * payload fixes consumed by the chatco-mobile Expo app:
 *
 *   1. GET  /system-status               (public liveness probe)
 *   2. POST /auth/login                  (latest login wins — token revocation)
 *   3. POST /conductor/break-status      (break toggle)
 *   4. GET  /routes/active               (polyline geometry from web data)
 *   5. POST /conductor/transactions      (group cash fare + idempotent replay)
 *   6. POST /conductor/remittances       (remitted_amount fallback)
 */
class MobileAlignmentTest extends TestCase
{
    use RefreshDatabase;

    private User $conductor;

    private string $authHeader;

    protected function setUp(): void
    {
        parent::setUp();

        $this->conductor = $this->seedConductor();
        $this->authHeader = $this->loginAndGetHeader();
    }

    // ────────────────────────────────────────────────────────────────
    // Helpers
    // ────────────────────────────────────────────────────────────────

    private function seedConductor(): User
    {
        $conductor = User::create([
            'email'    => 'conductor1@gmail.com',
            'password' => Hash::make('password123'),
            'role'     => UserRole::CONDUCTOR,
        ]);

        ConductorProfile::create([
            'id'                 => $conductor->id,
            'first_name'         => 'Juan',
            'last_name'          => 'Dela Cruz',
            'birthday'           => '1990-03-15',
            'generated_username' => 'conductor001',
            'generated_password' => Hash::make('password123'),
        ]);

        return $conductor;
    }

    private function loginAndGetHeader(): string
    {
        $response = $this->postJson('/api/v1/auth/login', [
            'login'    => 'conductor1@gmail.com',
            'password' => 'password123',
        ]);

        $response->assertOk();

        return 'Bearer '.$response->json('data.token');
    }

    private function seedActiveShift(string $shiftId = 'SH-20260906001'): ShiftLog
    {
        $route = Route::create([
            'name'      => 'W5 CTC — McArthur Highway',
            'status'    => 'ACTIVE',
            'waypoints' => [[14.9254, 120.7651], [14.8605, 120.8090], [14.7256, 120.9604]],
        ]);

        $vehicle = Vehicle::create([
            'unit_number'  => 'U-0001',
            'plate_number' => 'ABC-1234',
            'route_id'     => $route->id,
            'status'       => 'ACTIVE',
        ]);

        $driver = Driver::create([
            'first_name'     => 'Pedro',
            'last_name'      => 'Santos',
            'birthday'       => '1985-01-01',
            'contact'        => '+639170000000',
            'license_number' => 'LIC-0001',
            'hire_date'      => '2020-01-01',
            'vehicle_id'     => $vehicle->id,
            'status'         => 'ACTIVE',
        ]);

        return ShiftLog::create([
            'shift_id'       => $shiftId,
            'conductor_id'   => $this->conductor->id,
            'conductor_name' => 'Juan Dela Cruz',
            'driver_id'      => $driver->id,
            'driver_name'    => 'Pedro Santos',
            'vehicle_id'     => $vehicle->id,
            'unit_number'    => $vehicle->unit_number,
            'plate_number'   => $vehicle->plate_number,
            'route_id'       => $route->id,
            'time_in'        => now(),
            'is_active'      => true,
            'status'         => 'ACTIVE',
        ]);
    }

    // ────────────────────────────────────────────────────────────────
    // 1. GET /system-status
    // ────────────────────────────────────────────────────────────────

    public function test_system_status_is_public(): void
    {
        $this->getJson('/api/v1/system-status')
            ->assertOk()
            ->assertJsonPath('data.status', 'ok');
    }

    // ────────────────────────────────────────────────────────────────
    // 2. POST /auth/login — latest login wins
    // ────────────────────────────────────────────────────────────────

    public function test_latest_login_revokes_previous_token(): void
    {
        // The token minted in setUp() represents device A's session.
        $this->withHeader('Authorization', $this->authHeader)
            ->getJson('/api/v1/user')
            ->assertOk();

        // Device B logs in — device A must be signed out automatically.
        $secondLogin = $this->postJson('/api/v1/auth/login', [
            'login'    => 'conductor1@gmail.com',
            'password' => 'password123',
        ])->assertOk();

        $secondHeader = 'Bearer '.$secondLogin->json('data.token');

        $this->withHeader('Authorization', $this->authHeader)
            ->getJson('/api/v1/user')
            ->assertUnauthorized();

        $this->withHeader('Authorization', $secondHeader)
            ->getJson('/api/v1/user')
            ->assertOk();
    }

    // ────────────────────────────────────────────────────────────────
    // 3. POST /conductor/break-status
    // ────────────────────────────────────────────────────────────────

    public function test_break_status_requires_an_active_shift(): void
    {
        $this->withHeader('Authorization', $this->authHeader)
            ->postJson('/api/v1/conductor/break-status', ['is_on_break' => true])
            ->assertStatus(422);
    }

    public function test_break_status_toggles_on_and_off(): void
    {
        $this->seedActiveShift();

        // Break ON
        $this->withHeader('Authorization', $this->authHeader)
            ->postJson('/api/v1/conductor/break-status', ['is_on_break' => true])
            ->assertOk()
            ->assertJsonPath('data.is_on_break', true);

        $this->assertNotNull(
            ShiftLog::where('conductor_id', $this->conductor->id)->first()->break_started_at
        );

        // Break OFF
        $this->withHeader('Authorization', $this->authHeader)
            ->postJson('/api/v1/conductor/break-status', ['is_on_break' => false])
            ->assertOk()
            ->assertJsonPath('data.is_on_break', false);

        $this->assertNull(
            ShiftLog::where('conductor_id', $this->conductor->id)->first()->break_started_at
        );
    }

    // ────────────────────────────────────────────────────────────────
    // 4. GET /routes/active
    // ────────────────────────────────────────────────────────────────

    public function test_active_route_returns_polyline_coordinates(): void
    {
        $this->seedActiveShift();

        $response = $this->withHeader('Authorization', $this->authHeader)
            ->getJson('/api/v1/routes/active')
            ->assertOk();

        $response->assertJsonPath('data.name', 'W5 CTC — McArthur Highway');
        $this->assertCount(3, $response->json('data.coordinates'));
        $this->assertSame([14.9254, 120.7651], $response->json('data.coordinates.0'));
    }

    public function test_active_route_normalizes_seeder_style_waypoints(): void
    {
        Route::create([
            'name'      => 'Object-style waypoints',
            'status'    => 'ACTIVE',
            'waypoints' => [
                ['lat' => 14.1, 'lng' => 120.1, 'name' => 'A'],
                ['lat' => 14.2, 'lng' => 120.2, 'name' => 'B'],
            ],
        ]);

        $response = $this->withHeader('Authorization', $this->authHeader)
            ->getJson('/api/v1/routes/active')
            ->assertOk();

        $this->assertSame([[14.1, 120.1], [14.2, 120.2]], $response->json('data.coordinates'));
    }

    // ────────────────────────────────────────────────────────────────
    // 5. POST /conductor/transactions — group cash fare
    // ────────────────────────────────────────────────────────────────

    private function groupPayload(string $idempotencyKey): array
    {
        return [
            'shift_id'        => 'SH-20260906001',
            'payment_method'  => 'CASH',
            'final_amount'    => 42.0,
            'pickup_name'     => 'Calumpit Crossing',
            'dropoff_name'    => 'Meycauayan Poblacion',
            'idempotency_key' => $idempotencyKey,
            'group_passengers' => [
                ['type' => 'REGULAR', 'quantity' => 2, 'final_amount' => 15.0],
                ['type' => 'SENIOR_CITIZEN', 'quantity' => 1, 'final_amount' => 12.0],
            ],
        ];
    }

    public function test_group_cash_creates_one_transaction_per_passenger(): void
    {
        $this->seedActiveShift();

        $response = $this->withHeader('Authorization', $this->authHeader)
            ->postJson('/api/v1/conductor/transactions', $this->groupPayload('idem-group-1'))
            ->assertCreated();

        $this->assertNotNull($response->json('data.group_id'));
        $this->assertNotNull($response->json('data.multiple_payment_reference'));
        $this->assertCount(3, $response->json('data.transactions'));

        $rows = Transaction::where('shift_id', 'SH-20260906001')->orderBy('group_position')->get();

        $this->assertCount(3, $rows);
        $this->assertSame(3, (int) $rows->first()->total_passengers);
        $this->assertSame(1, $rows->pluck('group_id')->unique()->count());
        $this->assertSame([1, 2, 3], $rows->pluck('group_position')->all());
        $this->assertSame([15.0, 15.0, 12.0], $rows->pluck('final_amount')->all());
        $this->assertSame(['REGULAR', 'REGULAR', 'SENIOR_CITIZEN'], $rows->pluck('passenger_role')->all());

        // Idempotency key stored on the first row only.
        $this->assertSame('idem-group-1', $rows->first()->idempotency_key);
        $this->assertNull($rows->last()->idempotency_key);
    }

    public function test_group_cash_replay_returns_the_same_group_without_duplicates(): void
    {
        $this->seedActiveShift();

        $first = $this->withHeader('Authorization', $this->authHeader)
            ->postJson('/api/v1/conductor/transactions', $this->groupPayload('idem-group-2'))
            ->assertCreated();

        $replay = $this->withHeader('Authorization', $this->authHeader)
            ->postJson('/api/v1/conductor/transactions', $this->groupPayload('idem-group-2'))
            ->assertCreated();

        $this->assertSame($first->json('data.group_id'), $replay->json('data.group_id'));
        $this->assertSame(
            $first->json('data.multiple_payment_reference'),
            $replay->json('data.multiple_payment_reference'),
        );
        $this->assertCount(3, $replay->json('data.transactions'));
        $this->assertSame(3, Transaction::where('shift_id', 'SH-20260906001')->count());
    }

    public function test_single_cash_still_requires_final_amount(): void
    {
        $this->seedActiveShift();

        $this->withHeader('Authorization', $this->authHeader)
            ->postJson('/api/v1/conductor/transactions', [
                'shift_id'       => 'SH-20260906001',
                'payment_method' => 'CASH',
                'pickup_name'    => 'A',
                'dropoff_name'   => 'B',
            ])
            ->assertStatus(422);
    }

    // ────────────────────────────────────────────────────────────────
    // 6. POST /conductor/remittances — remitted_amount fallback
    // ────────────────────────────────────────────────────────────────

    public function test_remittance_without_remitted_amount_falls_back_to_total_collected(): void
    {
        $this->seedActiveShift();

        $this->withHeader('Authorization', $this->authHeader)
            ->postJson('/api/v1/conductor/remittances', [
                'shift_id'        => 'SH-20260906001',
                'total_collected' => 100.0,
            ])
            ->assertOk();

        $remittance = Remittance::where('shift_id', 'SH-20260906001')->first();

        $this->assertNotNull($remittance);
        $this->assertSame(100.0, (float) $remittance->remitted_amount);
        $this->assertSame(0.0, (float) $remittance->shortage);
        $this->assertSame('COMPLETE', $remittance->remittance_status);
    }
}
