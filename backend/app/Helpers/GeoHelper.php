<?php

namespace App\Helpers;

/**
 * GeoHelper — single source of truth for Haversine distance and the
 * 1KM hail radius rule on the backend.
 *
 * Mirrors `frontend/lib/utils/geo.ts` haversineMeters() so that frontend
 * and backend compute identical distances for the same coordinate pair.
 *
 * Constants:
 *   - EARTH_RADIUS_M : Earth's mean radius in meters (matches frontend)
 *   - HAIL_RADIUS_M  : hard 1KM limit enforced by HailService — changing
 *                      this value here changes the rule everywhere.
 *
 * @package App\Helpers
 */
final class GeoHelper
{
    /**
     * Earth's mean radius in meters.
     * Must match frontend lib/utils/geo.ts EARTH_RADIUS_M exactly.
     */
    public const EARTH_RADIUS_M = 6_371_000;

    /**
     * The 1KM hard limit for hail creation.
     *
     * Referenced by HailService when validating that a commuter is within
     * hail range of a vehicle. Changing this constant changes the rule
     * everywhere — keep it here as the single source of truth.
     */
    public const HAIL_RADIUS_M = 1000;

    /**
     * Haversine formula — calculates the great-circle distance
     * between two lat/lng points on Earth.
     *
     * Returns distance in meters. Must produce identical results to
     * frontend lib/utils/geo.ts haversineMeters().
     *
     * @param  float  $lat1  Latitude of point A (degrees)
     * @param  float  $lng1  Longitude of point A (degrees)
     * @param  float  $lat2  Latitude of point B (degrees)
     * @param  float  $lng2  Longitude of point B (degrees)
     * @return float         Distance in meters
     */
    public static function haversineMeters(
        float $lat1,
        float $lng1,
        float $lat2,
        float $lng2
    ): float {
        $toRad = static fn (float $deg): float => $deg * M_PI / 180;

        $dLat = $toRad($lat2 - $lat1);
        $dLng = $toRad($lng2 - $lng1);

        $a =
            sin($dLat / 2) ** 2 +
            cos($toRad($lat1)) * cos($toRad($lat2)) * sin($dLng / 2) ** 2;

        $c = 2 * atan2(sqrt($a), sqrt(1 - $a));

        return self::EARTH_RADIUS_M * $c;
    }

    /**
     * Convenience wrapper: returns true when the great-circle distance
     * between two points is within the given radius.
     *
     * @param  float  $lat1          Latitude of point A (degrees)
     * @param  float  $lng1          Longitude of point A (degrees)
     * @param  float  $lat2          Latitude of point B (degrees)
     * @param  float  $lng2          Longitude of point B (degrees)
     * @param  float  $radiusMeters  Radius threshold in meters
     *                                (defaults to HAIL_RADIUS_M = 1000)
     * @return bool                   True if distance <= radiusMeters
     */
    public static function isWithinRadius(
        float $lat1,
        float $lng1,
        float $lat2,
        float $lng2,
        float $radiusMeters = self::HAIL_RADIUS_M
    ): bool {
        return self::haversineMeters($lat1, $lng1, $lat2, $lng2) <= $radiusMeters;
    }
}
