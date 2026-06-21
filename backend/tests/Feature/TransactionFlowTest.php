<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Events\PaymentStatusUpdated;
use App\Models\AdminProfile;
use App\Models\CommuterProfile;
use App\Models\ConductorProfile;
use App\Models\Driver;
use App\Models\Route;
use App\Models\ShiftLog;
use App\Models\Transaction;
use App\Models\User;
use App\Models\Vehicle;
use App\Services\PaymentService;
use App\Services\TransactionService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

/**
 * S4-T7: Feature tests covering the clarified Sprint 4 fare/payment flow.
 *
 * Test scope (8 scenarios per spec):
 *   1. Cash recording (PAID + null fare_point ids + appears in listing)
 *   2. GCash initiation (PENDING + qr_token + checkout_url, PayMongo mocked)
 *   3. GCash claim (binds passenger_id, 409 for second commuter, 410 for expired)
 *   4. Webhook (signed payment.paid flips to PAID + broadcasts, invalid sig = 400, duplicate idempotent)
 *   5. Earnings split (cash_total vs gcash_total, only PAID counts)
 *   6. Remittance (GCash NOT included in remitted cash figure)
 *   7. Authorization (conductor can't read other conductor's shift, commuter sees only own payments)
 *   8. Schema audit (no wallet table, no balance column)
 *
 * Testing approach:
 *   - RefreshDatabase: clean SQLite :memory: DB per test
 *   - Http::fake(): mock PayMongo API calls (no real network)
 *   - Event::fake(): capture broadcasts without Pusher
 *   - BROADCAST_DRIVER=null in phpunit.xml (broadcasts are silently dropped,
 *     but Event::fake() captures them for assertions)
 */
class TransactionFlowTest extends TestCase
{
    use RefreshDatabase;

    private User $conductor;
    private User $conductor2;
    private User $commuter1;
    private User $commuter2;
    private User $admin;
    private Vehicle $vehicle;
    private ShiftLog $shift;
    private ShiftLog $shift2;
    private ConductorProfile $conductorProfile2;

