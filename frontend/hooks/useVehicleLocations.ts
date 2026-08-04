import { useEffect, useState, useCallback } from 'react';
import type { ConnectionStatus } from 'laravel-echo';
import { getEcho } from '@/lib/echo';

/**
 * VehicleLocation — matches the backend broadcast payload (snake_case).
 *
 * Backend `VehicleLocationUpdated` event broadcasts (per S2-T7 spec):
 *   vehicle_id, plate_number, vehicle_type, lat, lng, speed, heading,
 *   capacity_status, route_name, updated_at
 *
 * The GET /api/vehicles/locations fallback returns the same shape plus
 * the denormalized vehicle_capacity_status from the vehicles row.
 * Keeping the interface snake_case-aligned avoids silent state-update
 * failures (where camelCase keys would be `undefined` on the event).
 */
export interface VehicleLocation {
  vehicle_id: string;
  plate_number: string;
  /** Vehicle type (e.g. Jeepney, Bus) from the vehicles row. */
  vehicle_type?: string;
  /** Capacity status baked into the vehicles row (denormalized). */
  vehicle_capacity_status?: string;
  lat: number;
  lng: number;
  speed: number | null;
  heading: number | null;
  /** Live capacity status from vehicle_locations (conductor-updated). */
  capacity_status: string;
  route_name: string | null;
  updated_at: string;
}

interface UseVehicleLocationsResult {
  vehicles: VehicleLocation[];
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
}

// Fallback poll of the seed endpoint so the map still updates if the Pusher
// socket is unavailable. Pusher remains the primary (near-instant) path.
const POLL_INTERVAL_MS = 8000;

export function useVehicleLocations(): UseVehicleLocationsResult {
  const [vehicles, setVehicles] = useState<VehicleLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchInitial = useCallback(async () => {
    try {
      // Same-origin Next proxy: it reads the httpOnly chatco_session cookie and
      // forwards it as a Bearer token to Laravel. (Calling Laravel directly with
      // a localStorage 'token' failed — the token lives in the cookie, not LS.)
      const response = await fetch('/api/vehicles/locations', {
        headers: { Accept: 'application/json' },
        credentials: 'include',
      });
      const json = await response.json();
      setVehicles(Array.isArray(json?.data) ? json.data : []);
      setError(null);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInitial();

    // Whether the realtime socket is confirmed connected right now. The 8s
    // poll below checks this and skips itself while true, so a healthy
    // Pusher connection doesn't also pay for a redundant REST round-trip +
    // full-array state replacement every 8s on top of the WebSocket events.
    // Starts false so the very first tick(s) still poll until the socket
    // reports in — this is a fallback, not a race with Echo.
    let isSocketConnected = false;
    let unsubscribeConnectionChange: (() => void) | null = null;

    const pollId = window.setInterval(() => {
      if (isSocketConnected) return;
      fetchInitial();
    }, POLL_INTERVAL_MS);

    let echo: ReturnType<typeof getEcho> | null = null;
    try {
      echo = getEcho();
      isSocketConnected = echo.connector.connectionStatus() === 'connected';
      unsubscribeConnectionChange = echo.connector.onConnectionChange((status: ConnectionStatus) => {
        isSocketConnected = status === 'connected';
      });

      // Leading dot = listen for the exact broadcastAs name
      // ('VehicleLocationUpdated') rather than Echo's namespaced default.
      echo.channel('vehicles').listen('.VehicleLocationUpdated', (event: VehicleLocation) => {
        setVehicles((prev) => {
          // Match by vehicle_id (snake_case) — same key the backend broadcasts.
          const index = prev.findIndex((v) => v.vehicle_id === event.vehicle_id);
          if (index === -1) {
            return [...prev, event];
          }
          const updated = [...prev];
          updated[index] = event;
          return updated;
        });
      });
    } catch (err) {
      console.warn('Echo subscription failed, falling back to polling:', err);
    }

    return () => {
      window.clearInterval(pollId);
      unsubscribeConnectionChange?.();
      if (echo) {
        echo.channel('vehicles').stopListening('.VehicleLocationUpdated');
      }
    };
  }, [fetchInitial]);

  return { vehicles, loading, error, refresh: fetchInitial };
}
