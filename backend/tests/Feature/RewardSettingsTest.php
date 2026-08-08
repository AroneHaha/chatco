<?php

namespace Tests\Feature;

use App\Enums\PaymentMethod;
use App\Enums\PaymentStatus;
use App\Enums\ShiftStatus;
use App\Models\Driver;
use App\Models\Setting;
use App\Models\ShiftLog;
use App\Models\Transaction;
use App\Models\User;
use App\Models\Vehicle;
use App\Models\Voucher;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class RewardSettingsTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_save_integer_reward_threshold_at_supported_boundaries(): void
    {
        $admin = User::factory()->admin()->create();

        foreach ([1, Setting::MAX_RIDES_FOR_FREE_REWARD] as $threshold) {
            $this->actingAs($admin)
                ->putJson('/api/v1/admin/settings/'.Setting::RIDES_FOR_FREE_REWARD_KEY, [
                    'value' => $threshold,
                    'category' => 'financial',
                ])
                ->assertOk()
                ->assertJsonPath('success', true)
                ->assertJsonPath('data.key', Setting::RIDES_FOR_FREE_REWARD_KEY)
                ->assertJsonPath('data.value', (string) $threshold)
                ->assertJsonPath('data.category', 'financial')
                ->assertJsonPath('message', 'Setting updated successfully');

            $this->assertDatabaseHas('settings', [
                'key' => Setting::RIDES_FOR_FREE_REWARD_KEY,
                'value' => (string) $threshold,
            ]);
        }
    }

    #[DataProvider('invalidRewardThresholdProvider')]
    public function test_admin_cannot_save_invalid_reward_threshold(mixed $value): void
    {
        $admin = User::factory()->admin()->create();

        $this->actingAs($admin)
            ->putJson('/api/v1/admin/settings/'.Setting::RIDES_FOR_FREE_REWARD_KEY, [
                'value' => $value,
                'category' => 'financial',
            ])
            ->assertStatus(422)
            ->assertJsonPath('success', false)
            ->assertJsonPath('message', 'Validation failed')
            ->assertJsonValidationErrors('value');

        $this->assertDatabaseMissing('settings', [
            'key' => Setting::RIDES_FOR_FREE_REWARD_KEY,
        ]);
    }

    public static function invalidRewardThresholdProvider(): array
    {
        return [
            'zero' => [0],
            'negative' => [-1],
            'decimal number' => [2.5],
            'decimal text' => ['2.5'],
            'invalid text' => ['ten'],
            'empty text' => [''],
            'null' => [null],
            'above maximum' => [Setting::MAX_RIDES_FOR_FREE_REWARD + 1],
        ];
    }

    public function test_admin_cannot_omit_reward_threshold(): void
    {
        $admin = User::factory()->admin()->create();

        $this->actingAs($admin)
            ->putJson('/api/v1/admin/settings/'.Setting::RIDES_FOR_FREE_REWARD_KEY, [
                'category' => 'financial',
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors('value');
    }

    #[DataProvider('unsafeStoredRewardThresholdProvider')]
    public function test_reward_calculation_falls_back_for_unsafe_stored_threshold(string $storedValue): void
    {
        $commuter = User::factory()->commuter()->create();
        Setting::create([
            'key' => Setting::RIDES_FOR_FREE_REWARD_KEY,
            'value' => $storedValue,
            'category' => 'financial',
        ]);

        $this->actingAs($commuter)
            ->getJson('/api/v1/commuter/rewards')
            ->assertOk()
            ->assertJsonPath('data.ridesNeeded', Setting::DEFAULT_RIDES_FOR_FREE_REWARD)
            ->assertJsonPath('data.currentCycleRides', 0);
    }

    public static function unsafeStoredRewardThresholdProvider(): array
    {
        return [
            'zero' => ['0'],
            'negative' => ['-5'],
            'decimal' => ['2.5'],
            'invalid text' => ['invalid'],
            'above maximum' => [(string) (Setting::MAX_RIDES_FOR_FREE_REWARD + 1)],
        ];
    }

    public function test_reward_progress_uses_valid_configured_threshold(): void
    {
        $commuter = User::factory()->commuter()->create();
        Setting::create([
            'key' => Setting::RIDES_FOR_FREE_REWARD_KEY,
            'value' => '3',
            'category' => 'financial',
        ]);

        $shift = $this->createShift();
        for ($ride = 1; $ride <= 7; $ride++) {
            Transaction::forceCreate([
                'transaction_id' => 'TXN-RWD-'.str_pad((string) $ride, 4, '0', STR_PAD_LEFT),
                'shift_id' => $shift->shift_id,
                'payment_method' => PaymentMethod::CASH->value,
                'status' => PaymentStatus::PAID->value,
                'final_amount' => 15,
                'passenger_id' => $commuter->commuterProfile->id,
                'pickup_name' => 'Pickup',
                'dropoff_name' => 'Dropoff',
                'paid_at' => now(),
                'reward_eligible' => true,
            ]);
        }

        $this->actingAs($commuter)
            ->getJson('/api/v1/commuter/rewards')
            ->assertOk()
            ->assertJsonPath('data.totalRides', 7)
            ->assertJsonPath('data.ridesNeeded', 3)
            ->assertJsonPath('data.currentCycleRides', 1)
            ->assertJsonCount(2, 'data.vouchers');
    }

    public function test_rewards_normalizes_expired_vouchers_before_listing_and_badge_counting(): void
    {
        $commuter = User::factory()->commuter()->create();
        $expired = $this->createVoucher($commuter, 'EXPIRED-LIST', [
            'expires_at' => now()->subMinute(),
        ]);
        $available = $this->createVoucher($commuter, 'VALID-LIST', [
            'expires_at' => now()->addDay(),
        ]);

        $this->actingAs($commuter)
            ->getJson('/api/v1/commuter/rewards')
            ->assertOk()
            ->assertJsonPath('data.availableVoucherCount', 1)
            ->assertJsonFragment([
                'id' => $expired->id,
                'status' => Voucher::STATUS_EXPIRED,
            ])
            ->assertJsonFragment([
                'id' => $available->id,
                'status' => Voucher::STATUS_AVAILABLE,
            ]);

        $this->assertSame(Voucher::STATUS_EXPIRED, $expired->fresh()->status);
        $this->assertSame(Voucher::STATUS_AVAILABLE, $available->fresh()->status);
    }

    public function test_expiration_normalization_does_not_rewrite_other_voucher_states(): void
    {
        $commuter = User::factory()->commuter()->create();
        $used = $this->createVoucher($commuter, 'USED-EXPIRED', [
            'status' => 'USED',
            'expires_at' => now()->subMinute(),
        ]);
        $alreadyExpired = $this->createVoucher($commuter, 'OLD-EXPIRED', [
            'status' => Voucher::STATUS_EXPIRED,
            'expires_at' => now()->subMinute(),
        ]);

        $this->actingAs($commuter)
            ->getJson('/api/v1/commuter/rewards')
            ->assertOk()
            ->assertJsonPath('data.availableVoucherCount', 0);

        $this->assertSame('USED', $used->fresh()->status);
        $this->assertSame(Voucher::STATUS_EXPIRED, $alreadyExpired->fresh()->status);
    }

    private function createVoucher(User $commuter, string $code, array $overrides = []): Voucher
    {
        return Voucher::create(array_merge([
            'code' => $code,
            'commuter_id' => $commuter->commuterProfile->id,
            'type' => 'REWARD',
            'status' => Voucher::STATUS_AVAILABLE,
            'amount' => 0,
            'expires_at' => now()->addDays(30),
            'ride_origin' => 'Reward Test',
        ], $overrides));
    }

    private function createShift(): ShiftLog
    {
        $conductor = User::factory()->conductor()->create();
        $vehicle = Vehicle::factory()->create();
        $driver = Driver::factory()->create();

        return ShiftLog::create([
            'shift_id' => 'SFT-REWARD-TEST',
            'conductor_id' => $conductor->id,
            'driver_id' => $driver->id,
            'vehicle_id' => $vehicle->id,
            'conductor_name' => 'Reward Conductor',
            'driver_name' => 'Reward Driver',
            'unit_number' => $vehicle->unit_number,
            'plate_number' => $vehicle->plate_number,
            'time_in' => now(),
            'is_active' => false,
            'status' => ShiftStatus::ENDED->value,
        ]);
    }
}
