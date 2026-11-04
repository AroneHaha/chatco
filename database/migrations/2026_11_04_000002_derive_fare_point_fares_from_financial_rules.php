<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Trips are now priced from the Financial Rules (App\Support\FareRules):
 * minimum fare + max(0, barangays traversed - base count) × succeeding fare,
 * less the discount rate, where barangays traversed = |stop gap| + 1. This rewrites each stop's stored fares to its fare from
 * stop 1 under those rules, closes any point-number gaps per route (a gap
 * would count as a barangay traveled), and stores the derived discounted
 * minimum and succeeding fares. The formula is inlined so later changes to
 * FareRules cannot alter what this migration did.
 */
return new class extends Migration
{
    public function up(): void
    {
        $settings = DB::table('settings')
            ->whereIn('key', ['base_fare_regular', 'discount_rate', 'succeeding_fare_regular', 'base_barangay_count'])
            ->pluck('value', 'key');
        $number = fn (string $key, float $default) => is_numeric($settings[$key] ?? null) ? (float) $settings[$key] : $default;
        $minimum = $number('base_fare_regular', 17.0);
        $rate = $number('discount_rate', 20.0);
        $succeeding = $number('succeeding_fare_regular', 2.25);
        $baseCount = (int) $number('base_barangay_count', 4);
        $discounted = fn (float $regular) => round($regular * (100 - $rate) / 100, 2);

        DB::transaction(function () use ($minimum, $succeeding, $baseCount, $discounted) {
            foreach (DB::table('fare_points')->distinct()->pluck('route_id') as $routeId) {
                $points = DB::table('fare_points')->where('route_id', $routeId)
                    ->orderBy('point_number')->orderBy('created_at')->get(['id']);
                foreach ($points as $index => $point) {
                    // Stop 1 to stop n traverses n barangays (both ends counted).
                    $regular = round($minimum + max(0, ($index + 1) - $baseCount) * $succeeding, 2);
                    DB::table('fare_points')->where('id', $point->id)->update([
                        'point_number' => $index + 1,
                        'regular_fare' => $regular,
                        'discounted_fare' => $discounted($regular),
                    ]);
                }
            }

            foreach ([
                'base_fare_discounted' => $discounted($minimum),
                'succeeding_fare_discounted' => $discounted($succeeding),
            ] as $key => $value) {
                DB::table('settings')->updateOrInsert(
                    ['key' => $key],
                    ['value' => number_format($value, 2, '.', ''), 'category' => 'financial', 'updated_at' => now()],
                );
            }
        });
    }

    public function down(): void
    {
        // Not reversible: the previous hand-entered stop fares are not kept.
    }
};
