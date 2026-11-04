<?php

namespace App\Support;

use App\Models\FarePoint;
use App\Models\Setting;

/**
 * The one fare formula (Settings > Financial Rules):
 *
 *   regular    = minimum fare + max(0, barangays traversed - base count) × succeeding fare
 *   discounted = regular less the discount rate (Student, Senior Citizen, PWD)
 *
 * Barangays traversed counts both ends: |dropoff - pickup| + 1, the same
 * count the fare explanation shows riders (stop 1 to stop 6 is 6 barangays).
 * Every price (charging, calculators, previews) comes from here. The
 * fare_points columns are a stored copy of each stop's fare from stop 1,
 * kept in sync by syncStopFares() and never used to price a trip.
 */
final class FareRules
{
    public const MINIMUM_FARE_KEY = 'base_fare_regular';

    public const DISCOUNT_RATE_KEY = 'discount_rate';

    public const SUCCEEDING_FARE_KEY = 'succeeding_fare_regular';

    public const BASE_BARANGAY_COUNT_KEY = 'base_barangay_count';

    public const KEYS = [
        self::MINIMUM_FARE_KEY,
        self::DISCOUNT_RATE_KEY,
        self::SUCCEEDING_FARE_KEY,
        self::BASE_BARANGAY_COUNT_KEY,
    ];

    /** Used until an admin saves a value; match the seeded fares. */
    public const DEFAULTS = [
        self::MINIMUM_FARE_KEY => 17.0,
        self::DISCOUNT_RATE_KEY => 20.0,
        self::SUCCEEDING_FARE_KEY => 2.25,
        self::BASE_BARANGAY_COUNT_KEY => 4,
    ];

    public function __construct(
        public readonly float $minimumFare,
        public readonly float $discountRate,
        public readonly float $succeedingFare,
        public readonly int $baseBarangayCount,
    ) {}

    /** Current rules in one query. Pass $lock inside a transaction that changes them. */
    public static function current(bool $lock = false): self
    {
        $query = Setting::whereIn('key', self::KEYS);
        if ($lock) {
            $query->lockForUpdate();
        }

        return self::fromValues($query->pluck('value', 'key')->all());
    }

    /** @param  array<string, mixed>  $values  Setting values by key; missing ones use DEFAULTS. */
    public static function fromValues(array $values): self
    {
        $value = fn (string $key) => is_numeric($values[$key] ?? null) ? $values[$key] : self::DEFAULTS[$key];

        return new self(
            (float) $value(self::MINIMUM_FARE_KEY),
            (float) $value(self::DISCOUNT_RATE_KEY),
            (float) $value(self::SUCCEEDING_FARE_KEY),
            (int) $value(self::BASE_BARANGAY_COUNT_KEY),
        );
    }

    /** @param  int  $barangaysTraversed  Barangays on the trip, counting both ends. */
    public function fare(int $barangaysTraversed, bool $discounted = false): float
    {
        $regular = round(
            $this->minimumFare + max(0, $barangaysTraversed - $this->baseBarangayCount) * $this->succeedingFare,
            2,
        );

        return $discounted ? $this->discounted($regular) : $regular;
    }

    public function fareBetween(FarePoint $pickup, FarePoint $dropoff, bool $discounted = false): float
    {
        return $this->fare(abs((int) $pickup->point_number - (int) $dropoff->point_number) + 1, $discounted);
    }

    public function discounted(float $regular): float
    {
        return round($regular * (100 - $this->discountRate) / 100, 2);
    }

    /**
     * Rewrite every stop's stored fares (fare from stop 1) from these rules:
     * one UPDATE per distinct point number, scoped to a route when given.
     */
    public function syncStopFares(?string $routeId = null): void
    {
        $pointNumbers = FarePoint::query()
            ->when($routeId, fn ($query) => $query->where('route_id', $routeId))
            ->distinct()
            ->pluck('point_number');

        foreach ($pointNumbers as $pointNumber) {
            // Stop 1 to stop n traverses n barangays.
            $regular = $this->fare((int) $pointNumber);
            FarePoint::query()
                ->when($routeId, fn ($query) => $query->where('route_id', $routeId))
                ->where('point_number', $pointNumber)
                ->update(['regular_fare' => $regular, 'discounted_fare' => $this->discounted($regular)]);
        }
    }

    /** The discounted minimum and succeeding fares, stored for older readers of the settings. */
    public function derivedSettings(): array
    {
        return [
            'base_fare_discounted' => number_format($this->discounted($this->minimumFare), 2, '.', ''),
            'succeeding_fare_discounted' => number_format($this->discounted($this->succeedingFare), 2, '.', ''),
        ];
    }
}
