<?php

namespace Tests\Feature;

use App\Enums\PaymentMethod;
use App\Enums\PaymentStatus;
use App\Enums\ShiftStatus;
use App\Enums\UserRole;
use App\Models\ConductorProfile;
use App\Models\Driver;
use App\Models\FarePoint;
use App\Models\Route;
use App\Models\ShiftLog;
use App\Models\Transaction;
use App\Models\User;
use App\Models\Vehicle;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class MobileWebTransactionIsolationTest extends TestCase
{
    use RefreshDatabase;

    private User $conductor;
    private Vehicle $vehicle;
    private Driver $driver;
    private Route $route;
    private ShiftLog $shift;
    private FarePoint $stop1;
    private FarePoint $stop2;

    public function test_mobile_payment_history_summary_is_not_limited_to_current_page(): void
    {
        $commuter = User::create(['email' => 'history@test.com', 'password' => bcrypt('password'), 'role' => UserRole::COMMUTER]);
        \App\Models\CommuterProfile::create([
            'id' => $commuter->id, 'first_name' => 'History', 'surname' => 'Reader', 'birthdate' => '1995-01-01',
            'gender' => 'Female', 'email' => $commuter->email, 'contact_number' => '09171234567',
            'commuter_type' => 'REGULAR', 'username' => 'historyreader', 'account_status' => 'ACTIVE', 'language_preference' => 'en',
        ]);
        foreach ([[20, 'PAID'], [30, 'PAID'], [99, 'FAILED']] as [$amount, $status]) {
            Transaction::create([
                'transaction_id' => 'TXN-'.strtoupper(Str::random(12)), 'shift_id' => $this->shift->shift_id,
                'passenger_id' => $commuter->id, 'payment_method' => 'CASH', 'final_amount' => $amount,
                'status' => $status, 'total_passengers' => 1,
                'pickup_stop_id' => $this->stop1->id, 'dropoff_stop_id' => $this->stop2->id,
            ]);
        }
        Sanctum::actingAs($commuter);
        $this->getJson('/api/v1/mobile/commuter/payments?per_page=1&page=2')->assertOk()
            ->assertJsonCount(1, 'data.data')->assertJsonPath('data.summary.ride_count', 2)
            ->assertJsonPath('data.summary.total_spent', 50)->assertJsonPath('data.summary.average_fare', 25);
    }

    public function test_payment_history_filters_by_single_date_or_date_range(): void
    {
        $commuter = User::create(['email' => 'range@test.com', 'password' => bcrypt('password'), 'role' => UserRole::COMMUTER]);
        \App\Models\CommuterProfile::create([
            'id' => $commuter->id, 'first_name' => 'Range', 'surname' => 'Reader', 'birthdate' => '1995-01-01',
            'gender' => 'Female', 'email' => $commuter->email, 'contact_number' => '09171234568',
            'commuter_type' => 'REGULAR', 'username' => 'rangereader', 'account_status' => 'ACTIVE', 'language_preference' => 'en',
        ]);
        foreach ([['2026-10-01 08:00:00', 15], ['2026-10-05 00:00:00', 20], ['2026-10-05 23:59:59', 25], ['2026-10-09 12:00:00', 30]] as [$at, $amount]) {
            $txn = Transaction::create([
                'transaction_id' => 'TXN-'.strtoupper(Str::random(12)), 'shift_id' => $this->shift->shift_id,
                'passenger_id' => $commuter->id, 'payment_method' => 'CASH', 'final_amount' => $amount,
                'status' => 'PAID', 'total_passengers' => 1,
                'pickup_stop_id' => $this->stop1->id, 'dropoff_stop_id' => $this->stop2->id,
            ]);
            $txn->created_at = $at;
            $txn->save();
        }
        Sanctum::actingAs($commuter);

        // One date (either end) = that whole day only.
        foreach (['date_from', 'date_to'] as $param) {
            $this->getJson("/api/v1/commuter/payments?{$param}=2026-10-05")->assertOk()
                ->assertJsonPath('data.total', 2)->assertJsonPath('data.summary.total_spent', 45);
        }

        // Both = inclusive range, and it overrides a preset filter.
        $this->getJson('/api/v1/commuter/payments?filter=today&date_from=2026-10-01&date_to=2026-10-05')->assertOk()
            ->assertJsonPath('data.total', 3)->assertJsonPath('data.summary.total_spent', 60);

        $this->getJson('/api/v1/commuter/payments?date_from=2026-10-09&date_to=2026-10-01')->assertStatus(422);
        $this->getJson('/api/v1/commuter/payments?date_from=10/05/2026')->assertStatus(422);
    }

    protected function setUp(): void
    {
        parent::setUp();

        $this->conductor = User::create([
            'email' => 'conductor_test@example.com',
            'password' => bcrypt('password'),
            'role' => UserRole::CONDUCTOR,
        ]);
        ConductorProfile::create([
            'id' => $this->conductor->id,
            'first_name' => 'Maria',
            'last_name' => 'Reyes',
            'birthday' => '1990-01-01',
            'contact_number' => '09171234567',
            'generated_username' => 'mreyes',
            'generated_password' => bcrypt('password'),
        ]);

        $this->vehicle = Vehicle::create([
            'unit_number' => '101',
            'plate_number' => 'ABC-1234',
            'status' => 'ACTIVE',
        ]);

        $this->driver = Driver::create([
            'first_name' => 'Pedro',
            'last_name' => 'Penduko',
            'birthday' => '1990-01-01',
            'contact' => '+639181234567',
            'license_number' => 'N01-12-123456',
            'hire_date' => '2023-01-01',
            'status' => 'ACTIVE',
        ]);

        $this->route = Route::create([
            'name' => 'Cubao - Antipolo',
            'origin' => 'Cubao',
            'destination' => 'Antipolo',
            'status' => 'ACTIVE',
            'is_active' => true,
            'waypoints' => [],
        ]);

        $this->stop1 = FarePoint::create([
            'route_id' => $this->route->id,
            'point_number' => 1,
            'code' => 'CUB',
            'name' => 'Cubao',
            'regular_fare' => 15,
            'discounted_fare' => 12,
        ]);

        $this->stop2 = FarePoint::create([
            'route_id' => $this->route->id,
            'point_number' => 2,
            'code' => 'ANT',
            'name' => 'Antipolo',
            'regular_fare' => 25,
            'discounted_fare' => 20,
        ]);

        $this->shift = ShiftLog::create([
            'shift_id' => 'SHF-TEST-PHASE2',
            'conductor_id' => $this->conductor->conductorProfile->id,
            'driver_id' => $this->driver->id,
            'vehicle_id' => $this->vehicle->id,
            'route_id' => $this->route->id,
            'conductor_name' => 'Maria Reyes',
            'driver_name' => 'Pedro Penduko',
            'unit_number' => '101',
            'plate_number' => 'ABC-1234',
            'status' => ShiftStatus::ACTIVE->value,
            'is_active' => true,
            'time_in' => now()->subHour(),
            'operating_device_id' => 'chatco_mobile_claimed_device_123',
            'operating_device_type' => 'MOBILE',
            'operating_device_claimed_at' => now()->subHour(),
        ]);
    }

    public function test_web_to_mobile_handoff_keeps_shift_data_and_ends_the_web_session(): void
    {
        $webLogin = $this->postJson('/api/v1/auth/login', [
            'login' => 'mreyes', 'password' => 'password',
            'device_id' => 'web-handoff-device-12345', 'device_type' => 'WEB',
        ])->assertOk();
        $webToken = $webLogin->json('data.token');
        $webTransaction = $this->withHeader('Authorization', 'Bearer '.$webToken)
            ->postJson('/api/v1/conductor/transactions', [
                'payment_method' => 'CASH', 'pickup_name' => 'Cubao', 'dropoff_name' => 'Antipolo',
                'idempotency_key' => 'web-handoff-cash-ticket',
                'device_id' => 'web-handoff-device-12345', 'device_type' => 'WEB',
            ])->assertCreated();

        $mobileLogin = $this->postJson('/api/v1/mobile/auth/login', [
            'login' => 'mreyes', 'password' => 'password',
            'device_id' => 'mobile-handoff-device-12345',
            // The mobile endpoint must establish MOBILE even if input says WEB.
            'device_type' => 'WEB',
        ])->assertOk();

        $this->assertSame(1, ShiftLog::where('conductor_id', $this->conductor->id)->active()->count());
        $this->assertSame('mobile-handoff-device-12345', $this->shift->fresh()->operating_device_id);
        $this->assertSame('MOBILE', $this->shift->fresh()->operating_device_type);
        $this->assertDatabaseCount('transactions', 1);
        $this->assertSame(1, $this->conductor->tokens()->count());
        $this->app['auth']->forgetGuards();
        $this->withHeader('Authorization', 'Bearer '.$webToken)
            ->getJson('/api/v1/user')->assertUnauthorized();

        $mobileToken = $mobileLogin->json('data.token');
        $this->app['auth']->forgetGuards();
        $retrievedTransactions = $this->withHeader('Authorization', 'Bearer '.$mobileToken)
            ->getJson('/api/v1/mobile/conductor/transactions?shift_id='.$this->shift->shift_id)
            ->assertOk()->json('data');
        $this->assertSame($webTransaction->json('data.transaction_id'), $retrievedTransactions[0]['transaction_id']);
        $mobile = $this->withHeader('Authorization', 'Bearer '.$mobileToken)
            ->getJson('/api/v1/mobile/conductor/shift')->assertOk()->json('data');
        $web = $this->withHeader('Authorization', 'Bearer '.$mobileToken)
            ->getJson('/api/v1/conductor/shift')->assertOk()->json('data');
        $this->assertSame($web, $mobile);
        $this->postJson('/api/v1/mobile/conductor/shifts/start', [
            'vehicle_id' => $this->vehicle->id, 'driver_id' => $this->driver->id,
            'device_id' => 'mobile-handoff-device-12345', 'device_type' => 'MOBILE',
        ])->assertStatus(409);
    }

    public function test_mobile_to_web_handoff_preserves_cash_and_ends_mobile_session(): void
    {
        $mobileLogin = $this->postJson('/api/v1/mobile/auth/login', [
            'login' => 'mreyes', 'password' => 'password',
            'device_id' => 'mobile-handoff-device-12345',
        ])->assertOk();
        $mobileToken = $mobileLogin->json('data.token');

        $transaction = $this->withHeader('Authorization', 'Bearer '.$mobileToken)
            ->postJson('/api/v1/mobile/conductor/transactions', [
            'payment_method' => 'CASH', 'pickup_name' => 'Cubao', 'dropoff_name' => 'Antipolo',
            'idempotency_key' => 'handoff-cash-ticket',
            'device_id' => 'mobile-handoff-device-12345', 'device_type' => 'MOBILE',
        ])->assertCreated();

        $webLogin = $this->postJson('/api/v1/auth/login', [
            'login' => 'mreyes', 'password' => 'password',
            'device_id' => 'web-handoff-device-12345', 'device_type' => 'WEB',
        ])->assertOk();
        $webToken = $webLogin->json('data.token');

        $this->assertSame('web-handoff-device-12345', $this->shift->fresh()->operating_device_id);
        $this->assertDatabaseCount('transactions', 1);
        $this->assertDatabaseHas('transactions', ['shift_id' => $this->shift->shift_id, 'idempotency_key' => 'handoff-cash-ticket']);
        $this->app['auth']->forgetGuards();
        $this->withHeader('Authorization', 'Bearer '.$mobileToken)
            ->getJson('/api/v1/user')->assertUnauthorized();
        $this->app['auth']->forgetGuards();
        $retrievedTransactions = $this->withHeader('Authorization', 'Bearer '.$webToken)
            ->getJson('/api/v1/conductor/transactions?shift_id='.$this->shift->shift_id)
            ->assertOk()->json('data');
        $this->assertSame($transaction->json('data.transaction_id'), $retrievedTransactions[0]['transaction_id']);
        $this->withHeader('Authorization', 'Bearer '.$webToken)->postJson('/api/v1/conductor/break-status', [
            'is_on_break' => true, 'device_id' => 'mobile-handoff-device-12345', 'device_type' => 'MOBILE',
        ])->assertStatus(409);
        $this->withHeader('Authorization', 'Bearer '.$webToken)->postJson('/api/v1/conductor/break-status', [
            'is_on_break' => true, 'device_id' => 'web-handoff-device-12345', 'device_type' => 'WEB',
        ])->assertOk();
    }

    public function test_mobile_payment_status_preserves_web_payload_and_ownership(): void
    {
        Sanctum::actingAs($this->conductor);
        $response = $this->postJson('/api/v1/mobile/conductor/transactions', [
            'payment_method' => 'CASH', 'pickup_name' => 'Cubao', 'dropoff_name' => 'Antipolo',
            'device_id' => 'chatco_mobile_claimed_device_123', 'device_type' => 'MOBILE',
        ])->assertCreated();
        $id = $response->json('data.transaction_id');
        $web = $this->getJson("/api/v1/payments/{$id}/status")->assertOk()->json('data');
        $mobile = $this->getJson("/api/v1/mobile/payments/{$id}/status")->assertOk()->json('data');
        $this->assertSame($web, $mobile);

        $other = User::create(['email' => 'other-mobile@example.com', 'password' => bcrypt('password'), 'role' => UserRole::CONDUCTOR]);
        Sanctum::actingAs($other);
        $this->getJson("/api/v1/mobile/payments/{$id}/status")->assertForbidden();
        $this->postJson("/api/v1/mobile/payments/{$id}/cancel")->assertForbidden();
    }

    public function test_mobile_simulation_keeps_existing_configuration_guard(): void
    {
        config(['payments.allow_simulation' => false]);
        Sanctum::actingAs($this->conductor);
        $this->postJson('/api/v1/mobile/payments/unknown/simulate', ['status' => 'PAID'])->assertForbidden();
    }

    public function test_web_conductor_can_record_cash_fare_when_mobile_device_claimed_on_shift(): void
    {
        Sanctum::actingAs($this->conductor);

        // Web conductor hits /api/v1/conductor/transactions without mobile device ID
        $response = $this->postJson('/api/v1/conductor/transactions', [
            'payment_method' => 'CASH',
            'pickup_name' => 'Cubao',
            'dropoff_name' => 'Antipolo',
            'pickup_stop_id' => $this->stop1->id,
            'dropoff_stop_id' => $this->stop2->id,
            'final_amount' => 15.00,
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('data.payment_method', PaymentMethod::CASH->value)
            ->assertJsonPath('data.status', PaymentStatus::PAID->value);

        $this->assertDatabaseHas('transactions', [
            'shift_id' => $this->shift->shift_id,
            'payment_method' => PaymentMethod::CASH->value,
            'status' => PaymentStatus::PAID->value,
        ]);
    }

    public function test_mobile_conductor_can_record_cash_with_offline_metadata(): void
    {
        Sanctum::actingAs($this->conductor);

        $offlineTimestamp = now()->subMinutes(10)->toISOString();
        $response = $this->postJson('/api/v1/mobile/conductor/transactions', [
            'shift_id' => $this->shift->shift_id,
            'payment_method' => 'CASH',
            'pickup_name' => 'Cubao',
            'dropoff_name' => 'Antipolo',
            'pickup_stop_id' => $this->stop1->id,
            'dropoff_stop_id' => $this->stop2->id,
            'final_amount' => 15.00,
            'idempotency_key' => 'idemp-mobile-single-1',
            'device_id' => 'chatco_mobile_claimed_device_123',
            'device_type' => 'MOBILE',
            'offline_created_at' => $offlineTimestamp,
        ]);

        $response->assertStatus(201);
        $this->assertDatabaseHas('transactions', [
            'shift_id' => $this->shift->shift_id,
            'idempotency_key' => 'idemp-mobile-single-1',
            'source_device_id' => 'chatco_mobile_claimed_device_123',
        ]);
    }

    public function test_mobile_conductor_batch_sync_processes_queued_tickets(): void
    {
        Sanctum::actingAs($this->conductor);

        $offlineTime = now()->subMinutes(5)->toISOString();
        $batch = [
            'transactions' => [
                [
                    'shift_id' => $this->shift->shift_id,
                    'payment_method' => 'CASH',
                    'pickup_name' => 'Cubao',
                    'dropoff_name' => 'Antipolo',
                    'idempotency_key' => 'batch-item-1',
                    'device_id' => 'chatco_mobile_claimed_device_123',
                    'device_type' => 'MOBILE',
                    'offline_created_at' => $offlineTime,
                    'final_amount' => 15.00,
                ],
                [
                    'shift_id' => $this->shift->shift_id,
                    'payment_method' => 'CASH',
                    'pickup_name' => 'Cubao',
                    'dropoff_name' => 'Antipolo',
                    'idempotency_key' => 'batch-item-2',
                    'device_id' => 'chatco_mobile_claimed_device_123',
                    'device_type' => 'MOBILE',
                    'offline_created_at' => $offlineTime,
                    'final_amount' => 15.00,
                ],
            ],
        ];

        $response = $this->postJson('/api/v1/mobile/conductor/transactions/sync', $batch);

        $response->assertStatus(200)
            ->assertJsonPath('data.synced_count', 2)
            ->assertJsonPath('data.failed_count', 0);

        $this->assertDatabaseHas('transactions', ['idempotency_key' => 'batch-item-1']);
        $this->assertDatabaseHas('transactions', ['idempotency_key' => 'batch-item-2']);
    }

    public function test_mobile_batch_sync_is_idempotent(): void
    {
        Sanctum::actingAs($this->conductor);

        $offlineTime = now()->subMinutes(5)->toISOString();
        $batch = [
            'transactions' => [
                [
                    'shift_id' => $this->shift->shift_id,
                    'payment_method' => 'CASH',
                    'pickup_name' => 'Cubao',
                    'dropoff_name' => 'Antipolo',
                    'idempotency_key' => 'batch-idemp-1',
                    'device_id' => 'chatco_mobile_claimed_device_123',
                    'device_type' => 'MOBILE',
                    'offline_created_at' => $offlineTime,
                    'final_amount' => 15.00,
                ],
            ],
        ];

        // Send first time
        $res1 = $this->postJson('/api/v1/mobile/conductor/transactions/sync', $batch);
        $res1->assertStatus(200)->assertJsonPath('data.synced_count', 1);

        // Send second time (simulating network retry)
        $res2 = $this->postJson('/api/v1/mobile/conductor/transactions/sync', $batch);
        $res2->assertStatus(200)->assertJsonPath('data.synced_count', 1);

        // Verify only 1 row exists in database
        $this->assertEquals(1, Transaction::where('idempotency_key', 'batch-idemp-1')->count());
    }

    // =========================================================================
    // Shared conductor session and device ownership transfer tests
    // =========================================================================

    /**
     * A WEB login revokes the previous MOBILE session.
     */
    public function test_web_login_revokes_active_mobile_session(): void
    {
        // Conductor logs in on MOBILE first
        $mobileResponse = $this->postJson('/api/v1/auth/login', [
            'login'       => 'mreyes',
            'password'    => 'password',
            'device_id'   => 'mobile-11111111111111111',
            'device_type' => 'MOBILE',
        ])->assertOk();
        $mobileToken = $mobileResponse->json('data.token');

        // Conductor then logs in on WEB
        $webResponse = $this->postJson('/api/v1/auth/login', [
            'login'       => 'mreyes',
            'password'    => 'password',
            'device_id'   => 'web-2222222222222222222',
            'device_type' => 'WEB',
        ])->assertOk();
        $webToken = $webResponse->json('data.token');

        // The previous MOBILE token has been revoked.
        $this->withHeader('Authorization', "Bearer {$mobileToken}")
            ->getJson('/api/v1/user')
            ->assertUnauthorized();

        $this->withHeader('Authorization', "Bearer {$webToken}")
            ->getJson('/api/v1/user')
            ->assertOk();

        $this->assertSame(1, $this->conductor->tokens()->count());
    }

    /**
     * A MOBILE login revokes the previous WEB session.
     */
    public function test_mobile_login_revokes_active_web_session(): void
    {
        // Conductor logs in on WEB first
        $webResponse = $this->postJson('/api/v1/auth/login', [
            'login'       => 'mreyes',
            'password'    => 'password',
            'device_id'   => 'web-aaaaaaaaaaaaaaaaaaa',
            'device_type' => 'WEB',
        ])->assertOk();
        $webToken = $webResponse->json('data.token');

        // Conductor then logs in on MOBILE
        $mobileResponse = $this->postJson('/api/v1/auth/login', [
            'login'       => 'mreyes',
            'password'    => 'password',
            'device_id'   => 'mobile-bbbbbbbbbbbbbbbbbbb',
            'device_type' => 'MOBILE',
        ])->assertOk();
        $mobileToken = $mobileResponse->json('data.token');

        // The WEB token was revoked by the later MOBILE login.
        $this->withHeader('Authorization', "Bearer {$webToken}")
            ->getJson('/api/v1/user')
            ->assertUnauthorized();

        // MOBILE token is also valid
        $this->withHeader('Authorization', "Bearer {$mobileToken}")
            ->getJson('/api/v1/user')
            ->assertOk();
    }

    /**
     * A later MOBILE login replaces the single conductor token, regardless
     * of which platform created it.
     */
    public function test_second_mobile_login_revokes_all_prior_conductor_tokens(): void
    {
        // Login on WEB
        $webResponse = $this->postJson('/api/v1/auth/login', [
            'login'       => 'mreyes',
            'password'    => 'password',
            'device_id'   => 'web-cccccccccccccccccccc',
            'device_type' => 'WEB',
        ])->assertOk();
        $webToken = $webResponse->json('data.token');

        // Login on MOBILE (first device)
        $mobile1Response = $this->postJson('/api/v1/auth/login', [
            'login'       => 'mreyes',
            'password'    => 'password',
            'device_id'   => 'mobile-ddddddddddddddddddd',
            'device_type' => 'MOBILE',
        ])->assertOk();
        $mobileToken1 = $mobile1Response->json('data.token');

        // A later MOBILE login replaces all prior conductor sessions.
        $mobile2Response = $this->postJson('/api/v1/auth/login', [
            'login'       => 'mreyes',
            'password'    => 'password',
            'device_id'   => 'mobile-eeeeeeeeeeeeeeeeeee',
            'device_type' => 'MOBILE',
        ])->assertOk();
        $mobileToken2 = $mobile2Response->json('data.token');

        $this->assertSame(1, $this->conductor->tokens()->count());

        // Previous WEB and MOBILE sessions are both revoked.
        $this->withHeader('Authorization', "Bearer {$webToken}")
            ->getJson('/api/v1/user')
            ->assertUnauthorized();
        $this->withHeader('Authorization', "Bearer {$mobileToken1}")
            ->getJson('/api/v1/user')
            ->assertUnauthorized();

        // Second MOBILE token valid
        $this->withHeader('Authorization', "Bearer {$mobileToken2}")
            ->getJson('/api/v1/user')
            ->assertOk();
    }
}
