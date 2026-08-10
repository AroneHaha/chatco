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

      // coords.speed is METRES PER SECOND (W3C Geolocation spec), but every
      // consumer treats vehicle_locations.speed as km/h — the monitoring table
      // renders it as "N km/h" and overspeed detection compares it against the
      // km/h limit. Sending it raw made 50 km/h arrive as ~13.9, so a unit had
      // to reach 180 km/h to trip a 50 km/h threshold. Convert at the source.
      const speedKmh =
        pos.coords.speed != null && Number.isFinite(pos.coords.speed)
          ? pos.coords.speed * 3.6
          : null;

      void updateConductorLocation({
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        speed: speedKmh,
        heading: pos.coords.heading ?? null,
        accuracy: pos.coords.accuracy,
        fix_timestamp: new Date(pos.timestamp).toISOString(),
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
