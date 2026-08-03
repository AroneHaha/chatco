<?php

namespace App\Exceptions;

/**
 * Thrown by HailService::createHail when the commuter's distance from
 * the vehicle exceeds GeoHelper::HAIL_RADIUS_M.
 *
 * Carries the computed distance in meters so the controller layer can
 * shape the 422 response body as:
 *   { "error": "outside_radius", "distance_m": <float> }
 *
 * @package App\Exceptions
 */
class OutsideRadiusException extends \Exception
{
    /**
     * The Haversine distance in meters between commuter and vehicle
     * at the moment the hail was attempted.
     */
    public float $distanceMeters;

    public function __construct(float $distanceMeters)
    {
        $this->distanceMeters = $distanceMeters;

        parent::__construct(
            "Outside 1KM hail radius: {$distanceMeters}m from vehicle"
        );
    }
}
