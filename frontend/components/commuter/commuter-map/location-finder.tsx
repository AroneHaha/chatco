// components/commuter/commuter-map/location-finder.tsx
// Extracted from commuter-map.tsx — Leaflet map event handler for GPS
// location tracking and user interaction detection.
//
// WHY SPLIT: LocationFinder is a self-contained Leaflet hook component
// that was defined inline in the 560-line commuter-map.tsx. It handles
// GPS acquisition, auto-centering, off-screen arrow, and interaction
// tracking — all of which are independent from the map's rendering logic.

"use client";

import { useEffect } from "react";
import { useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import type { GpsStatus } from "@/lib/shared/geo/nearby-detector";
import { routeBounds, mapBounds } from "./commuter-map-constants";
import { getBearing } from "./commuter-map-icons";

interface LocationFinderProps {
  userLocationRef: React.MutableRefObject<[number, number] | null>;
  setUserActualLocation: (loc: [number, number] | null) => void;
  setShowMapPin: (val: boolean) => void;
  setArrowPos: (pos: { x: number; y: number; angle: number } | null) => void;
  setGpsStatus: (status: GpsStatus) => void;
  /** Ref shared with parent to track if the map has been initially centered */
  hasInitialCenteredRef: React.MutableRefObject<boolean>;
  /** Ref shared with parent to track if the user has manually interacted with the map */
  userInteractedRef: React.MutableRefObject<boolean>;
}

export default function LocationFinder({
  userLocationRef,
  setUserActualLocation,
  setShowMapPin,
  setArrowPos,
  setGpsStatus,
  hasInitialCenteredRef,
  userInteractedRef,
}: LocationFinderProps) {
  const map = useMap();

  useMapEvents({
    locationfound(e) {
      const { lat, lng } = e.latlng;
      const userCoords: [number, number] = [lat, lng];
      setUserActualLocation(userCoords);
      userLocationRef.current = userCoords;
      setGpsStatus("available");

      const userLatLng = L.latLng(lat, lng);

      // ALWAYS show the pin when location is found
      setShowMapPin(true);

      // Only auto-center the map on the FIRST successful GPS acquisition.
      // After that, respect the user's manual navigation (drag/zoom/pan).
      //
      // userInteractedRef matters even for that first fix: a mobile cold start
      // can take 30s (see the locate timeout below), and if the user panned or
      // zoomed while waiting, flying them to zoom 16 yanks the view out from
      // under them. Someone who has already moved the map has chosen their view.
      if (!hasInitialCenteredRef.current && !userInteractedRef.current) {
        // Fly to user if they are near the route (smooth animation, high zoom)
        if (routeBounds.contains(userLatLng)) {
          setArrowPos(null);
          map.flyTo([lat, lng], 16, { duration: 1.5 });
        }
        // If in the general map area but not on the route, use setView.
        else if (mapBounds.contains(userLatLng)) {
          setArrowPos(null);
          map.setView([lat, lng], 13, { animate: true });
        }
        // Mark that we've done the initial centering.
        hasInitialCenteredRef.current = true;
      }
    },
    locationerror(e: any) {
      const code = e?.code;
      if (code === 1) {
        setGpsStatus("denied");
      } else {
        setGpsStatus("unavailable");
      }
    },
    move() {
      const userCoords = userLocationRef.current;
      if (!userCoords) return;

      const userLatLng = L.latLng(userCoords[0], userCoords[1]);
      const bounds = map.getBounds();

      if (bounds.contains(userLatLng)) {
        setArrowPos(null);
        return;
      }

      const center = map.getCenter();
      const angle = getBearing([center.lat, center.lng], userCoords);

      const dx = Math.sin(angle * Math.PI / 180);
      const dy = -Math.cos(angle * Math.PI / 180);

      const safeMinX = 5; const safeMaxX = 95;
      const safeMinY = 15; const safeMaxY = 75;

      let tX = Infinity; let tY = Infinity;

      if (dx > 0) tX = (safeMaxX - 50) / dx;
      else if (dx < 0) tX = (safeMinX - 50) / dx;
      if (dy > 0) tY = (safeMaxY - 50) / dy;
      else if (dy < 0) tY = (safeMinY - 50) / dy;

      const t = Math.min(tX, tY);

      setArrowPos({ x: 50 + (t * dx), y: 50 + (t * dy), angle: angle });
    },
    dragstart() {
      map.closePopup();
      userInteractedRef.current = true;
    },
    zoomstart() {
      userInteractedRef.current = true;
    },
  });

  useEffect(() => {
    // Increased timeout for mobile GPS cold starts (10-30+ seconds).
    map.locate({ setView: false, maxZoom: 16, enableHighAccuracy: true, timeout: 30000, watch: true });
    // Without stopLocate the geolocation watch outlives the component, so
    // navigating away and back stacks another watcher on the same map.
    return () => {
      map.stopLocate();
    };
  }, [map]);

  useEffect(() => {
    // Force Leaflet to recalculate container dimensions after mount.
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 500);
    return () => clearTimeout(timer);
  }, [map]);

  return null;
}
