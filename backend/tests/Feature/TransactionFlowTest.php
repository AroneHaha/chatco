<?php

namespace Tests\Feature;

use App\Contracts\Payments\PaymentGateway;
use App\Enums\PaymentMethod;
use App\Enums\PaymentStatus;
use App\Enums\UserRole;
use App\Events\PaymentStatusUpdated;
use App\Models\AdminProfile;
use App\Models\CommuterProfile;
use App\Models\ConductorProfile;
use App\Models\Driver;
use App\Models\PaymentEvent;
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
use Illuminate\Support\Str;
use Tests\TestCase;

/**
 * Sprint 4 fare/payment flow over the provider-agnostic payment layer.
 *
 * Covers: cash recording + idempotency, GCash initiation (real gateway via
 * Http::fake AND the fake-gateway fallback when no keys), claim lifecycle,
 * provider-agnostic webhook with payment_events idempotency + state-machine
 * guard, dev simulation, earnings split, authorization, and schema audit.
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

        $this->conductor = User::create([
            'email' => 'conductor1@test.com', 'password' => bcrypt('password'), 'role' => UserRole::CONDUCTOR,
        ]);
        ConductorProfile::create([
            'id' => $this->conductor->id, 'first_name' => 'Conductor', 'last_name' => 'One',
            'birthday' => '1990-01-01', 'generated_username' => 'conductor1', 'generated_password' => bcrypt('password'),
        ]);

        $this->conductor2 = User::create([
            'email' => 'conductor2@test.com', 'password' => bcrypt('password'), 'role' => UserRole::CONDUCTOR,
        ]);
        $this->conductorProfile2 = ConductorProfile::create([
            'id' => $this->conductor2->id, 'first_name' => 'Conductor', 'last_name' => 'Two',
            'birthday' => '1990-01-01', 'generated_username' => 'conductor2', 'generated_password' => bcrypt('password'),
        ]);

        $this->commuter1 = User::create([
            'email' => 'commuter1@test.com', 'password' => bcrypt('password'), 'role' => UserRole::COMMUTER,
        ]);
        CommuterProfile::create([
            'id' => $this->commuter1->id, 'first_name' => 'Commuter', 'surname' => 'One', 'birthdate' => '1990-01-01',
            'gender' => 'Male', 'email' => 'commuter1@test.com', 'contact_number' => '+639171112222',
            'commuter_type' => 'Regular', 'username' => 'commuter1', 'language_preference' => 'en',
            'account_status' => 'ACTIVE', 'verified_at' => now(),
        ]);

        $this->commuter2 = User::create([
            'email' => 'commuter2@test.com', 'password' => bcrypt('password'), 'role' => UserRole::COMMUTER,
        ]);
        CommuterProfile::create([
            'id' => $this->commuter2->id, 'first_name' => 'Commuter', 'surname' => 'Two', 'birthdate' => '1990-01-01',
            'gender' => 'Female', 'email' => 'commuter2@test.com', 'contact_number' => '+639172223333',
            'commuter_type' => 'Regular', 'username' => 'commuter2', 'language_preference' => 'en',
            'account_status' => 'ACTIVE', 'verified_at' => now(),
        ]);

        $this->admin = User::create([
            'email' => 'admin@test.com', 'password' => bcrypt('password'), 'role' => UserRole::ADMIN,
        ]);
        AdminProfile::create(['id' => $this->admin->id, 'first_name' => 'Admin', 'last_name' => 'User']);

        $driver = Driver::create([
            'first_name' => 'Test', 'last_name' => 'Driver', 'birthday' => '1990-01-01', 'contact' => '+639171112222',
            'license_number' => 'DL-TEST-001', 'hire_date' => '2023-01-01', 'status' => 'ACTIVE',
        ]);
        $route = Route::create(['name' => 'Test Route', 'status' => 'ACTIVE', 'waypoints' => []]);

        $this->vehicle = Vehicle::create([
            'unit_number' => 'TEST-001', 'plate_number' => 'TEST-1234', 'route_id' => $route->id,
            'driver_id' => $driver->id, 'conductor_id' => $this->conductor->id, 'status' => 'ACTIVE',
        ]);
        $this->shift = ShiftLog::forceCreate([
            'shift_id' => 'SFT-TEST-1', 'conductor_id' => $this->conductor->id, 'driver_id' => $driver->id,
            'vehicle_id' => $this->vehicle->id, 'route_id' => $route->id, 'conductor_name' => 'Conductor One',
            'driver_name' => 'Test Driver', 'unit_number' => 'TEST-001', 'plate_number' => 'TEST-1234',
            'time_in' => now(), 'time_out' => null, 'is_active' => true, 'status' => 'ACTIVE',
        ]);
        $this->vehicle->update(['active_shift_id' => $this->shift->shift_id]);

        $vehicle2 = Vehicle::create([
            'unit_number' => 'TEST-002', 'plate_number' => 'TEST-5678', 'route_id' => $route->id,
            'driver_id' => $driver->id, 'conductor_id' => $this->conductorProfile2->id, 'status' => 'ACTIVE',
        ]);
        $this->shift2 = ShiftLog::forceCreate([
            'shift_id' => 'SFT-TEST-2', 'conductor_id' => $this->conductorProfile2->id, 'driver_id' => $driver->id,
            'vehicle_id' => $vehicle2->id, 'route_id' => $route->id, 'conductor_name' => 'Conductor Two',
            'driver_name' => 'Test Driver', 'unit_number' => 'TEST-002', 'plate_number' => 'TEST-5678',
            'time_in' => now(), 'time_out' => null, 'is_active' => true, 'status' => 'ACTIVE',
        ]);
        $vehicle2->update(['active_shift_id' => $this->shift2->shift_id]);
    }

    // ─── 1. Cash Recording ──────────────────────────────────────────

    public function test_cash_fare_persists_as_paid_with_null_fare_point_ids(): void
    {
        $txn = app(TransactionService::class)->recordCashFare($this->conductor, [
            'final_amount' => 15.00, 'pickup_name' => 'Calumpit', 'dropoff_name' => 'Bustos',
        ]);

        $this->assertSame(PaymentMethod::CASH, $txn->payment_method);
        $this->assertSame(PaymentStatus::PAID, $txn->status);
        $this->assertNull($txn->pickup_stop_id);
        $this->assertNull($txn->dropoff_stop_id);
        $this->assertNotNull($txn->paid_at);
        $this->assertSame(15.00, (float) $txn->final_amount);
    }

    public function test_cash_fare_appears_in_get_shift_transactions(): void
    {
        $svc = app(TransactionService::class);
        $txn = $svc->recordCashFare($this->conductor, ['final_amount' => 20.00, 'pickup_name' => 'Pulilan', 'dropoff_name' => 'Plaridel']);
        $list = $svc->getShiftTransactions($this->conductor, $this->shift->shift_id);

        $this->assertCount(1, $list);
        $this->assertSame($txn->transaction_id, $list->first()->transaction_id);
    }

    public function test_double_submitting_cash_fare_with_same_idempotency_key_does_not_create_duplicate(): void
    {
        $svc = app(TransactionService::class);
        $data = ['final_amount' => 15.00, 'pickup_name' => 'Calumpit', 'dropoff_name' => 'Bustos', 'idempotency_key' => 'fixed-key-123'];

        $txn1 = $svc->recordCashFare($this->conductor, $data);
        $txn2 = $svc->recordCashFare($this->conductor, $data);

        $this->assertSame($txn1->transaction_id, $txn2->transaction_id);
        $this->assertSame(1, Transaction::count());
    }

    public function test_identical_cash_fares_with_different_keys_are_both_recorded(): void
    {
        $svc = app(TransactionService::class);
        $base = ['final_amount' => 15.00, 'pickup_name' => 'Calumpit', 'dropoff_name' => 'Bustos'];

        $txn1 = $svc->recordCashFare($this->conductor, $base + ['idempotency_key' => 'key-a']);
        $txn2 = $svc->recordCashFare($this->conductor, $base + ['idempotency_key' => 'key-b']);

        $this->assertNotSame($txn1->transaction_id, $txn2->transaction_id);
        $this->assertSame(2, Transaction::count());
    }

    // ─── 2. GCash Initiation ────────────────────────────────────────

    public function test_gcash_initiate_creates_pending_row_via_real_gateway(): void
    {
        Http::fake([
            'api.paymongo.com/v1/payment_intents' => Http::response(['data' => ['id' => 'pi_test_123', 'attributes' => ['status' => 'awaiting_payment_method']]], 200),
            'api.paymongo.com/v1/payment_methods' => Http::response(['data' => ['id' => 'pm_test_123', 'attributes' => ['type' => 'gcash']]], 200),
            'api.paymongo.com/v1/payment_intents/pi_test_123/attach' => Http::response(['data' => ['id' => 'pi_test_123', 'attributes' => [
                'status' => 'awaiting_next_action',
                'next_action' => ['redirect' => ['url' => 'https://test.checkout.url/abc']],
            ]]], 200),
        ]);
        $this->configurePayMongo();

        $result = app(TransactionService::class)->initiateGcashFare($this->conductor, [
            'final_amount' => 25.00, 'pickup_name' => 'Pulilan', 'dropoff_name' => 'Plaridel',
        ]);

        $this->assertSame(PaymentMethod::GCASH, $result['transaction']->payment_method);
        $this->assertSame(PaymentStatus::PENDING, $result['transaction']->status);
        $this->assertNotEmpty($result['qr_token']);
        $this->assertSame('https://test.checkout.url/abc', $result['checkout_url']);
        $this->assertSame(25.00, $result['amount']);
        $this->assertSame('paymongo', $result['transaction']->payment_provider);
        $this->assertSame('pi_test_123', $result['transaction']->payment_reference);
    }

    public function test_gcash_initiate_falls_back_to_fake_gateway_when_unconfigured(): void
    {
        // No PayMongo keys → PaymentServiceProvider binds the FakeGateway.
        $this->forgetGateway();

        $result = app(TransactionService::class)->initiateGcashFare($this->conductor, [
            'final_amount' => 25.00, 'pickup_name' => 'Pulilan', 'dropoff_name' => 'Plaridel',
        ]);

        $this->assertSame(PaymentStatus::PENDING, $result['transaction']->status);
        $this->assertSame('fake', $result['transaction']->payment_provider);
        $this->assertNull($result['checkout_url']); // no real authorize page without keys
        $this->assertNotEmpty($result['qr_token']);  // QR + claim flow still works
    }

    // ─── 3. GCash Claim ─────────────────────────────────────────────

    public function test_gcash_claim_binds_passenger_id_and_returns_checkout_url(): void
    {
        $txn = $this->createPendingGcashTransaction();
        $result = app(TransactionService::class)->claimGcash($this->commuter1, $txn->qr_token);

        $this->assertSame($txn->transaction_id, $result['transaction_id']);
        $this->assertSame($txn->payment_checkout_url, $result['checkout_url']);

        $txn->refresh();
        $this->assertSame($this->commuter1->commuterProfile->id, $txn->passenger_id);
    }

    public function test_gcash_claim_is_idempotent_for_same_commuter(): void
    {
        $txn = $this->createPendingGcashTransaction();
        $svc = app(TransactionService::class);
        $svc->claimGcash($this->commuter1, $txn->qr_token);
        $result = $svc->claimGcash($this->commuter1, $txn->qr_token);
        $this->assertSame($txn->transaction_id, $result['transaction_id']);
    }

    public function test_gcash_claim_rejects_second_commuter_with_409(): void
    {
        $txn = $this->createPendingGcashTransaction();
        $svc = app(TransactionService::class);
        $svc->claimGcash($this->commuter1, $txn->qr_token);
        $this->assertAbort(409, fn () => $svc->claimGcash($this->commuter2, $txn->qr_token));
    }

    public function test_gcash_claim_returns_410_for_already_paid_transaction(): void
    {
        $txn = $this->createPendingGcashTransaction();
        app(PaymentService::class)->transitionTo($txn, PaymentStatus::PAID);
        $this->assertAbort(410, fn () => app(TransactionService::class)->claimGcash($this->commuter1, $txn->qr_token));
    }

    public function test_gcash_claim_returns_410_for_expired_transaction(): void
    {
        $txn = $this->createPendingGcashTransaction(['created_at' => now()->subMinutes(10)]);
        $this->assertAbort(410, fn () => app(TransactionService::class)->claimGcash($this->commuter1, $txn->qr_token));
    }

    public function test_gcash_claim_returns_404_for_missing_qr_token(): void
    {
        $this->assertAbort(404, fn () => app(TransactionService::class)->claimGcash($this->commuter1, 'nonexistent_token'));
    }

    // ─── 4. Webhook (provider-agnostic, idempotent, state-machine guarded) ──

    public function test_webhook_with_valid_payment_paid_flips_to_paid_and_broadcasts(): void
    {
        Event::fake([PaymentStatusUpdated::class]);
        $this->configurePayMongo();
        $txn = $this->createPendingGcashTransaction();

        [$payload, $headers] = $this->signedPaymongoWebhook('payment.paid', $txn->payment_reference);
        $this->withHeaders($headers)->postJson('/api/v1/payments/webhook', $payload)->assertStatus(200);

        $txn->refresh();
        $this->assertSame(PaymentStatus::PAID, $txn->status);
        $this->assertNotNull($txn->paid_at);
        $this->assertDatabaseHas('payment_events', ['provider' => 'paymongo', 'transaction_id' => $txn->transaction_id]);

        Event::assertDispatched(PaymentStatusUpdated::class, fn ($e) => $e->transaction->transaction_id === $txn->transaction_id && $e->status === 'PAID');
    }

    public function test_webhook_with_invalid_signature_returns_400_and_no_state_change(): void
    {
        Event::fake([PaymentStatusUpdated::class]);
        $this->configurePayMongo();
        $txn = $this->createPendingGcashTransaction();

        $response = $this->postJson('/api/v1/payments/webhook', [
            'data' => ['id' => 'evt_x', 'attributes' => ['type' => 'payment.paid', 'data' => ['attributes' => ['payment_intent_id' => $txn->payment_reference]]]],
        ], ['Paymongo-Signature' => 't=12345,te=invalid,li=invalid']);

        $response->assertStatus(400);
        $txn->refresh();
        $this->assertSame(PaymentStatus::PENDING, $txn->status);
        Event::assertNotDispatched(PaymentStatusUpdated::class);
    }

    public function test_webhook_duplicate_event_is_idempotent(): void
    {
        Event::fake([PaymentStatusUpdated::class]);
        $this->configurePayMongo();
        $txn = $this->createPendingGcashTransaction();

        [$payload, $headers] = $this->signedPaymongoWebhook('payment.paid', $txn->payment_reference, 'evt_fixed_1');

        $this->withHeaders($headers)->postJson('/api/v1/payments/webhook', $payload)->assertStatus(200);
        $txn->refresh();
        $firstPaidAt = $txn->paid_at;

        // Replay the SAME event id → suppressed by payment_events unique key.
        $this->withHeaders($headers)->postJson('/api/v1/payments/webhook', $payload)->assertStatus(200);
        $txn->refresh();

        $this->assertSame(PaymentStatus::PAID, $txn->status);
        $this->assertSame($firstPaidAt->toIso8601String(), $txn->paid_at->toIso8601String());
        $this->assertSame(1, PaymentEvent::count());
        Event::assertDispatchedTimes(PaymentStatusUpdated::class, 1);
    }

    public function test_webhook_cannot_regress_a_paid_payment(): void
    {
        $this->configurePayMongo();
        $txn = $this->createPendingGcashTransaction();
        app(PaymentService::class)->transitionTo($txn, PaymentStatus::PAID);

        // A later "failed" event (distinct id) must NOT move PAID → FAILED.
        [$payload, $headers] = $this->signedPaymongoWebhook('payment.failed', $txn->payment_reference, 'evt_failed_1');
        $this->withHeaders($headers)->postJson('/api/v1/payments/webhook', $payload)->assertStatus(200);

        $txn->refresh();
        $this->assertSame(PaymentStatus::PAID, $txn->status);
    }

    // ─── 5. Dev simulation ──────────────────────────────────────────

    public function test_simulation_drives_pending_gcash_to_paid_when_enabled(): void
    {
        config(['payments.allow_simulation' => true]);
        $txn = $this->createPendingGcashTransaction();
        app(TransactionService::class)->claimGcash($this->commuter1, $txn->qr_token);

        $this->actingAs($this->commuter1, 'sanctum')
            ->postJson("/api/v1/payments/{$txn->transaction_id}/simulate", ['status' => 'PAID'])
            ->assertOk()
            ->assertJsonPath('data.status', 'PAID');

        $this->assertSame(PaymentStatus::PAID, $txn->fresh()->status);
    }

    public function test_simulation_is_forbidden_when_disabled(): void
    {
        config(['payments.allow_simulation' => false]);
        $txn = $this->createPendingGcashTransaction();
        app(TransactionService::class)->claimGcash($this->commuter1, $txn->qr_token);

        $this->actingAs($this->commuter1, 'sanctum')
            ->postJson("/api/v1/payments/{$txn->transaction_id}/simulate", ['status' => 'PAID'])
            ->assertStatus(403);
    }

    // ─── 6. Earnings split ──────────────────────────────────────────

    public function test_get_shift_earnings_returns_correct_cash_vs_gcash_split(): void
    {
        $svc = app(TransactionService::class);
        $svc->recordCashFare($this->conductor, ['final_amount' => 15.00, 'pickup_name' => 'A', 'dropoff_name' => 'B']);
        $svc->recordCashFare($this->conductor, ['final_amount' => 20.00, 'pickup_name' => 'C', 'dropoff_name' => 'D']);
        $svc->recordCashFare($this->conductor, ['final_amount' => 10.00, 'pickup_name' => 'E', 'dropoff_name' => 'F']);

        $this->createPendingGcashTransaction(['final_amount' => 25.00]); // PENDING → excluded
        $paidGcash = $this->createPendingGcashTransaction(['final_amount' => 30.00]);
        app(PaymentService::class)->transitionTo($paidGcash, PaymentStatus::PAID);

        $earnings = $svc->getShiftEarnings($this->conductor, $this->shift->shift_id);

        $this->assertSame(45.00, $earnings['cash_total']);
        $this->assertSame(30.00, $earnings['gcash_total']);
        $this->assertSame(75.00, $earnings['total']);
    }

    public function test_gcash_totals_are_not_included_in_remitted_cash_figure(): void
    {
        $svc = app(TransactionService::class);
        $svc->recordCashFare($this->conductor, ['final_amount' => 25.00, 'pickup_name' => 'A', 'dropoff_name' => 'B']);
        $svc->recordCashFare($this->conductor, ['final_amount' => 25.00, 'pickup_name' => 'C', 'dropoff_name' => 'D']);
        $paidGcash = $this->createPendingGcashTransaction(['final_amount' => 100.00]);
        app(PaymentService::class)->transitionTo($paidGcash, PaymentStatus::PAID);

        $earnings = $svc->getShiftEarnings($this->conductor, $this->shift->shift_id);

        $this->assertSame(50.00, $earnings['cash_total']);
        $this->assertSame(100.00, $earnings['gcash_total']);
        $this->assertNotSame($earnings['total'], $earnings['cash_total']);
    }

    // ─── 7. Authorization ───────────────────────────────────────────

    public function test_conductor_cannot_read_another_conductor_shift_transactions(): void
    {
        $svc = app(TransactionService::class);
        $svc->recordCashFare($this->conductor, ['final_amount' => 15.00, 'pickup_name' => 'Calumpit', 'dropoff_name' => 'Bustos']);
        $this->assertAbort(403, fn () => $svc->getShiftTransactions($this->conductor2, $this->shift->shift_id));
    }

    public function test_commuter_sees_only_their_own_payments(): void
    {
        $svc = app(TransactionService::class);
        $txn1 = $this->createPendingGcashTransaction();
        $svc->claimGcash($this->commuter1, $txn1->qr_token);
        $txn2 = $this->createPendingGcashTransaction();
        $svc->claimGcash($this->commuter2, $txn2->qr_token);

        $response = $this->actingAs($this->commuter1, 'sanctum')->getJson('/api/v1/commuter/payments');

        $response->assertOk();
        $response->assertJsonCount(1, 'data.data'); // paginated payload
        $response->assertJsonPath('data.data.0.transaction_id', $txn1->transaction_id);
    }

    // ─── 8. Schema audit ────────────────────────────────────────────

    public function test_no_wallet_table_exists(): void
    {
        $this->assertFalse(\Schema::hasTable('wallets'));
    }

    public function test_no_balance_column_on_transactions(): void
    {
        $this->assertFalse(\Schema::hasColumn('transactions', 'balance'));
    }

    public function test_no_balance_column_on_commuter_profiles(): void
    {
        $this->assertFalse(\Schema::hasColumn('commuter_profiles', 'balance'));
    }

    // ─── Helpers ────────────────────────────────────────────────────

    private function createPendingGcashTransaction(array $overrides = []): Transaction
    {
        $defaults = [
            'transaction_id' => 'TXN-GCASH-'.strtoupper(Str::random(10)),
            'shift_id' => $this->shift->shift_id,
            'payment_method' => PaymentMethod::GCASH->value,
            'status' => PaymentStatus::PENDING->value,
            'final_amount' => 25.00,
            'pickup_name' => 'Pulilan', 'dropoff_name' => 'Plaridel',
            'conductor_name' => 'Conductor One', 'unit_number' => 'TEST-001', 'driver_name' => 'Test Driver',
            'qr_token' => Str::random(32),
            'payment_provider' => 'paymongo',
            'payment_reference' => 'pi_test_'.Str::random(10),
            'payment_checkout_url' => 'https://test.checkout.url/'.Str::random(8),
            'paid_at' => null,
        ];

        $txn = Transaction::forceCreate(array_merge($defaults, $overrides));
        if (isset($overrides['created_at'])) {
            $txn->forceFill(['created_at' => $overrides['created_at']])->save();
            $txn->refresh();
        }

        return $txn;
    }

    /**
     * Configure the PayMongo gateway with test keys and re-bind the singleton.
     */
    private function configurePayMongo(): void
    {
        config([
            'payments.default' => 'paymongo',
            'payments.gateways.paymongo.secret' => 'sk_test_fake_key',
            'payments.gateways.paymongo.webhook_secret' => 'whsec_test_secret',
        ]);
        $this->forgetGateway();
    }

    private function forgetGateway(): void
    {
        $this->app->forgetInstance(PaymentGateway::class);
    }

    /**
     * Build a PayMongo webhook payload + matching signature header.
     *
     * @return array{0: array, 1: array<string,string>}
     */
    private function signedPaymongoWebhook(string $type, string $reference, ?string $eventId = null): array
    {
        $payload = [
            'data' => [
                'id' => $eventId ?? 'evt_'.Str::random(10),
                'attributes' => [
                    'type' => $type,
                    'data' => ['attributes' => ['payment_intent_id' => $reference]],
                ],
            ],
        ];
        $body = json_encode($payload, JSON_UNESCAPED_SLASHES);
        $timestamp = time();
        $sig = hash_hmac('sha256', $timestamp.'.'.$body, 'whsec_test_secret');

        return [$payload, [
            'Paymongo-Signature' => "t={$timestamp},te={$sig},li={$sig}",
            'Content-Type' => 'application/json',
        ]];
    }

    /**
     * Assert that the given callback aborts with the expected HTTP status.
     */
    private function assertAbort(int $status, callable $callback): void
    {
        try {
            $callback();
            $this->fail("Expected HTTP {$status} abort, but none was thrown.");
        } catch (\Symfony\Component\HttpKernel\Exception\HttpException $e) {
            $this->assertSame($status, $e->getStatusCode());
        }
    }
}