    protected function setUp(): void
    {
        parent::setUp();

        // ─── Create conductor 1 + profile + shift ────────────────────
        $this->conductor = User::create([
            'email'    => 'conductor1@test.com',
            'password' => bcrypt('password'),
            'role'     => UserRole::CONDUCTOR,
        ]);
        ConductorProfile::create([
            'id'                  => $this->conductor->id,
            'first_name'          => 'Conductor',
            'middle_name'         => null,
            'last_name'           => 'One',
            'birthday'            => '1990-01-01',
            'profile_picture_url' => null,
            'generated_username'  => 'conductor1',
            'generated_password'  => bcrypt('password'),
        ]);

        // ─── Create conductor 2 + profile + shift (for auth tests) ────
        $this->conductor2 = User::create([
            'email'    => 'conductor2@test.com',
            'password' => bcrypt('password'),
            'role'     => UserRole::CONDUCTOR,
        ]);
        $this->conductorProfile2 = ConductorProfile::create([
            'id'                  => $this->conductor2->id,
            'first_name'          => 'Conductor',
            'middle_name'         => null,
            'last_name'           => 'Two',
            'birthday'            => '1990-01-01',
            'profile_picture_url' => null,
            'generated_username'  => 'conductor2',
            'generated_password'  => bcrypt('password'),
        ]);

        // ─── Create commuters + profiles (for claim tests) ────────────
        $this->commuter1 = User::create([
            'email'    => 'commuter1@test.com',
            'password' => bcrypt('password'),
            'role'     => UserRole::COMMUTER,
        ]);
        CommuterProfile::create([
            'id'                  => $this->commuter1->id,
            'first_name'          => 'Commuter',
            'middle_name'         => null,
            'surname'             => 'One',
            'birthdate'           => '1990-01-01',
            'gender'              => 'Male',
            'email'               => 'commuter1@test.com',
            'contact_number'      => '+639171112222',
            'commuter_type'       => 'Regular',
            'applied_type'        => null,
            'username'            => 'commuter1',
            'language_preference' => 'en',
            'account_status'      => 'ACTIVE',
            'id_image_url'        => null,
            'verified_at'         => now(),
            'rejection_reason'    => null,
        ]);

        $this->commuter2 = User::create([
            'email'    => 'commuter2@test.com',
            'password' => bcrypt('password'),
            'role'     => UserRole::COMMUTER,
        ]);
        CommuterProfile::create([
            'id'                  => $this->commuter2->id,
            'first_name'          => 'Commuter',
            'middle_name'         => null,
            'surname'             => 'Two',
            'birthdate'           => '1990-01-01',
            'gender'              => 'Female',
            'email'               => 'commuter2@test.com',
            'contact_number'      => '+639172223333',
            'commuter_type'       => 'Regular',
            'applied_type'        => null,
            'username'            => 'commuter2',
            'language_preference' => 'en',
            'account_status'      => 'ACTIVE',
            'id_image_url'        => null,
            'verified_at'         => now(),
            'rejection_reason'    => null,
        ]);

        // ─── Admin (for completeness) ─────────────────────────────────
        $this->admin = User::create([
            'email'    => 'admin@test.com',
            'password' => bcrypt('password'),
            'role'     => UserRole::ADMIN,
        ]);
        AdminProfile::create([
            'id'                  => $this->admin->id,
            'first_name'          => 'Admin',
            'middle_name'         => null,
            'last_name'           => 'User',
            'profile_picture_url' => null,
        ]);

        // ─── Create driver + route + vehicle ──────────────────────────
        $driver = Driver::create([
            'first_name'          => 'Test',
            'middle_name'         => null,
            'last_name'           => 'Driver',
            'birthday'            => '1990-01-01',
            'contact'             => '+639171112222',
            'license_number'      => 'DL-TEST-001',
            'hire_date'           => '2023-01-01',
            'profile_picture_url' => null,
            'status'              => 'ACTIVE',
        ]);

        $route = Route::create([
            'name'      => 'Test Route',
            'status'    => 'ACTIVE',
            'waypoints' => [],
        ]);

        $this->vehicle = Vehicle::create([
            'unit_number'  => 'TEST-001',
            'plate_number' => 'TEST-1234',
            'route_id'     => $route->id,
            'driver_id'    => $driver->id,
            'conductor_id' => $this->conductor->id,
            'status'       => 'ACTIVE',
        ]);

        // ─── Create active shift for conductor 1 ──────────────────────
        $this->shift = ShiftLog::forceCreate([
            'shift_id'       => 'SFT-TEST-1',
            'conductor_id'   => $this->conductor->id,  // = conductor_profiles.id
            'driver_id'      => $driver->id,
            'vehicle_id'     => $this->vehicle->id,
            'route_id'       => $route->id,
            'conductor_name' => 'Conductor One',
            'driver_name'    => 'Test Driver',
            'unit_number'    => $this->vehicle->unit_number,
            'plate_number'   => $this->vehicle->plate_number,
            'time_in'        => now(),
            'time_out'       => null,
            'is_active'      => true,
            'status'         => 'ACTIVE',
        ]);
        $this->vehicle->update(['active_shift_id' => $this->shift->shift_id]);

        // ─── Create active shift for conductor 2 (different vehicle) ──
        $vehicle2 = Vehicle::create([
            'unit_number'  => 'TEST-002',
            'plate_number' => 'TEST-5678',
            'route_id'     => $route->id,
            'driver_id'    => $driver->id,
            'conductor_id' => $this->conductorProfile2->id,
            'status'       => 'ACTIVE',
        ]);

        $this->shift2 = ShiftLog::forceCreate([
            'shift_id'       => 'SFT-TEST-2',
            'conductor_id'   => $this->conductorProfile2->id,
            'driver_id'      => $driver->id,
            'vehicle_id'     => $vehicle2->id,
            'route_id'       => $route->id,
            'conductor_name' => 'Conductor Two',
            'driver_name'    => 'Test Driver',
            'unit_number'    => $vehicle2->unit_number,
            'plate_number'   => $vehicle2->plate_number,
            'time_in'        => now(),
            'time_out'       => null,
            'is_active'      => true,
            'status'         => 'ACTIVE',
        ]);
        $vehicle2->update(['active_shift_id' => $this->shift2->shift_id]);
    }

