<?php

namespace Tests\Feature;

use App\Models\FarePoint;
use App\Models\Route;
use App\Models\Setting;
use App\Services\FareCalculationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class FareAmountUpdateTest extends TestCase
{
    use RefreshDatabase;

    public function test_fares_follow_the_rules_in_both_directions_whatever_the_stored_stop_fares(): void
    {
        // Exercise code defaults (₱17, 4 barangays, ₱2.40, 20%) independently of persisted settings.
        Setting::whereIn('key', ['base_fare_regular', 'base_fare_discounted', 'discount_rate', 'succeeding_fare_regular', 'base_barangay_count'])->delete();
        $route = Route::create(['name' => 'Fare test', 'status' => 'ACTIVE']);
        // Stored stop fares are deliberately wrong: trips are priced from the rules.
        $pickup = $this->point($route, 1, 99.00, 99.00);
        $nearby = $this->point($route, 4, 0.00, 0.00);
        $farther = $this->point($route, 10, 1.00, 1.00);
        $service = app(FareCalculationService::class);

        // Barangays traversed count both ends: 1→4 is 4 = minimum fare;
        // 1→10 is 10 = 17 + 6 × 2.40 = 31.40 → 31.50, and 25.12 → 25.00
        // discounted, matching the LTFRB 10 km row (nearest ₱0.25).
        foreach ([[$pickup, $nearby, 17.00, 13.50], [$pickup, $farther, 31.50, 25.00]] as [$from, $to, $regular, $discounted]) {
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
        // The rules this migration ran under; a later migration moves to ₱2.40.
        Setting::updateOrCreate(['key' => 'base_barangay_count'], ['value' => '4', 'category' => 'financial']);
        Setting::updateOrCreate(['key' => 'succeeding_fare_regular'], ['value' => '2.25', 'category' => 'financial']);
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

    public function test_cooperative_matrix_migration_rewrites_stops_in_place_and_sets_the_rules(): void
    {
        Setting::updateOrCreate(['key' => 'base_fare_regular'], ['value' => '18.00', 'category' => 'financial']);
        Setting::updateOrCreate(['key' => 'base_barangay_count'], ['value' => '4', 'category' => 'financial']);
        $route = Route::create(['name' => 'Matrix test', 'status' => 'ACTIVE']);
        $first = $this->point($route, 1, 18.00, 14.40);
        $sixth = $this->point($route, 6, 22.50, 18.00);
        $extra = $this->point($route, 40, 99.00, 99.00); // 3rd stop by order: becomes C.I.
        $unused = array_map(fn ($n) => $this->point($route, $n, 1.00, 1.00), range(41, 72)); // 32 more: 35 total

        (require database_path('migrations/2026_11_05_000002_replace_fare_points_with_cooperative_fare_matrix.php'))->up();

        $points = FarePoint::where('route_id', $route->id)->orderBy('point_number')->get();
        $this->assertCount(33, $points);
        $this->assertSame(range(1, 33), $points->pluck('point_number')->all());
        // Ids survive: the first stops by order are rewritten, the 2 left over are deleted.
        $this->assertSame('Calumpit', $first->fresh()->name);
        $this->assertSame(['Gatbuca', 'Crossing', 'Caltex'], $first->fresh()->sub_stops);
        $this->assertNull($first->fresh()->latitude);
        $this->assertSame('Bagbag', $extra->fresh()->name);
        $this->assertNull($unused[31]->fresh());
        // LTFRB rule: ₱17 for the first 4, +₱2.40 each, nearest ₱0.25, discount
        // before rounding. Borneo (5) 19.40 → 19.50; place 12 is ₱36.25 / ₱29.00.
        $this->assertSame(['17.00', '17.00', '19.50', '36.25'], $points->whereIn('point_number', [1, 4, 5, 12])->pluck('regular_fare')->values()->all());
        $this->assertSame(['13.50', '15.50', '29.00'], $points->whereIn('point_number', [4, 5, 12])->pluck('discounted_fare')->values()->all());
        $this->assertSame('86.50', $points->last()->regular_fare);
        $this->assertSame('69.25', $points->last()->discounted_fare);
        $this->assertSame('Banga', $points->last()->name);
        $this->assertSame('17.00', Setting::where('key', 'base_fare_regular')->value('value'));
        $this->assertSame('4', Setting::where('key', 'base_barangay_count')->value('value'));
        $this->assertSame('2.40', Setting::where('key', 'succeeding_fare_regular')->value('value'));
        $this->assertSame('13.50', Setting::where('key', 'base_fare_discounted')->value('value'));
        $this->assertSame(86.50, app(FareCalculationService::class)->fareBetween($points->first(), $points->last(), false));
        // Balagtas (21) to Meycauayan (32): 12 places, the interviewed student's trip.
        $balagtas = $points->firstWhere('point_number', 21);
        $meycauayan = $points->firstWhere('point_number', 32);
        $this->assertSame(36.25, app(FareCalculationService::class)->fareBetween($balagtas, $meycauayan, false));
        $this->assertSame(29.00, app(FareCalculationService::class)->fareBetween($meycauayan, $balagtas, true));
    }

    public function test_cooperative_matrix_migration_refuses_to_drop_a_stop_a_transaction_uses(): void
    {
        $route = Route::create(['name' => 'Matrix guard test', 'status' => 'ACTIVE']);
        foreach (range(1, 33) as $n) {
            $this->point($route, $n, 17.00, 13.60);
        }
        $used = $this->point($route, 34, 17.00, 13.60);
        // Only the stop reference matters here; the test transaction rolls back before the shift FK is checked.
        DB::statement('PRAGMA defer_foreign_keys = ON');
        DB::table('transactions')->insert([
            'transaction_id' => 'TXN-GUARD', 'shift_id' => 'S-1', 'payment_method' => 'CASH', 'final_amount' => 17,
            'status' => 'PAID', 'pickup_stop_id' => $used->id, 'dropoff_stop_id' => $used->id,
        ]);

        try {
            (require database_path('migrations/2026_11_05_000002_replace_fare_points_with_cooperative_fare_matrix.php'))->up();
            $this->fail('Expected the migration to stop.');
        } catch (\RuntimeException $e) {
            $this->assertStringContainsString('transactions reference', $e->getMessage());
        }

        // Rolled back as a whole: nothing renamed, the used stop kept.
        $this->assertSame('Point 1', FarePoint::where('route_id', $route->id)->where('point_number', 1)->value('name'));
        $this->assertNotNull($used->fresh());
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
