// components/commuter/commuter-map/use-commuter-tracking.ts
// Extracted from commuter-map.tsx — GPS tracking, vehicle simulation,
// conductor-radius validation, and proximity notifications.
//
// WHY SPLIT: The original commuter-map.tsx mixed 6 concerns (GPS, simulation,
// radius validation, notifications, icons, rendering) in 560+ lines.
// This hook encapsulates all tracking/state logic so the map component
// only handles rendering.
//
// ARCHITECTURE: This hook follows the same pattern as conductor service hooks.
// When Laravel backend is integrated, this hook's internals can be swapped
// to call API endpoints instead of running client-side calculations.

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  validateConductorRadius,
  formatDistance,
  type VehicleLocation,
  type NearbyVehicle,
  type ConductorRadiusResult,
  type GpsStatus,
} from "@/lib/shared/geo/nearby-detector";
import {
  sendProximityNotification,
  requestNotificationPermission,
  clearNotifiedVehicles,
} from "@/lib/shared/geo/proximity-notification";
import { advanceAllVehicles, type SimulatedVehicle } from "@/lib/shared/simulation/vehicle-simulation";
import { ROUTE_COORDS, CALC_THROTTLE_MS, SIMULATION_TICK_MS, routeBounds, mapBounds } from "./commuter-map-constants";
import { getBearing } from "./commuter-map-icons";

// --- MOCK DATA ---
// Uses SimulatedVehicle from vehicle-simulation module.

const MOCK_ACTIVE_VEHICLES: SimulatedVehicle[] = [
  { id: "v_01", plateNumber: "ABC 1234", driverName: "Juan Dela Cruz", conductorName: "Pedro Penduko", routeIndex: 8, capacity: "AVAILABLE" },
  { id: "v_02", plateNumber: "XYZ 5678", driverName: "Mario Speedwagon", conductorName: "Luigi Mansion", routeIndex: 42, capacity: "STANDING" },
  { id: "v_03", plateNumber: "DEF 9012", driverName: "Crisostomo Ibarra", conductorName: "Sisa Doe", routeIndex: 68, capacity: "FULL" },
];

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
  /** Currently simulated vehicles with positions */
  activeVehicles: SimulatedVehicle[];
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

  // Vehicle simulation state
  const [activeVehicles, setActiveVehicles] = useState<SimulatedVehicle[]>(MOCK_ACTIVE_VEHICLES);

  // Conductor radius validation result
  const [radiusResult, setRadiusResult] = useState<ConductorRadiusResult | null>(null);

  // GPS status
  const [gpsStatus, setGpsStatus] = useState<GpsStatus>("loading");

  const userLocationRef = useRef<[number, number] | null>(null);
  const lastCalcRef = useRef(0);
  const hasInitialCenteredRef = useRef(false);
  const userInteractedRef = useRef(false);

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

  // --- Vehicle simulation interval ---
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveVehicles((prev) => advanceAllVehicles(prev, ROUTE_COORDS.length));
    }, SIMULATION_TICK_MS);
    return () => clearInterval(interval);
  }, []);

  // --- Throttled distance/ETA recalculation ---
  useEffect(() => {
    if (!userActualLocation) return;

    const now = Date.now();
    if (now - lastCalcRef.current < CALC_THROTTLE_MS) return;
    lastCalcRef.current = now;

    const vehicleLocations: VehicleLocation[] = activeVehicles.map((v) => {
      const coord = ROUTE_COORDS[v.routeIndex];
      return {
        id: v.id,
        plateNumber: v.plateNumber,
        lat: coord[0],
        lng: coord[1],
        capacityStatus: v.capacity === "AVAILABLE" ? "Available" : v.capacity === "STANDING" ? "Standing" : "Full",
        speed: 25,
        lastUpdated: new Date(),
      };
    });

    const result = validateConductorRadius(
      vehicleLocations,
      userActualLocation[0],
      userActualLocation[1]
    );

    setRadiusResult(result);

    // Send proximity notifications for newly detected within-radius vehicles
    result.withinRadius.forEach((v) => {
      sendProximityNotification(v.plateNumber, formatDistance(v.distanceInMeters));
    });

    // Clear notification dedup when commuter exits ALL conductor radii
    if (result.withinRadius.length === 0) {
      clearNotifiedVehicles();
    }
  }, [userActualLocation, activeVehicles]);

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
