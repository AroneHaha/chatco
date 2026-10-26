<?php

namespace Tests\Feature;

use App\Events\FaresUpdated;
use App\Models\FarePoint;
use App\Models\Route;
use App\Models\Setting;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Tests\TestCase;

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
            'name' => 'Paliwas', 'regular_fare' => 17, 'discounted_fare' => 13.6,
        ]);
        $this->far = FarePoint::create([
            'route_id' => $route->id, 'point_number' => 2, 'code' => 'DAM',
            'name' => 'Dampol', 'regular_fare' => 21.5, 'discounted_fare' => 17.2,
        ]);
        Setting::updateOrCreate(['key' => 'base_fare_regular'], ['value' => '17.00', 'category' => 'financial']);
    }

    private function save(string $key, mixed $value)
    {
        return $this->actingAs($this->admin)->putJson("/api/v1/admin/settings/{$key}", [
            'value' => $value, 'category' => 'financial',
        ]);
    }

    public function test_raising_the_minimum_fare_shifts_every_fare_and_keeps_the_gaps(): void
    {
        $this->save('base_fare_regular', '19')->assertOk()->assertJsonPath('data.value', '19.00');

        $this->assertSame('19.00', $this->first->fresh()->regular_fare);
        $this->assertSame('23.50', $this->far->fresh()->regular_fare);
        $this->assertSame('15.20', $this->first->fresh()->discounted_fare);
        $this->assertSame('18.80', $this->far->fresh()->discounted_fare);
        $this->assertSame('15.20', Setting::where('key', 'base_fare_discounted')->value('value'));
        $this->assertSame('1.80', Setting::where('key', 'succeeding_fare_discounted')->value('value'));
    }

    public function test_lowering_the_minimum_fare_reverses_the_shift(): void
    {
        $this->save('base_fare_regular', 19)->assertOk();
        $this->save('base_fare_regular', 17)->assertOk();

        $this->assertSame('17.00', $this->first->fresh()->regular_fare);
        $this->assertSame('21.50', $this->far->fresh()->regular_fare);
        $this->assertSame('17.20', $this->far->fresh()->discounted_fare);
        $this->assertSame('13.60', Setting::where('key', 'base_fare_discounted')->value('value'));
    }

    public function test_discount_rate_reprices_discounted_fares_without_touching_regular_fares(): void
    {
        $this->save('discount_rate', 25)->assertOk()->assertJsonPath('data.value', '25.00');

        $this->assertSame('17.00', $this->first->fresh()->regular_fare);
        $this->assertSame('12.75', $this->first->fresh()->discounted_fare);
        $this->assertSame('16.13', $this->far->fresh()->discounted_fare);
        $this->assertSame('12.75', Setting::where('key', 'base_fare_discounted')->value('value'));

        // A later minimum change uses the saved rate, not the 20% default.
        $this->save('base_fare_regular', 19)->assertOk();
        $this->assertSame('14.25', $this->first->fresh()->discounted_fare);
    }

    public function test_resaving_the_same_minimum_fare_changes_nothing(): void
    {
        $this->save('base_fare_regular', '17')->assertOk();

        $this->assertSame('17.00', $this->first->fresh()->regular_fare);
        $this->assertSame('21.50', $this->far->fresh()->regular_fare);
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

        $this->assertSame('17.00', $this->first->fresh()->regular_fare);
        $this->assertSame('13.60', $this->first->fresh()->discounted_fare);
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
        $this->save('base_fare_regular', '1000.01')->assertStatus(422);

        $this->assertNull($token->accessToken->fresh()->expires_at);
        Event::assertNotDispatched(FaresUpdated::class);
    }

    public function test_minimum_fare_that_would_make_a_stop_negative_is_rejected(): void
    {
        $this->first->update(['regular_fare' => 5]);

        $this->save('base_fare_regular', 10)->assertStatus(422)->assertJsonValidationErrors('value');

        $this->assertSame('5.00', $this->first->fresh()->regular_fare);
        $this->assertSame('17.00', Setting::where('key', 'base_fare_regular')->value('value'));
    }
}
