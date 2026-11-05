<?php

namespace Tests\Feature;

use App\Events\FaresUpdated;
use App\Models\FarePoint;
use App\Models\Route;
use App\Models\Setting;
use App\Models\User;
use App\Services\FareCalculationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Tests\TestCase;

/**
 * Fares come from the Financial Rules: minimum fare + max(0, barangays
 * traversed - base count) × succeeding fare, less the discount rate. Stop 1
 * to stop 7 traverses 7 barangays, so with ₱17, a base count of 4, ₱2.40 and
 * 20% it is 17 + 3 × 2.40 = 24.20 → ₱24.25 and 19.36 → ₱19.25 discounted
 * (nearest ₱0.25, discount before rounding: the LTFRB 7 km row).
 */
class FareRuleSettingsTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    private FarePoint $first;

    private FarePoint $far;

    protected function setUp(): void
    {
        parent::setUp();
        $this->admin = User::factory()->admin()->create();
        $route = Route::factory()->create();
        $this->first = FarePoint::create([
            'route_id' => $route->id, 'point_number' => 1, 'code' => 'PAL',
            'name' => 'Paliwas', 'regular_fare' => 17, 'discounted_fare' => 13.5,
        ]);
        $this->far = FarePoint::create([
            'route_id' => $route->id, 'point_number' => 7, 'code' => 'DAM',
            'name' => 'Dampol', 'regular_fare' => 24.25, 'discounted_fare' => 19.25,
        ]);
        Setting::updateOrCreate(['key' => 'base_fare_regular'], ['value' => '17.00', 'category' => 'financial']);
        Setting::updateOrCreate(['key' => 'base_barangay_count'], ['value' => '4', 'category' => 'financial']);
        Setting::updateOrCreate(['key' => 'succeeding_fare_regular'], ['value' => '2.40', 'category' => 'financial']);
    }

    private function save(string $key, mixed $value)
    {
        return $this->actingAs($this->admin)->putJson("/api/v1/admin/settings/{$key}", [
            'value' => $value, 'category' => 'financial',
        ]);
    }

    private function trip(bool $discounted = false): float
    {
        return app(FareCalculationService::class)->fareBetween($this->first, $this->far->fresh(), $discounted);
    }

    public function test_raising_the_minimum_fare_reprices_every_stop_and_trip(): void
    {
        $this->save('base_fare_regular', '19')->assertOk()->assertJsonPath('data.value', '19.00');

        $this->assertSame('19.00', $this->first->fresh()->regular_fare);
        $this->assertSame('26.25', $this->far->fresh()->regular_fare); // 26.20
        $this->assertSame('15.25', $this->first->fresh()->discounted_fare); // 15.20
        $this->assertSame('21.00', $this->far->fresh()->discounted_fare); // 20.96
        $this->assertSame('15.25', Setting::where('key', 'base_fare_discounted')->value('value'));
        $this->assertSame('1.92', Setting::where('key', 'succeeding_fare_discounted')->value('value'));
        // A trip is priced by the same rules the stops show.
        $this->assertSame(26.25, $this->trip());
        $this->assertSame(21.00, $this->trip(true));
    }

    public function test_lowering_the_minimum_fare_reverses_the_change(): void
    {
        $this->save('base_fare_regular', 19)->assertOk();
        $this->save('base_fare_regular', 17)->assertOk();

        $this->assertSame('17.00', $this->first->fresh()->regular_fare);
        $this->assertSame('24.25', $this->far->fresh()->regular_fare);
        $this->assertSame('19.25', $this->far->fresh()->discounted_fare);
        $this->assertSame('13.50', Setting::where('key', 'base_fare_discounted')->value('value'));
    }

    public function test_discount_rate_reprices_discounted_fares_without_touching_regular_fares(): void
    {
        $this->save('discount_rate', 25)->assertOk()->assertJsonPath('data.value', '25.00');

        $this->assertSame('17.00', $this->first->fresh()->regular_fare);
        $this->assertSame('12.75', $this->first->fresh()->discounted_fare);
        $this->assertSame('18.25', $this->far->fresh()->discounted_fare); // 24.20 × 0.75 = 18.15
        $this->assertSame('12.75', Setting::where('key', 'base_fare_discounted')->value('value'));

        // A later minimum change uses the saved rate, not the 20% default.
        $this->save('base_fare_regular', 19)->assertOk();
        $this->assertSame('14.25', $this->first->fresh()->discounted_fare);
    }

    public function test_succeeding_fare_and_base_count_reprice_stops_and_trips(): void
    {
        $this->save('succeeding_fare_regular', 3)->assertOk()->assertJsonPath('data.value', '3.00');
        $this->assertSame('26.00', $this->far->fresh()->regular_fare);
        $this->assertSame('2.40', Setting::where('key', 'succeeding_fare_discounted')->value('value'));

        $this->save('base_barangay_count', 2)->assertOk()->assertJsonPath('data.value', '2');
        $this->assertSame('32.00', $this->far->fresh()->regular_fare);
        $this->assertSame('25.50', $this->far->fresh()->discounted_fare); // 25.60
        $this->assertSame(32.00, $this->trip());
        $this->assertSame(25.50, $this->trip(true));

        $this->getJson('/api/v1/fare-matrix?route_id='.$this->first->route_id)->assertOk()
            ->assertJsonPath('data.config.baseBarangayCount', 2)
            ->assertJsonPath('data.config.succeedingFareRegular', 3)
            ->assertJsonPath('data.config.discountRate', 20)
            ->assertJsonPath('data.points.1.regularFare', 32);
    }

    public function test_resaving_the_same_minimum_fare_changes_nothing(): void
    {
        $this->save('base_fare_regular', '17')->assertOk();

        $this->assertSame('17.00', $this->first->fresh()->regular_fare);
        $this->assertSame('24.25', $this->far->fresh()->regular_fare);
        $this->assertDatabaseMissing('activity_logs', ['description' => 'Changed Minimum fare (₱) from 17.00 to 17.00']);
    }

    public function test_invalid_fare_rules_are_rejected_and_leave_fares_untouched(): void
    {
        foreach (['0', '1000.01', '17.005', 'abc'] as $minimum) {
            $this->save('base_fare_regular', $minimum)->assertStatus(422);
        }
        foreach (['-1', '100.5', '20.123'] as $rate) {
            $this->save('discount_rate', $rate)->assertStatus(422);
        }
        foreach (['-0.25', '1000.01', '2.255'] as $succeeding) {
            $this->save('succeeding_fare_regular', $succeeding)->assertStatus(422);
        }
        foreach (['-1', '2.5', '101'] as $count) {
            $this->save('base_barangay_count', $count)->assertStatus(422);
        }

        $this->assertSame('17.00', $this->first->fresh()->regular_fare);
        $this->assertSame('13.50', $this->first->fresh()->discounted_fare);
        $this->assertSame('24.25', $this->far->fresh()->regular_fare);
    }

    public function test_a_fare_change_signs_out_every_conductor_after_a_grace_period(): void
    {
        Event::fake([FaresUpdated::class]);
        $this->freezeSecond();
        $conductorWeb = User::factory()->conductor()->create()->createToken('auth-token:WEB');
        $conductorMobile = User::factory()->conductor()->create()->createToken('auth-token:MOBILE');
        $commuter = User::factory()->commuter()->create()->createToken('auth-token:WEB');
        $adminToken = $this->admin->createToken('auth-token');

        $this->save('base_fare_regular', 19)->assertOk();

        $graceEnd = now()->addSeconds(20)->toDateTimeString();
        $this->assertSame($graceEnd, $conductorWeb->accessToken->fresh()->expires_at->toDateTimeString());
        $this->assertSame($graceEnd, $conductorMobile->accessToken->fresh()->expires_at->toDateTimeString());
        $this->assertNull($commuter->accessToken->fresh()->expires_at);
        $this->assertNull($adminToken->accessToken->fresh()->expires_at);
        Event::assertDispatched(FaresUpdated::class, fn (FaresUpdated $event) => $event->signOutInSeconds === 20);

        // Still usable during the grace period, rejected after it.
        $this->app['auth']->forgetGuards();
        $this->withToken($conductorWeb->plainTextToken)->getJson('/api/v1/user')->assertOk();
        $this->travel(21)->seconds();
        $this->app['auth']->forgetGuards();
        $this->withToken($conductorWeb->plainTextToken)->getJson('/api/v1/user')->assertUnauthorized();
        $this->app['auth']->forgetGuards();
        $this->withToken($commuter->plainTextToken)->getJson('/api/v1/user')->assertOk();
    }

    public function test_discount_rate_change_also_signs_out_conductors(): void
    {
        Event::fake([FaresUpdated::class]);
        $token = User::factory()->conductor()->create()->createToken('auth-token:WEB');

        $this->save('discount_rate', 25)->assertOk();

        $this->assertNotNull($token->accessToken->fresh()->expires_at);
        Event::assertDispatchedTimes(FaresUpdated::class, 1);
    }

    public function test_saving_unchanged_fare_rules_keeps_conductors_signed_in(): void
    {
        Event::fake([FaresUpdated::class]);
        $token = User::factory()->conductor()->create()->createToken('auth-token:WEB');

        $this->save('base_fare_regular', '17')->assertOk();
        $this->save('discount_rate', '20')->assertOk();
        $this->save('succeeding_fare_regular', '2.40')->assertOk();
        $this->save('base_barangay_count', '4')->assertOk();
        $this->save('base_fare_regular', '1000.01')->assertStatus(422);

        $this->assertNull($token->accessToken->fresh()->expires_at);
        Event::assertNotDispatched(FaresUpdated::class);
    }

    public function test_deleting_a_stop_closes_the_gap_and_reprices_later_stops(): void
    {
        $middle = FarePoint::create([
            'route_id' => $this->first->route_id, 'point_number' => 2, 'code' => 'MID',
            'name' => 'Middle', 'regular_fare' => 17, 'discounted_fare' => 13.6,
        ]);
        $this->far->update(['point_number' => 3]);

        $this->actingAs($this->admin)->deleteJson("/api/v1/admin/fare-points/{$middle->id}")->assertOk();

        $this->assertSame(2, $this->far->fresh()->point_number);
        $this->assertSame('17.00', $this->far->fresh()->regular_fare);
        $this->assertSame(17.00, $this->trip());
    }
}
