<?php

use Illuminate\Support\Facades\DB;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Str;

/**
 * Replaces the placeholder stops with the cooperative's 33 main places and
 * their sub places (config/chatco_route.php `fare_points`), and sets the
 * Financial Rules to the LTFRB jeepney matrix: ₱17 covers the first 4
 * places and each later place adds ₱2.40, rounded to the nearest ₱0.25 with
 * the discount taken before rounding. Rows are rewritten in place by route order so their ids, and the
 * transactions pointing at them, survive; transactions keep their own
 * pickup/dropoff names, so history is unchanged. Coordinates are cleared
 * because the old ones were placeholders: pin each place in Fare Matrix.
 * The formula is inlined so later changes to FareRules cannot alter this.
 */
return new class extends Migration
{
    private const MINIMUM_FARE = 17.0;

    private const BASE_COUNT = 4;

    private const SUCCEEDING_FARE = 2.40;

    public function up(): void
    {
        $places = config('chatco_route.fare_points');

        DB::transaction(function () use ($places) {
            $rate = DB::table('settings')->where('key', 'discount_rate')->lockForUpdate()->value('value');
            $rate = is_numeric($rate) ? (float) $rate : 20.0;
            $quarter = fn (float $amount) => round(round($amount * 4, 6)) / 4;
            $discounted = fn (float $amount) => round($amount * (100 - $rate) / 100, 2);

            foreach ([
                'base_fare_regular' => self::MINIMUM_FARE,
                'base_barangay_count' => self::BASE_COUNT,
                'succeeding_fare_regular' => self::SUCCEEDING_FARE,
                'base_fare_discounted' => $quarter(self::MINIMUM_FARE * (100 - $rate) / 100),
                'succeeding_fare_discounted' => $discounted(self::SUCCEEDING_FARE),
            ] as $key => $value) {
                $row = [
                    'value' => is_int($value) ? (string) $value : number_format($value, 2, '.', ''),
                    'category' => 'financial',
                    'updated_at' => now(),
                ];
                // settings ids are UUIDs, so a missing key is inserted with one.
                if (! DB::table('settings')->where('key', $key)->update($row)
                    && ! DB::table('settings')->where('key', $key)->exists()) {
                    DB::table('settings')->insert($row + ['id' => (string) Str::uuid(), 'key' => $key, 'created_at' => now()]);
                }
            }

            foreach (DB::table('fare_points')->distinct()->pluck('route_id') as $routeId) {
                $existing = DB::table('fare_points')->where('route_id', $routeId)->lockForUpdate()
                    ->orderBy('point_number')->orderBy('created_at')->pluck('id')->all();

                foreach ($places as $index => $place) {
                    $pointNumber = $index + 1;
                    $amount = self::MINIMUM_FARE + max(0, $pointNumber - self::BASE_COUNT) * self::SUCCEEDING_FARE;
                    $row = [
                        'point_number' => $pointNumber,
                        'code' => $place['code'],
                        'name' => $place['name'],
                        'landmarks' => null,
                        'sub_stops' => json_encode($place['sub_stops'], JSON_UNESCAPED_UNICODE),
                        'regular_fare' => $quarter($amount),
                        'discounted_fare' => $quarter($amount * (100 - $rate) / 100),
                        'latitude' => null,
                        'longitude' => null,
                        'updated_at' => now(),
                    ];

                    if (isset($existing[$index])) {
                        DB::table('fare_points')->where('id', $existing[$index])->update($row);
                    } else {
                        DB::table('fare_points')->insert($row + [
                            'id' => (string) Str::uuid(),
                            'route_id' => $routeId,
                            'created_at' => now(),
                        ]);
                    }
                }

                // Stops past the 33rd: remove them unless a transaction still points at one.
                $extra = array_slice($existing, count($places));
                if ($extra !== []) {
                    $used = DB::table('transactions')
                        ->where(fn ($query) => $query->whereIn('pickup_stop_id', $extra)->orWhereIn('dropoff_stop_id', $extra))
                        ->exists();
                    if ($used) {
                        throw new RuntimeException("Route {$routeId} has stops past #".count($places).' that transactions reference; merge them in Fare Matrix before migrating.');
                    }
                    DB::table('fare_points')->whereIn('id', $extra)->delete();
                }
            }
        });
    }

    public function down(): void
    {
        // Not reversible: the replaced stops were placeholders and are not kept.
    }
};
