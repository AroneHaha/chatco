"use client";

import { useEffect, useRef } from "react";
import { updateConductorLocation } from "@/lib/conductor/services/location.service";

// Throttle so we post at most one GPS update per interval, regardless of how
// often the browser fires watchPosition. Matches the backend conductor-gps
// rate limiter's intent.
const MIN_SEND_INTERVAL_MS = 5000;

/**
 * While `active` (the conductor has an active shift), watch GPS and push each
 * fix to the backend so the vehicle appears/moves on the commuter map.
 *
 * Best-effort: GPS errors and backend rejections (e.g. a brief window with no
 * active shift) are swallowed — the next fix will retry.
 */
export function useConductorLocationBroadcast(active: boolean): void {
  const lastSentRef = useRef(0);

  useEffect(() => {
    if (!active) return;
    if (typeof navigator === "undefined" || !navigator.geolocation) return;

    const send = (pos: GeolocationPosition) => {
      const now = Date.now();
      if (now - lastSentRef.current < MIN_SEND_INTERVAL_MS) return;
      lastSentRef.current = now;

      void updateConductorLocation({
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        speed: pos.coords.speed ?? null,
        heading: pos.coords.heading ?? null,
      }).catch(() => {
        // best-effort — ignore (no active shift yet, offline, etc.)
      });
    };

    const watchId = navigator.geolocation.watchPosition(send, () => {}, {
      enableHighAccuracy: true,
      maximumAge: 5000,
      timeout: 10000,
    });

    return () => navigator.geolocation.clearWatch(watchId);
  }, [active]);
}
