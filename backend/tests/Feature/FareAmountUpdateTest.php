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

    public function test_new_minimum_and_twenty_percent_discount_apply_in_both_directions(): void
    {
        // Exercise code defaults independently of persisted settings.
        Setting::whereIn('key', ['base_fare_regular', 'base_fare_discounted'])->delete();
        $route = Route::create(['name' => 'Fare test', 'status' => 'ACTIVE']);
        $pickup = $this->point($route, 1, 17.00, 13.60);
        $nearby = $this->point($route, 2, 19.25, 15.40);
        $farther = $this->point($route, 3, 37.00, 29.60);
        $service = app(FareCalculationService::class);

        foreach ([[$pickup, $nearby, 17.00, 13.60], [$pickup, $farther, 20.00, 16.00]] as [$from, $to, $regular, $discounted]) {
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
