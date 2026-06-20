<?php

namespace Tests\Unit;

use App\Helpers\GeoHelper;
use Tests\TestCase;

/**
 * Unit tests for App\Helpers\GeoHelper (S3-T12).
 *
 * GeoHelper is the backend single source of truth for Haversine distance
 * and the 1KM hail radius. These tests pin the distance math to golden
 * values so the rule stays regression-proof and byte-aligned with the
 * frontend (lib/utils/geo.ts), which shares the same formula and
 * EARTH_RADIUS_M constant.
 *
 * Golden distances were verified against the shipped implementation
 * (R = 6,371,000 m). Tolerance is 1 m — far wider than the observed
 * float noise (~1e-9 m) yet tight enough to catch a changed radius or a
 * broken formula.
 *
 * Pure math: no database, no HTTP, no RefreshDatabase.
 */
class GeoHelperTest extends TestCase
{
    /** Acceptable error for golden distance comparisons (meters). */
    private const TOLERANCE_M = 1.0;

    // ── Reference coordinates ────────────────────────────────────────

    /** Manila City Hall. */
    private const MANILA = [14.5906, 120.9817];

    /** Quezon City (Quezon Ave corridor). */
    private const QUEZON_CITY = [14.6300, 121.0100];

    /** Meycauayan, Bulacan (within the app's operating area). */
    private const MEYCAUAYAN = [14.7361, 120.9608];

    /** Marilao, Bulacan. */
    private const MARILAO = [14.7578, 120.9479];

    // ── Distance correctness ─────────────────────────────────────────

    public function test_same_point_returns_zero_distance(): void
    {
        $distance = GeoHelper::haversineMeters(14.6, 120.98, 14.6, 120.98);

        $this->assertSame(0.0, $distance);
    }

    public function test_manila_to_quezon_city_distance(): void
    {
        $distance = GeoHelper::haversineMeters(
            self::MANILA[0],
            self::MANILA[1],
            self::QUEZON_CITY[0],
            self::QUEZON_CITY[1],
        );

        // ~5.3 km cross-city reference.
        $this->assertEqualsWithDelta(5335.3777, $distance, self::TOLERANCE_M);
    }

    public function test_bulacan_meycauayan_to_marilao_distance(): void
    {
        $distance = GeoHelper::haversineMeters(
            self::MEYCAUAYAN[0],
            self::MEYCAUAYAN[1],
            self::MARILAO[0],
            self::MARILAO[1],
        );

        // ~2.8 km within the Bulacan operating area.
        $this->assertEqualsWithDelta(2783.2455, $distance, self::TOLERANCE_M);
    }

    public function test_cross_hemisphere_coordinates(): void
    {
        // Negative lat/lng must be handled identically by the formula.
        $distance = GeoHelper::haversineMeters(-14.6, -120.98, -14.59, -120.97);

        $this->assertEqualsWithDelta(1547.3698, $distance, self::TOLERANCE_M);
    }

    public function test_distance_is_symmetric(): void
    {
        $forward = GeoHelper::haversineMeters(
            self::MANILA[0],
            self::MANILA[1],
            self::QUEZON_CITY[0],
            self::QUEZON_CITY[1],
        );
        $reverse = GeoHelper::haversineMeters(
            self::QUEZON_CITY[0],
            self::QUEZON_CITY[1],
            self::MANILA[0],
            self::MANILA[1],
        );

        $this->assertSame($forward, $reverse);
    }

    // ── Radius boundary semantics ────────────────────────────────────

    public function test_boundary_exactly_1000m_is_within_radius(): void
    {
        // Build a point exactly HAIL_RADIUS_M due north via inverse-meridian
        // offset (same longitude): dLat = (d / R) in radians -> degrees.
        $lat2 = 14.6 + (GeoHelper::HAIL_RADIUS_M / GeoHelper::EARTH_RADIUS_M) * 180 / M_PI;

        // Inclusive boundary (<=): a vehicle exactly at the 1KM limit is
        // still hailable.
        $this->assertTrue(GeoHelper::isWithinRadius(14.6, 120.98, $lat2, 120.98));
    }

    public function test_boundary_1001m_is_outside_radius(): void
    {
        $lat2 = 14.6 + (1001 / GeoHelper::EARTH_RADIUS_M) * 180 / M_PI;

        $this->assertFalse(GeoHelper::isWithinRadius(14.6, 120.98, $lat2, 120.98));
    }

    public function test_within_radius_boundary_is_inclusive(): void
    {
        // Float-safe proof of the <= semantics, independent of construction
        // precision: measure any real pair, then probe at the exact distance
        // (inside, inclusive) and just below it (outside).
        $distance = GeoHelper::haversineMeters(
            self::MEYCAUAYAN[0],
            self::MEYCAUAYAN[1],
            self::MARILAO[0],
            self::MARILAO[1],
        );

        $this->assertTrue(GeoHelper::isWithinRadius(
            self::MEYCAUAYAN[0],
            self::MEYCAUAYAN[1],
            self::MARILAO[0],
            self::MARILAO[1],
            $distance,
        ));

        $this->assertFalse(GeoHelper::isWithinRadius(
            self::MEYCAUAYAN[0],
            self::MEYCAUAYAN[1],
            self::MARILAO[0],
            self::MARILAO[1],
            $distance - 0.001,
        ));
    }

    // ── Constants (frontend-parity guards) ───────────────────────────

    public function test_hail_radius_constant_is_1000(): void
    {
        $this->assertSame(1000, GeoHelper::HAIL_RADIUS_M);
    }

    public function test_earth_radius_constant_is_6371000(): void
    {
        // Must match frontend lib/utils/geo.ts EARTH_RADIUS_M for cross-stack
        // distance parity.
        $this->assertSame(6_371_000, GeoHelper::EARTH_RADIUS_M);
    }
}
