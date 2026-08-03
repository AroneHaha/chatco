// components/commuter/commuter-map/use-commuter-tracking.ts
// GPS tracking, real-time vehicle locations, conductor-radius validation, and
// proximity notifications for the commuter map.
//
// DATA SOURCE: Vehicle positions come from the live backend via
// `useVehicleLocations` (GET /vehicles/locations seeded, then Pusher
// `VehicleLocationUpdated` broadcasts). Each vehicle therefore carries its real
// `vehicle_id` UUID — which is what the hail flow needs to POST a hail against.
// (This replaced an earlier client-side mock simulation.)

import { useState, useEffect, useRef, useMemo } from "react";
import {
  validateConductorRadius,
  formatDistance,
  type VehicleLocation,
  type ConductorRadiusResult,
  type GpsStatus,
} from "@/lib/shared/geo/nearby-detector";
import {
  sendProximityNotification,
  requestNotificationPermission,
  clearNotifiedVehicles,
} from "@/lib/shared/geo/proximity-notification";
import { useVehicleLocations } from "@/hooks/useVehicleLocations";
import { CALC_THROTTLE_MS } from "./commuter-map-constants";
import type { VehicleCapacity } from "./commuter-map-icons";

// --- DISPLAY VEHICLE ---
// A vehicle as the map renders it: real UUID + real coordinates + capacity.
export interface MapVehicle {
  /** Real backend vehicle UUID (used as the hail target). */
  id: string;
  plateNumber: string;
  lat: number;
  lng: number;
  capacity: VehicleCapacity;
  routeName: string | null;
}

// Backend capacity_status is uppercase (AVAILABLE | STANDING | FULL).
function toCapacityEnum(status: string | undefined | null): VehicleCapacity {
  const upper = (status ?? "").toUpperCase();
  if (upper === "STANDING") return "STANDING";
  if (upper === "FULL") return "FULL";
  return "AVAILABLE";
}

// The geo radius helper keys hailability off the title-case capacityStatus
// ("Available" | "Standing" | "Full"), so normalize into that shape.
function toGeoCapacity(status: string | undefined | null): VehicleLocation["capacityStatus"] {
  const upper = (status ?? "").toUpperCase();
  if (upper === "STANDING") return "Standing";
  if (upper === "FULL") return "Full";
  return "Available";
}

// --- HOOK RETURN TYPE ---

export interface CommuterTrackingResult {
  /** User's GPS location (null until acquired) */
  userActualLocation: [number, number] | null;
  /** Whether to show the user's map pin */
  showMapPin: boolean;
  /** Arrow indicator when user is off-screen */
  arrowPos: { x: number; y: number; angle: number } | null;
  /** GPS acquisition status */
  gpsStatus: GpsStatus;
  /** Live vehicles (real backend data) with positions */
  activeVehicles: MapVehicle[];
  /** Conductor-radius validation result (null until GPS + first calculation) */
  radiusResult: ConductorRadiusResult | null;
  /** Whether commuter is within any conductor's 1km radius */
  isWithinAnyRadius: boolean;
  /** Whether the map has done its initial GPS centering */
  hasInitialCenteredRef: React.MutableRefObject<boolean>;
  /** Whether user has manually interacted with the map */
  userInteractedRef: React.MutableRefObject<boolean>;
  /** Ref to user's current GPS coords (for LocationFinder) */
  userLocationRef: React.MutableRefObject<[number, number] | null>;
  /** Setters for LocationFinder to call back into */
  setUserActualLocation: (loc: [number, number] | null) => void;
  setShowMapPin: (val: boolean) => void;
  setArrowPos: (pos: { x: number; y: number; angle: number } | null) => void;
  setGpsStatus: (status: GpsStatus) => void;
}

// --- HOOK ---

export function useCommuterTracking(): CommuterTrackingResult {
  const [userActualLocation, setUserActualLocation] = useState<[number, number] | null>(null);
  const [showMapPin, setShowMapPin] = useState(false);
  const [arrowPos, setArrowPos] = useState<{ x: number; y: number; angle: number } | null>(null);

  // Live vehicle locations from the backend (seed fetch + Pusher updates).
  const { vehicles: rawVehicles } = useVehicleLocations();

  // Conductor radius validation result
  const [radiusResult, setRadiusResult] = useState<ConductorRadiusResult | null>(null);

  // GPS status
  const [gpsStatus, setGpsStatus] = useState<GpsStatus>("loading");

  const userLocationRef = useRef<[number, number] | null>(null);
  const lastCalcRef = useRef(0);
  const lastLocationReportRef = useRef(0);
  const hasInitialCenteredRef = useRef(false);
  const userInteractedRef = useRef(false);

  // Map raw backend rows into the shape the map renders.
  const activeVehicles = useMemo<MapVehicle[]>(
    () =>
      rawVehicles.map((v) => ({
        id: v.vehicle_id,
        plateNumber: v.plate_number,
        lat: v.lat,
        lng: v.lng,
        capacity: toCapacityEnum(v.capacity_status ?? v.vehicle_capacity_status),
        routeName: v.route_name,
      })),
    [rawVehicles]
  );

  // Map raw backend rows into the geo helper's VehicleLocation shape.
  const vehicleLocations = useMemo<VehicleLocation[]>(
    () =>
      rawVehicles.map((v) => ({
        id: v.vehicle_id,
        plateNumber: v.plate_number,
        lat: v.lat,
        lng: v.lng,
        capacityStatus: toGeoCapacity(v.capacity_status ?? v.vehicle_capacity_status),
        speed: v.speed ?? 0,
        lastUpdated: new Date(v.updated_at),
      })),
    [rawVehicles]
  );

  // Request notification permission on mount
  useEffect(() => {
    requestNotificationPermission();
  }, []);

  // Clear notification dedup set on unmount
  useEffect(() => {
    return () => {
      clearNotifiedVehicles();
    };
  }, []);

  // --- Throttled distance/ETA recalculation ---
  useEffect(() => {
    if (!userActualLocation) return;

    const now = Date.now();
    if (now - lastCalcRef.current < CALC_THROTTLE_MS) return;
    lastCalcRef.current = now;

    const result = validateConductorRadius(
      vehicleLocations,
      userActualLocation[0],
      userActualLocation[1]
    );

    // Existing throttled derivation intentionally updates only on GPS samples.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRadiusResult(result);

    // Send proximity notifications for newly detected within-radius vehicles
    result.withinRadius.forEach((v) => {
      sendProximityNotification(v.plateNumber, formatDistance(v.distanceInMeters));
    });

    // Clear notification dedup when commuter exits ALL conductor radii
    if (result.withinRadius.length === 0) {
      clearNotifiedVehicles();
    }
  }, [userActualLocation, vehicleLocations]);

  useEffect(() => {
    if (!userActualLocation) return;
    const now = Date.now();
    if (now - lastLocationReportRef.current < 15_000) return;
    lastLocationReportRef.current = now;

    void fetch("/api/commuter/location", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        latitude: userActualLocation[0],
        longitude: userActualLocation[1],
      }),
    }).catch(() => {
      // Tracking and hailing continue if demand reporting is unavailable.
    });
  }, [userActualLocation]);

  const isWithinAnyRadius = (radiusResult?.withinRadius?.length ?? 0) > 0;

  return {
    userActualLocation,
    showMapPin,
    arrowPos,
    gpsStatus,
    activeVehicles,
    radiusResult,
    isWithinAnyRadius,
    hasInitialCenteredRef,
    userInteractedRef,
    userLocationRef,
    setUserActualLocation,
    setShowMapPin,
    setArrowPos,
    setGpsStatus,
  };
}
