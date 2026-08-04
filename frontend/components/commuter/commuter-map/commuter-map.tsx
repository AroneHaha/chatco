"use client";

// components/commuter/commuter-map/commuter-map.tsx
// Commuter live-tracking map — slim rendering component.
//
// ARCHITECTURE: This file was refactored from a 560+ line monolith into
// focused modules following the Single Responsibility Principle:
//
//   commuter-map-constants.ts  → Route coords, bounds, timing constants
//   commuter-map-icons.ts      → Leaflet icon generators, capacity config, bearing
//   use-commuter-tracking.ts   → GPS tracking, simulation, radius validation hook
//   location-finder.tsx         → Leaflet GPS event handler component
//   commuter-map.tsx (this)    → Map rendering only
//
// When Laravel backend is integrated, only use-commuter-tracking.ts needs
// to be updated to call API endpoints instead of client-side calculations.

import { useState, useEffect, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { distanceToPolylineMeters } from "@/lib/utils/geo";
import { ROUTE_COORDS } from "./commuter-map-constants";
import { useRouteGeometry } from "@/hooks/use-route-geometry";
import { createCommuterIcon } from "./commuter-map-icons";
import { useCommuterTracking } from "./use-commuter-tracking";
import LocationFinder from "./location-finder";
import VehicleMarker from "./vehicle-marker";
import DynamicRouteViewport from "@/components/maps/dynamic-route-viewport";

// --- MAIN COMPONENT ---

interface CommuterMapProps {
  isDesktop?: boolean;
  /** Callback fired when tracking data updates — used by dashboard for ETA + hail restriction.
   *  The third argument is the commuter's live GPS coords, needed to POST a hail. */
  onNearbyVehiclesChange?: (
    vehicles: import("@/lib/shared/geo/nearby-detector").NearbyVehicle[],
    gpsStatus: import("@/lib/shared/geo/nearby-detector").GpsStatus,
    commuterLocation: [number, number] | null
  ) => void;
}

export default function CommuterMap({ isDesktop = false, onNearbyVehiclesChange }: CommuterMapProps) {
  const [isDomReady, setIsDomReady] = useState(false);
  const routeGeometry = useRouteGeometry(ROUTE_COORDS);

  const {
    userActualLocation,
    showMapPin,
    arrowPos,
    gpsStatus,
    activeVehicles,
    radiusResult,
    hasInitialCenteredRef,
    userInteractedRef,
    userLocationRef,
    setUserActualLocation,
    setShowMapPin,
    setArrowPos,
    setGpsStatus,
  } = useCommuterTracking();

  // Notify parent of tracking updates
  useEffect(() => {
    if (gpsStatus === "available") {
      const isInsideRouteCoverage = userActualLocation
        ? distanceToPolylineMeters(userActualLocation, routeGeometry.routeCoords) <= 1000
        : false;
      onNearbyVehiclesChange?.(
        isInsideRouteCoverage ? radiusResult?.withinRadius || [] : [],
        gpsStatus,
        userActualLocation
      );
    } else {
      onNearbyVehiclesChange?.([], gpsStatus, userActualLocation);
    }
  }, [radiusResult, gpsStatus, userActualLocation, onNearbyVehiclesChange, routeGeometry.routeCoords]);

  // Double-RAF for DOM readiness (ensures Leaflet gets accurate container dimensions)
  useEffect(() => {
    let cancelled = false;
    let raf2: number | undefined;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        if (!cancelled && typeof document !== "undefined") {
          setIsDomReady(true);
        }
      });
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf1);
      if (raf2 !== undefined) cancelAnimationFrame(raf2);
    };
  }, []);

  const commuterIcon = useMemo(() => createCommuterIcon(), []);

  if (!isDomReady) return <div className="absolute inset-0 bg-[#050F1A]" />;

  // Build lookup sets for O(1) within-radius checks
  const withinRadiusIds = new Set((radiusResult?.withinRadius || []).map((v) => v.id));
  const withinRadiusMap = new Map((radiusResult?.withinRadius || []).map((v) => [v.id, v]));
  const allVehiclesMap = new Map((radiusResult?.allVehiclesWithDistance || []).map((v) => [v.id, v]));

  return (
    <div className="commuter-map-wrapper w-full h-full">
      {arrowPos && (
        <div
          className="absolute z-[1000] flex flex-col items-center pointer-events-none select-none"
          style={{ left: `${arrowPos.x}%`, top: `${arrowPos.y}%`, transform: `translate(-50%, -50%)` }}
        >
          <svg className="w-8 h-8 text-[#62A0EA] drop-shadow-lg animate-pulse" style={{ transform: `rotate(${arrowPos.angle}deg)` }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
          </svg>
          <span className="mt-1 text-[9px] font-bold text-white bg-[#071A2E]/90 backdrop-blur-sm px-1.5 py-0.5 rounded-md shadow-lg border border-white/20">You</span>
        </div>
      )}

      <MapContainer center={routeGeometry.center} zoom={12} zoomControl={false} attributionControl={false} className="commuter-map-container" style={{ background: '#050F1A' }} maxBounds={routeGeometry.mapBoundsArray} maxBoundsViscosity={1.0} minZoom={isDesktop ? 13 : 11}>
        <DynamicRouteViewport routeBounds={routeGeometry.routeBounds} mapBounds={routeGeometry.mapBounds} />
        <LocationFinder
          userLocationRef={userLocationRef}
          setUserActualLocation={setUserActualLocation}
          setShowMapPin={setShowMapPin}
          setArrowPos={setArrowPos}
          setGpsStatus={setGpsStatus}
          hasInitialCenteredRef={hasInitialCenteredRef}
          userInteractedRef={userInteractedRef}
          routeBounds={routeGeometry.routeBounds}
          mapBounds={routeGeometry.mapBounds}
        />
        <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />

        <Polyline positions={routeGeometry.routeCoords} pathOptions={{ color: '#62A0EA', weight: 8, opacity: 0.2, lineCap: 'round', lineJoin: 'round' }} />
        <Polyline positions={routeGeometry.routeCoords} pathOptions={{ color: '#62A0EA', weight: 4, opacity: 0.9, dashArray: '10 10', lineCap: 'round', lineJoin: 'round' }} />

        {/* --- COMMUTER LOCATION PIN --- */}
        {showMapPin && userActualLocation && (
          <Marker position={userActualLocation} icon={commuterIcon}>
            <Popup>
              <div className="font-bold text-[#071A2E]">You are here</div>
              <div className="text-xs text-gray-500">Live GPS Location</div>
            </Popup>
          </Marker>
        )}

        {/* --- CONDUCTOR RADIUS CIRCLES + JEEPNEY MARKERS ---
            Each vehicle's Circle+Marker+Popup lives in its own memoized
            VehicleMarker (see vehicle-marker.tsx). Only the vehicle whose
            lat/lng/capacity/radius-status actually changed value re-renders;
            React.memo's custom comparator bails out for the rest, so one
            conductor's location tick no longer touches every other marker. */}
        {activeVehicles.map((vehicle) => {
          const isWithinRadius = userActualLocation ? withinRadiusIds.has(vehicle.id) : false;
          const withinRadiusInfo = isWithinRadius ? withinRadiusMap.get(vehicle.id) : null;
          const distanceInfo = userActualLocation ? allVehiclesMap.get(vehicle.id) : null;

          return (
            <VehicleMarker
              key={vehicle.id}
              lat={vehicle.lat}
              lng={vehicle.lng}
              plateNumber={vehicle.plateNumber}
              routeName={vehicle.routeName}
              capacity={vehicle.capacity}
              isWithinRadius={isWithinRadius}
              distanceInMeters={distanceInfo?.distanceInMeters ?? null}
              estimatedArrivalMinutes={withinRadiusInfo?.estimatedArrivalMinutes ?? null}
            />
          );
        })}
      </MapContainer>

      <style jsx global>{`
        .commuter-map-wrapper {
          position: relative;
          touch-action: none;
        }

        .commuter-map-container {
          width: 100% !important;
          height: 100% !important;
          position: absolute !important;
          inset: 0 !important;
          z-index: 0 !important;
          isolation: isolate !important;
        }

        .custom-commuter-icon, .custom-jeepney-icon { background: transparent !important; border: none !important; }
        .leaflet-container { background: #050F1A !important; font-family: inherit !important; }
        .leaflet-popup-content-wrapper { background: white !important; border-radius: 12px !important; box-shadow: 0 4px 12px rgba(0,0,0,0.15) !important; padding: 0 !important; }
        .leaflet-popup-content { margin: 12px 16px !important; color: #071A2E !important; line-height: 1.4 !important; }
        .leaflet-popup-tip { background: white !important; }
        .leaflet-popup-close-button { color: #071A2E !important; }
        @keyframes pulse { 0% { transform: scale(1); opacity: 1; } 100% { transform: scale(2.5); opacity: 0; } }
      `}</style>
    </div>
  );
}