    // ─── 1. Cash Recording ──────────────────────────────────────────

    public function test_cash_fare_persists_as_paid_with_null_fare_point_ids(): void
    {
        $svc = app(TransactionService::class);

        $txn = $svc->recordCashFare($this->conductor, [
            'final_amount'  => 15.00,
            'pickup_name'   => 'Calumpit',
            'dropoff_name'  => 'Bustos',
        ]);

        $this->assertSame('CASH', $txn->payment_method);
        $this->assertSame('PAID', $txn->status);
        $this->assertNull($txn->pickup_stop_id);
        $this->assertNull($txn->dropoff_stop_id);
        $this->assertNotNull($txn->paid_at);
        $this->assertSame(15.00, (float) $txn->final_amount);
    }

    public function test_cash_fare_appears_in_get_shift_transactions(): void
    {
        $svc = app(TransactionService::class);

        $txn = $svc->recordCashFare($this->conductor, [
            'final_amount'  => 20.00,
            'pickup_name'   => 'Pulilan',
            'dropoff_name'  => 'Plaridel',
        ]);

        $list = $svc->getShiftTransactions($this->conductor, $this->shift->shift_id);

        $this->assertCount(1, $list);
        $this->assertSame($txn->transaction_id, $list->first()->transaction_id);
    }

    public function test_double_submitting_cash_fare_does_not_create_duplicate(): void
    {
        $svc = app(TransactionService::class);

        $data = [
            'final_amount'  => 15.00,
            'pickup_name'   => 'Calumpit',
            'dropoff_name'  => 'Bustos',
        ];

        $txn1 = $svc->recordCashFare($this->conductor, $data);
        $txn2 = $svc->recordCashFare($this->conductor, $data);

        $this->assertSame($txn1->transaction_id, $txn2->transaction_id);
        $this->assertSame(1, Transaction::count());
    }

    // ─── 2. GCash Initiation ────────────────────────────────────────

    public function test_gcash_initiate_creates_pending_row_with_qr_token_and_checkout_url(): void
    {
        // Mock PayMongo API calls
        Http::fake([
            'api.paymongo.com/v1/payment_intents' => Http::response([
                'data' => ['id' => 'pi_test_123', 'attributes' => ['status' => 'awaiting_payment_method']],
            ], 200),
            'api.paymongo.com/v1/payment_methods' => Http::response([
                'data' => ['id' => 'pm_test_123', 'attributes' => ['type' => 'gcash']],
            ], 200),
            'api.paymongo.com/v1/payment_intents/pi_test_123/attach' => Http::response([
                'data' => ['id' => 'pi_test_123', 'attributes' => [
                    'status' => 'awaiting_next_action',
                    'next_action' => ['redirect' => ['url' => 'https://test.checkout.url/abc']],
                ]],
            ], 200),
        ]);

        // Set fake PayMongo secrets so PaymentService doesn't throw
        config(['services.paymongo.secret' => 'sk_test_fake_key']);
        config(['services.paymongo.webhook_secret' => 'whsec_fake']);

        $svc = app(TransactionService::class);

        $result = $svc->initiateGcashFare($this->conductor, [
            'final_amount'  => 25.00,
            'pickup_name'   => 'Pulilan',
            'dropoff_name'  => 'Plaridel',
        ]);

        $this->assertSame('GCASH', $result['transaction']->payment_method);
        $this->assertSame('PENDING', $result['transaction']->status);
        $this->assertNotEmpty($result['qr_token']);
        $this->assertSame('https://test.checkout.url/abc', $result['checkout_url']);
        $this->assertSame(25.00, $result['amount']);
        $this->assertNotNull($result['expires_at']);

        // Verify the transaction row was persisted with PayMongo fields
        $this->assertSame('pi_test_123', $result['transaction']->paymongo_intent_id);
        $this->assertSame('https://test.checkout.url/abc', $result['transaction']->paymongo_checkout_url);

        // No wallet side effect (use Schema::hasTable — assertDatabaseMissing
        // throws if the table doesn't exist, which is actually the desired state)
        $this->assertFalse(\Schema::hasTable('wallets'), 'No wallets table should exist');
    }

