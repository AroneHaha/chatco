<?php

namespace Tests\Feature;

use App\Models\FarePoint;
use App\Models\Route;
use App\Models\Setting;
use App\Services\FareCalculationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class FareAmountUpdateTest extends TestCase
{
    use RefreshDatabase;

    public function test_fares_follow_the_rules_in_both_directions_whatever_the_stored_stop_fares(): void
    {
        // Exercise code defaults (₱17, 4 barangays, ₱2.25, 20%) independently of persisted settings.
        Setting::whereIn('key', ['base_fare_regular', 'base_fare_discounted', 'discount_rate', 'succeeding_fare_regular', 'base_barangay_count'])->delete();
        $route = Route::create(['name' => 'Fare test', 'status' => 'ACTIVE']);
        // Stored stop fares are deliberately wrong: trips are priced from the rules.
        $pickup = $this->point($route, 1, 99.00, 99.00);
        $nearby = $this->point($route, 4, 0.00, 0.00);
        $farther = $this->point($route, 10, 1.00, 1.00);
        $service = app(FareCalculationService::class);

        // Barangays traversed count both ends: 1→4 is 4 = minimum fare;
        // 1→10 is 10 = 17 + 6 × 2.25 = 30.50 (24.40 discounted).
        foreach ([[$pickup, $nearby, 17.00, 13.60], [$pickup, $farther, 30.50, 24.40]] as [$from, $to, $regular, $discounted]) {
            $this->assertSame($regular, $service->fareBetween($from, $to, false));
            $this->assertSame($discounted, $service->fareBetween($from, $to, true));
            $this->assertSame($regular, $service->fareBetween($to, $from, false));
            $this->assertSame($discounted, $service->fareBetween($to, $from, true));
        }
    }

    public function test_existing_fares_increase_by_two_and_rollback_restores_exact_amounts(): void
    {
        $migration = require database_path('migrations/2026_10_13_000001_increase_minimum_fare_to_17.php');
        $migration->down();
        Setting::create(['key' => 'base_fare_regular', 'value' => '15.00', 'category' => 'financial']);
        $route = Route::create(['name' => 'Fare update test', 'status' => 'ACTIVE']);
        $minimum = $this->point($route, 1, 15.00, 12.00);
        $later = $this->point($route, 2, 19.50, 15.50);

        $migration->up();

        $this->assertSame(17.00, (float) $minimum->fresh()->regular_fare);
        $this->assertSame(13.60, (float) $minimum->fresh()->discounted_fare);
        $this->assertSame(21.50, (float) $later->fresh()->regular_fare);
        $this->assertSame(17.20, (float) $later->fresh()->discounted_fare);
        $this->assertSame('17.00', Setting::where('key', 'base_fare_regular')->value('value'));
        $this->assertSame('13.60', Setting::where('key', 'base_fare_discounted')->value('value'));

        $migration->down();

        $this->assertSame(15.00, (float) $minimum->fresh()->regular_fare);
        $this->assertSame(12.00, (float) $minimum->fresh()->discounted_fare);
        $this->assertSame(19.50, (float) $later->fresh()->regular_fare);
        $this->assertSame(15.50, (float) $later->fresh()->discounted_fare);
        $this->assertSame('15.00', Setting::where('key', 'base_fare_regular')->value('value'));
        $this->assertNull(Setting::where('key', 'base_fare_discounted')->value('value'));
    }

    public function test_migration_derives_stop_fares_from_the_rules_and_closes_gaps(): void
    {
        Setting::updateOrCreate(['key' => 'base_fare_regular'], ['value' => '18.00', 'category' => 'financial']);
        $route = Route::create(['name' => 'Migration test', 'status' => 'ACTIVE']);
        // Old hand-entered fares and a gap (no point 3).
        $points = [
            $this->point($route, 1, 18.00, 14.40),
            $this->point($route, 2, 18.00, 14.40),
            $this->point($route, 4, 18.00, 14.40),
            $this->point($route, 5, 20.25, 16.20),
            $this->point($route, 6, 22.50, 18.00),
            $this->point($route, 7, 24.75, 19.80),
        ];

        (require database_path('migrations/2026_11_04_000002_derive_fare_point_fares_from_financial_rules.php'))->up();

        $fresh = array_map(fn (FarePoint $point) => $point->fresh(), $points);
        $this->assertSame([1, 2, 3, 4, 5, 6], array_map(fn ($point) => $point->point_number, $fresh));
        // Fare from stop 1: ₱18 up to stop 4, then +₱2.25 per stop.
        $this->assertSame(['18.00', '18.00', '18.00', '18.00', '20.25', '22.50'], array_map(fn ($point) => $point->regular_fare, $fresh));
        $this->assertSame('18.00', $fresh[5]->discounted_fare);
        $this->assertSame('14.40', Setting::where('key', 'base_fare_discounted')->value('value'));
        $this->assertSame('1.80', Setting::where('key', 'succeeding_fare_discounted')->value('value'));
    }

    private function point(Route $route, int $number, float $regular, float $discounted): FarePoint
    {
        return FarePoint::create([
            'route_id' => $route->id,
            'point_number' => $number,
            'code' => 'P'.$number,
            'name' => 'Point '.$number,
            'regular_fare' => $regular,
            'discounted_fare' => $discounted,
        ]);
    }
}
