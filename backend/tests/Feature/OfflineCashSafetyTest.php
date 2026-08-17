<?php

namespace Tests\Feature;

use App\Models\Driver;
use App\Models\FarePoint;
use App\Models\PaymentGroup;
use App\Models\Remittance;
use App\Models\Route;
use App\Models\ShiftLog;
use App\Models\Transaction;
use App\Models\User;
use App\Models\Vehicle;
use App\Services\ShiftCloseoutService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class OfflineCashSafetyTest extends TestCase
{
    use RefreshDatabase;

    private const WEB_DEVICE = 'web-device-aaaaaaaa';

    private const MOBILE_DEVICE = 'mobile-device-bbbbbbbb';

    private User $conductor;

    private Vehicle $vehicle;

    private Driver $driver;

    private Route $route;

    private FarePoint $pickup;

    private FarePoint $dropoff;

    protected function setUp(): void
    {
        parent::setUp();

        $this->conductor = User::factory()->conductor()->create();
        $this->driver = Driver::factory()->create(['status' => 'ACTIVE']);
        $this->route = Route::factory()->create(['status' => 'ACTIVE']);
        $this->pickup = FarePoint::create([
            'route_id' => $this->route->id,
            'point_number' => 1,
            'code' => 'OFF-A',
            'name' => 'Offline A',
            'sub_stops' => [],
            'regular_fare' => 0,
            'discounted_fare' => 0,
        ]);
        $this->dropoff = FarePoint::create([
            'route_id' => $this->route->id,
            'point_number' => 2,
            'code' => 'OFF-B',
            'name' => 'Offline B',
            'sub_stops' => [],
            'regular_fare' => 15,
            'discounted_fare' => 12,
        ]);
        $this->vehicle = Vehicle::factory()->create([
            'status' => 'ACTIVE',
            'route_id' => $this->route->id,
            'driver_id' => $this->driver->id,
            'conductor_id' => $this->conductor->conductorProfile->id,
            'assignment_date' => now('Asia/Manila')->toDateString(),
            'assignment_approved_at' => now(),
        ]);
    }

    public function test_starting_shift_claims_device_and_other_device_cannot_record_cash(): void
    {
        $shift = $this->startShift();

        $this->assertSame(self::WEB_DEVICE, $shift->operating_device_id);
        $this->assertSame('WEB', $shift->operating_device_type);

        $this->actingAs($this->conductor)
            ->postJson('/api/v1/conductor/transactions', $this->cashPayload(self::MOBILE_DEVICE))
            ->assertStatus(409);

        $this->actingAs($this->conductor)
            ->postJson('/api/v1/conductor/transactions', $this->cashPayload(self::WEB_DEVICE))
            ->assertCreated();

        $this->assertDatabaseCount('transactions', 1);
        $this->assertSame(self::WEB_DEVICE, Transaction::first()->source_device_id);
    }

    public function test_shift_can_only_be_handed_off_after_current_device_releases_it(): void
    {
        $shift = $this->startShift();

        $this->actingAs($this->conductor)
            ->postJson('/api/v1/conductor/shifts/device/claim', $this->devicePayload($shift, self::MOBILE_DEVICE, 'MOBILE'))
            ->assertStatus(409);
        $this->actingAs($this->conductor)
            ->postJson('/api/v1/conductor/shifts/device/release', $this->devicePayload($shift, self::MOBILE_DEVICE, 'MOBILE'))
            ->assertStatus(409);

        $this->actingAs($this->conductor)
            ->postJson('/api/v1/conductor/shifts/device/release', $this->devicePayload($shift, self::WEB_DEVICE, 'WEB'))
            ->assertOk()
            ->assertJsonPath('data.operating_device_id', null);
        $this->actingAs($this->conductor)
            ->postJson('/api/v1/conductor/shifts/device/claim', $this->devicePayload($shift, self::MOBILE_DEVICE, 'MOBILE'))
            ->assertOk()
            ->assertJsonPath('data.operating_device_id', self::MOBILE_DEVICE);

        $this->actingAs($this->conductor)
            ->postJson('/api/v1/conductor/transactions', $this->cashPayload(self::WEB_DEVICE))
            ->assertStatus(409);
        $this->actingAs($this->conductor)
            ->postJson('/api/v1/conductor/transactions', $this->cashPayload(self::MOBILE_DEVICE))
            ->assertCreated();
    }

    public function test_only_operating_device_can_remit_and_end_shift(): void
    {
        $shift = $this->startShift();
        $this->recordOnlineCash(self::WEB_DEVICE);

        $payload = [
            'shift_id' => $shift->shift_id,
            'total_collected' => 15,
            'remitted_amount' => 15,
            'device_id' => self::MOBILE_DEVICE,
            'device_type' => 'MOBILE',
        ];
        $this->actingAs($this->conductor)
            ->postJson('/api/v1/conductor/remittances', $payload)
            ->assertStatus(409);
        $this->assertTrue($shift->fresh()->is_active);

        $payload['device_id'] = self::WEB_DEVICE;
        $payload['device_type'] = 'WEB';
        $this->actingAs($this->conductor)
            ->postJson('/api/v1/conductor/remittances', $payload)
            ->assertOk();
        $this->assertFalse($shift->fresh()->is_active);
    }

    public function test_other_device_cannot_initiate_gcash(): void
    {
        $this->startShift();

        $this->actingAs($this->conductor)->postJson('/api/v1/conductor/payments/gcash/initiate', [
            'payment_method' => 'GCASH',
            'pickup_name' => $this->pickup->name,
            'dropoff_name' => $this->dropoff->name,
            'pickup_stop_id' => $this->pickup->id,
            'dropoff_stop_id' => $this->dropoff->id,
            'device_id' => self::MOBILE_DEVICE,
            'device_type' => 'MOBILE',
        ])->assertStatus(409);

        $this->assertDatabaseCount('transactions', 0);
    }

    public function test_offline_cash_recovers_into_auto_ended_shift_and_updates_pending_remittance(): void
    {
        $shift = $this->startShift();
        $this->recordOnlineCash(self::WEB_DEVICE);
        $offlineOccurredAt = now()->toIso8601String();

        app(ShiftCloseoutService::class)->close(
            $shift->shift_id,
            null,
            ShiftCloseoutService::REASON_STALE,
            $this->conductor->conductorProfile->id,
        );
        $this->assertSame(Remittance::STATUS_PENDING, $shift->fresh()->remittance->remittance_status);

        $payload = $this->cashPayload(self::WEB_DEVICE, 'offline-recovery-key');
        $payload['offline_created_at'] = $offlineOccurredAt;
        $this->actingAs($this->conductor)
            ->postJson('/api/v1/conductor/transactions', $payload)
            ->assertCreated();

        $remittance = $shift->fresh()->remittance;
        $this->assertSame(30.0, (float) $remittance->cash_total);
        $this->assertSame(30.0, (float) $remittance->total_collected);
        $this->assertSame(30.0, (float) $remittance->shortage);
        $this->assertSame(2, $remittance->total_passengers);
        $this->assertNotNull(Transaction::where('idempotency_key', 'offline-recovery-key')->first()->synced_at);
    }

    public function test_offline_recovery_is_idempotent(): void
    {
        $shift = $this->startShift();
        $this->recordOnlineCash(self::WEB_DEVICE);
        $offlineOccurredAt = now()->toIso8601String();
        app(ShiftCloseoutService::class)->close(
            $shift->shift_id,
            null,
            ShiftCloseoutService::REASON_STALE,
            $this->conductor->conductorProfile->id,
        );

        $payload = $this->cashPayload(self::WEB_DEVICE, 'same-offline-retry-key');
        $payload['offline_created_at'] = $offlineOccurredAt;
        $this->actingAs($this->conductor)->postJson('/api/v1/conductor/transactions', $payload)->assertCreated();
        $this->actingAs($this->conductor)->postJson('/api/v1/conductor/transactions', $payload)->assertCreated();

        $this->assertSame(1, Transaction::where('idempotency_key', 'same-offline-retry-key')->count());
        $this->assertSame(30.0, (float) $shift->fresh()->remittance->cash_total);
    }

    public function test_grouped_offline_cash_recovers_each_passenger_once(): void
    {
        $shift = $this->startShift();
        $this->recordOnlineCash(self::WEB_DEVICE);
        $offlineOccurredAt = now()->toIso8601String();
        app(ShiftCloseoutService::class)->close(
            $shift->shift_id,
            null,
            ShiftCloseoutService::REASON_STALE,
            $this->conductor->conductorProfile->id,
        );

        $payload = $this->cashPayload(self::WEB_DEVICE, 'offline-group-key');
        $payload['offline_created_at'] = $offlineOccurredAt;
        $payload['group_passengers'] = [
            ['type' => 'REGULAR', 'quantity' => 1],
            ['type' => 'STUDENT', 'quantity' => 1],
        ];
        $this->actingAs($this->conductor)
            ->postJson('/api/v1/conductor/transactions', $payload)
            ->assertCreated();
        $this->actingAs($this->conductor)
            ->postJson('/api/v1/conductor/transactions', $payload)
            ->assertCreated();

        $remittance = $shift->fresh()->remittance;
        $this->assertSame(42.0, (float) $remittance->cash_total);
        $this->assertSame(3, $remittance->total_passengers);
        $this->assertSame(1, PaymentGroup::where('idempotency_key', 'offline-group-key')->count());
    }

    public function test_offline_timestamp_outside_original_shift_is_rejected(): void
    {
        $shift = $this->startShift();
        $this->recordOnlineCash(self::WEB_DEVICE);
        app(ShiftCloseoutService::class)->close(
            $shift->shift_id,
            null,
            ShiftCloseoutService::REASON_STALE,
            $this->conductor->conductorProfile->id,
        );

        $payload = $this->cashPayload(self::WEB_DEVICE, 'outside-shift-key');
        $payload['offline_created_at'] = $shift->time_in->copy()->subHour()->toIso8601String();
        $this->actingAs($this->conductor)
            ->postJson('/api/v1/conductor/transactions', $payload)
            ->assertStatus(422);
        $this->assertDatabaseMissing('transactions', ['idempotency_key' => 'outside-shift-key']);
    }

    public function test_offline_cash_cannot_change_a_completed_remittance(): void
    {
        $shift = $this->startShift();
        $this->recordOnlineCash(self::WEB_DEVICE);
        $offlineOccurredAt = now()->toIso8601String();

        $this->actingAs($this->conductor)->postJson('/api/v1/conductor/remittances', [
            'shift_id' => $shift->shift_id,
            'total_collected' => 15,
            'remitted_amount' => 15,
            'device_id' => self::WEB_DEVICE,
            'device_type' => 'WEB',
        ])->assertOk();

        $payload = $this->cashPayload(self::WEB_DEVICE, 'too-late-offline-key');
        $payload['offline_created_at'] = $offlineOccurredAt;
        $this->actingAs($this->conductor)
            ->postJson('/api/v1/conductor/transactions', $payload)
            ->assertStatus(409);

        $this->assertSame(15.0, (float) $shift->fresh()->remittance->cash_total);
        $this->assertDatabaseMissing('transactions', ['idempotency_key' => 'too-late-offline-key']);
    }

    private function startShift(): ShiftLog
    {
        $this->actingAs($this->conductor)->postJson('/api/v1/conductor/shifts/start', [
            'vehicle_id' => $this->vehicle->id,
            'driver_id' => $this->driver->id,
            'route_id' => $this->route->id,
            'device_id' => self::WEB_DEVICE,
            'device_type' => 'WEB',
        ])->assertCreated();

        return ShiftLog::where('conductor_id', $this->conductor->conductorProfile->id)->firstOrFail();
    }

    private function recordOnlineCash(string $deviceId): void
    {
        $this->actingAs($this->conductor)
            ->postJson('/api/v1/conductor/transactions', $this->cashPayload($deviceId))
            ->assertCreated();
    }

    private function cashPayload(string $deviceId, ?string $idempotencyKey = null): array
    {
        return [
            'shift_id' => ShiftLog::where('conductor_id', $this->conductor->conductorProfile->id)
                ->latest('created_at')
                ->value('shift_id'),
            'payment_method' => 'CASH',
            'pickup_name' => $this->pickup->name,
            'dropoff_name' => $this->dropoff->name,
            'pickup_stop_id' => $this->pickup->id,
            'dropoff_stop_id' => $this->dropoff->id,
            'passenger_role' => 'REGULAR',
            'idempotency_key' => $idempotencyKey ?? 'cash-'.fake()->uuid(),
            'device_id' => $deviceId,
            'device_type' => str_starts_with($deviceId, 'web-') ? 'WEB' : 'MOBILE',
        ];
    }

    private function devicePayload(ShiftLog $shift, string $deviceId, string $deviceType): array
    {
        return [
            'shift_id' => $shift->shift_id,
            'device_id' => $deviceId,
            'device_type' => $deviceType,
        ];
    }
}