    // ─── 3. GCash Claim ─────────────────────────────────────────────

    public function test_gcash_claim_binds_passenger_id_and_returns_checkout_url(): void
    {
        $txn = $this->createPendingGcashTransaction();

        $svc = app(TransactionService::class);

        $result = $svc->claimGcash($this->commuter1, $txn->qr_token);

        $this->assertSame($txn->transaction_id, $result['transaction_id']);
        $this->assertSame($txn->paymongo_checkout_url, $result['checkout_url']);
        $this->assertSame((float) $txn->final_amount, $result['amount']);

        // Verify passenger_id was bound
        $txn->refresh();
        $this->assertSame($this->commuter1->commuterProfile->id, $txn->passenger_id);
    }

    public function test_gcash_claim_is_idempotent_for_same_commuter(): void
    {
        $txn = $this->createPendingGcashTransaction();
        $svc = app(TransactionService::class);

        // First claim
        $svc->claimGcash($this->commuter1, $txn->qr_token);

        // Second claim by same commuter — should succeed (idempotent)
        $result = $svc->claimGcash($this->commuter1, $txn->qr_token);

        $this->assertSame($txn->transaction_id, $result['transaction_id']);
    }

    public function test_gcash_claim_rejects_second_commuter_with_409(): void
    {
        $txn = $this->createPendingGcashTransaction();
        $svc = app(TransactionService::class);

        // First commuter claims
        $svc->claimGcash($this->commuter1, $txn->qr_token);

        // Second different commuter tries to claim — should 409
        $this->expectException(\Symfony\Component\HttpKernel\Exception\HttpException::class);
        try {
            $svc->claimGcash($this->commuter2, $txn->qr_token);
        } catch (\Symfony\Component\HttpKernel\Exception\HttpException $e) {
            $this->assertSame(409, $e->getStatusCode());
            throw $e;
        }
    }

    public function test_gcash_claim_returns_410_for_already_paid_transaction(): void
    {
        $txn = $this->createPendingGcashTransaction();
        $svc = app(TransactionService::class);

        // Mark as PAID (simulating webhook already processed)
        $svc->markPaid($txn);

        // Claim should return 410
        $this->expectException(\Symfony\Component\HttpKernel\Exception\HttpException::class);
        try {
            $svc->claimGcash($this->commuter1, $txn->qr_token);
        } catch (\Symfony\Component\HttpKernel\Exception\HttpException $e) {
            $this->assertSame(410, $e->getStatusCode());
            throw $e;
        }
    }

    public function test_gcash_claim_returns_410_for_expired_transaction(): void
    {
        $txn = $this->createPendingGcashTransaction([
            'created_at' => now()->subMinutes(10), // expired (> 5 min TTL)
        ]);

        $svc = app(TransactionService::class);

        $this->expectException(\Symfony\Component\HttpKernel\Exception\HttpException::class);
        try {
            $svc->claimGcash($this->commuter1, $txn->qr_token);
        } catch (\Symfony\Component\HttpKernel\Exception\HttpException $e) {
            $this->assertSame(410, $e->getStatusCode());
            throw $e;
        }
    }

    public function test_gcash_claim_returns_404_for_missing_qr_token(): void
    {
        $svc = app(TransactionService::class);

        $this->expectException(\Symfony\Component\HttpKernel\Exception\HttpException::class);
        try {
            $svc->claimGcash($this->commuter1, 'nonexistent_token');
        } catch (\Symfony\Component\HttpKernel\Exception\HttpException $e) {
            $this->assertSame(404, $e->getStatusCode());
            throw $e;
        }
    }

    // ─── 4. Webhook ─────────────────────────────────────────────────

    public function test_webhook_with_valid_payment_paid_flips_to_paid_and_broadcasts(): void
    {
        Event::fake([PaymentStatusUpdated::class]);

        $txn = $this->createPendingGcashTransaction();

        // Generate a valid signature
        config(['services.paymongo.secret' => 'sk_test_fake_key']);
        config(['services.paymongo.webhook_secret' => 'whsec_test_secret']);

        $body = json_encode([
            'data' => [
                'attributes' => [
                    'type' => 'payment.paid',
                    'data' => [
                        'attributes' => [
                            'payment_intent_id' => $txn->paymongo_intent_id,
                        ],
                    ],
                ],
            ],
        ]);

        $timestamp = time();
        $sig = hash_hmac('sha256', $timestamp . '.' . $body, 'whsec_test_secret');
        $signatureHeader = "t={$timestamp},te={$sig},li={$sig}";

        // Pass the RAW body string (not an array) so the signature matches exactly.
        // postJson's 2nd arg must be a string to bypass Laravel's json_encode.
        $response = $this->call('POST', '/api/v1/payments/webhook', [], [], [], [
            'HTTP_Paymongo-Signature' => $signatureHeader,
            'HTTP_CONTENT_TYPE' => 'application/json',
            'CONTENT' => $body,
        ]);

        $response->assertStatus(200);

        $txn->refresh();
        $this->assertSame('PAID', $txn->status);
        $this->assertNotNull($txn->paid_at);

        Event::assertDispatched(PaymentStatusUpdated::class, function ($event) use ($txn) {
            return $event->transaction->transaction_id === $txn->transaction_id
                && $event->status === 'PAID';
        });
    }

    public function test_webhook_with_invalid_signature_returns_400_and_no_state_change(): void
    {
        Event::fake([PaymentStatusUpdated::class]);

        $txn = $this->createPendingGcashTransaction();
        $originalStatus = $txn->status;

        config(['services.paymongo.secret' => 'sk_test_fake_key']);
        config(['services.paymongo.webhook_secret' => 'whsec_test_secret']);

        $response = $this->postJson('/api/v1/payments/webhook', [
            'data' => [
                'attributes' => [
                    'type' => 'payment.paid',
                    'data' => ['attributes' => ['payment_intent_id' => $txn->paymongo_intent_id]],
                ],
            ],
        ], [
            'Paymongo-Signature' => 't=12345,te=invalid_signature,li=invalid_signature',
        ]);

        $response->assertStatus(400);

        // No state change
        $txn->refresh();
        $this->assertSame($originalStatus, $txn->status);

        // No broadcast
        Event::assertNotDispatched(PaymentStatusUpdated::class);
    }

    public function test_webhook_duplicate_event_is_idempotent(): void
    {
        Event::fake([PaymentStatusUpdated::class]);

        $txn = $this->createPendingGcashTransaction();

        config(['services.paymongo.secret' => 'sk_test_fake_key']);
        config(['services.paymongo.webhook_secret' => 'whsec_test_secret']);

        $body = json_encode([
            'data' => [
                'attributes' => [
                    'type' => 'payment.paid',
                    'data' => ['attributes' => ['payment_intent_id' => $txn->paymongo_intent_id]],
                ],
            ],
        ]);

        $timestamp = time();
        $sig = hash_hmac('sha256', $timestamp . '.' . $body, 'whsec_test_secret');
        $signatureHeader = "t={$timestamp},te={$sig},li={$sig}";

        // First webhook -- pass RAW body string so signature matches
        $this->call('POST', '/api/v1/payments/webhook', [], [], [], [
            'HTTP_Paymongo-Signature' => $signatureHeader,
            'HTTP_CONTENT_TYPE' => 'application/json',
            'CONTENT' => $body,
        ])->assertStatus(200);

        $txn->refresh();
        $this->assertSame('PAID', $txn->status);
        $firstPaidAt = $txn->paid_at;

        // Second webhook (duplicate)
        $this->call('POST', '/api/v1/payments/webhook', [], [], [], [
            'HTTP_Paymongo-Signature' => $signatureHeader,
            'HTTP_CONTENT_TYPE' => 'application/json',
            'CONTENT' => $body,
        ])->assertStatus(200);

        // Status still PAID, paid_at unchanged (idempotent)
        $txn->refresh();
        $this->assertSame('PAID', $txn->status);
        $this->assertSame($firstPaidAt->toIso8601String(), $txn->paid_at->toIso8601String());

        // Both webhooks broadcast (Pusher would deduplicate; Event::fake captures both)
        Event::assertDispatchedTimes(PaymentStatusUpdated::class, 2);
    }

    // ─── 5. Earnings Split ──────────────────────────────────────────

    public function test_get_shift_earnings_returns_correct_cash_vs_gcash_split(): void
    {
        $svc = app(TransactionService::class);

        // 3 cash fares (PAID)
        $svc->recordCashFare($this->conductor, ['final_amount' => 15.00, 'pickup_name' => 'A', 'dropoff_name' => 'B']);
        $svc->recordCashFare($this->conductor, ['final_amount' => 20.00, 'pickup_name' => 'C', 'dropoff_name' => 'D']);
        $svc->recordCashFare($this->conductor, ['final_amount' => 10.00, 'pickup_name' => 'E', 'dropoff_name' => 'F']);

        // 1 GCash fare (PENDING — should NOT count)
        $this->createPendingGcashTransaction(['final_amount' => 25.00]);

        // 1 GCash fare (PAID — should count)
        $paidGcash = $this->createPendingGcashTransaction(['final_amount' => 30.00]);
        $svc->markPaid($paidGcash);

        $earnings = $svc->getShiftEarnings($this->conductor, $this->shift->shift_id);

        // cash_total = 15 + 20 + 10 = 45
        $this->assertSame(45.00, $earnings['cash_total']);
        // gcash_total = 30 (only PAID; PENDING 25 excluded)
        $this->assertSame(30.00, $earnings['gcash_total']);
        // total = 45 + 30 = 75
        $this->assertSame(75.00, $earnings['total']);
    }

    // ─── 6. Remittance (GCash is record-only) ───────────────────────

    public function test_gcash_totals_are_not_included_in_remitted_cash_figure(): void
    {
        $svc = app(TransactionService::class);

        // Cash fares = 50 total
        $svc->recordCashFare($this->conductor, ['final_amount' => 25.00, 'pickup_name' => 'A', 'dropoff_name' => 'B']);
        $svc->recordCashFare($this->conductor, ['final_amount' => 25.00, 'pickup_name' => 'C', 'dropoff_name' => 'D']);

        // GCash fare = 100 (PAID, but record-only — not physically remitted)
        $paidGcash = $this->createPendingGcashTransaction(['final_amount' => 100.00]);
        $svc->markPaid($paidGcash);

        $earnings = $svc->getShiftEarnings($this->conductor, $this->shift->shift_id);

        // The remitted cash figure is cash_total (50), NOT total (150)
        $this->assertSame(50.00, $earnings['cash_total']);
        $this->assertSame(100.00, $earnings['gcash_total']);
        $this->assertSame(150.00, $earnings['total']);

        // The conductor physically remits only the cash (50); GCash goes
        // directly to the operator's GCash account, not the cash box.
        $this->assertNotSame($earnings['total'], $earnings['cash_total']);
    }

    // ─── 7. Authorization ───────────────────────────────────────────

    public function test_conductor_cannot_read_another_conductor_shift_transactions(): void
    {
        $svc = app(TransactionService::class);

        // Conductor 1 records a cash fare on their shift
        $svc->recordCashFare($this->conductor, [
            'final_amount'  => 15.00,
            'pickup_name'   => 'Calumpit',
            'dropoff_name'  => 'Bustos',
        ]);

        // Conductor 2 tries to read conductor 1's shift transactions
        $this->expectException(\Symfony\Component\HttpKernel\Exception\HttpException::class);
        try {
            $svc->getShiftTransactions($this->conductor2, $this->shift->shift_id);
        } catch (\Symfony\Component\HttpKernel\Exception\HttpException $e) {
            $this->assertSame(403, $e->getStatusCode());
            throw $e;
        }
    }

    public function test_commuter_sees_only_their_own_payments(): void
    {
        $svc = app(TransactionService::class);

        // Commuter 1 has a GCash transaction
        $txn1 = $this->createPendingGcashTransaction();
        $svc->claimGcash($this->commuter1, $txn1->qr_token);

        // Commuter 2 has a different GCash transaction
        $txn2 = $this->createPendingGcashTransaction();
        $svc->claimGcash($this->commuter2, $txn2->qr_token);

        // Commuter 1 queries their payment history via the controller
        $response = $this->actingAs($this->commuter1, 'sanctum')
            ->getJson('/api/v1/commuter/payments');

        $response->assertOk();
        $response->assertJsonCount(1, 'data');
        $response->assertJsonPath('data.0.transaction_id', $txn1->transaction_id);
    }

    // ─── 8. Schema Audit ────────────────────────────────────────────

    public function test_no_wallet_table_exists(): void
    {
        $this->assertFalse(
            \Schema::hasTable('wallets'),
            'The wallets table must NOT exist — Sprint 4 explicitly decided NO wallet/balance.'
        );
    }

    public function test_no_balance_column_on_transactions(): void
    {
        $this->assertFalse(
            \Schema::hasColumn('transactions', 'balance'),
            'The transactions table must NOT have a balance column — NO wallet/balance.'
        );
    }

    public function test_no_balance_column_on_commuter_profiles(): void
    {
        $this->assertFalse(
            \Schema::hasColumn('commuter_profiles', 'balance'),
            'The commuter_profiles table must NOT have a balance column — NO wallet/balance.'
        );
    }

    // ─── Helpers ────────────────────────────────────────────────────

    /**
     * Create a PENDING GCash transaction for testing.
     *
     * @param  array  $overrides  Override default attributes (e.g., created_at for expiry tests)
     * @return Transaction
     */
    private function createPendingGcashTransaction(array $overrides = []): Transaction
    {
        $defaults = [
            'transaction_id'  => 'TXN-GCASH-' . strtoupper(\Str::random(10)),
            'shift_id'        => $this->shift->shift_id,
            'payment_method'  => 'GCASH',
            'status'          => 'PENDING',
            'final_amount'    => 25.00,
            'pickup_name'     => 'Pulilan',
            'dropoff_name'    => 'Plaridel',
            'passenger_name'  => null,
            'conductor_name'  => 'Conductor One',
            'unit_number'     => 'TEST-001',
            'driver_name'     => 'Test Driver',
            'qr_token'        => \Str::random(32),
            'paymongo_intent_id'    => 'pi_test_' . \Str::random(10),
            'paymongo_checkout_url' => 'https://test.checkout.url/' . \Str::random(8),
            'paid_at'         => null,
        ];

        // Use forceCreate to bypass fillable (created_at override needs special handling)
        $txn = Transaction::forceCreate(array_merge($defaults, $overrides));

        // If created_at was overridden, update it (Laravel sets created_at automatically on create)
        if (isset($overrides['created_at'])) {
            $txn->forceFill(['created_at' => $overrides['created_at']])->save();
            $txn->refresh();
        }

        return $txn;
    }
}
