import { useEffect, useState, useCallback, useRef } from 'react';
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
const RECONCILE_INTERVAL_MS = 60000;

function normalizeLocation(location: VehicleLocation): VehicleLocation | null {
  // Database decimals may arrive as strings. Capacity changes can also be
  // broadcast before the first GPS fix, when coordinates are still null.
  if (location.lat == null || location.lng == null) return null;
  const lat = Number(location.lat);
  const lng = Number(location.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return { ...location, lat, lng };
}

function applyLocationUpdate(vehicles: VehicleLocation[], event: VehicleLocation): VehicleLocation[] {
  const location = normalizeLocation(event);
  const index = vehicles.findIndex((vehicle) => vehicle.vehicle_id === event.vehicle_id);
  if (!location) return index === -1 ? vehicles : vehicles.filter((vehicle) => vehicle.vehicle_id !== event.vehicle_id);
  if (index === -1) return [...vehicles, location];
  const updated = [...vehicles];
  updated[index] = location;
  return updated;
}

export function useVehicleLocations(): UseVehicleLocationsResult {
  const [vehicles, setVehicles] = useState<VehicleLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const refreshInFlight = useRef<Promise<void> | null>(null);
  const refreshPending = useRef(false);
  const updatesDuringFetch = useRef(new Map<string, VehicleLocation>());

  const fetchInitial = useCallback(async () => {
    if (refreshInFlight.current) {
      refreshPending.current = true;
      return refreshInFlight.current;
    }

    const request = (async () => {
      try {
        // Same-origin Next proxy: it reads the httpOnly chatco_session cookie
        // and forwards it as a Bearer token to Laravel.
        do {
          refreshPending.current = false;
          updatesDuringFetch.current.clear();
          const response = await fetch('/api/vehicles/locations', {
            headers: { Accept: 'application/json' },
            credentials: 'include',
            cache: 'no-store',
          });
          if (!response.ok) throw new Error(`Unable to load vehicle locations (HTTP ${response.status}).`);
          const json = await response.json();
          const locations: VehicleLocation[] = Array.isArray(json?.data) ? json.data : [];
          let latest = locations.map(normalizeLocation).filter((location): location is VehicleLocation => location !== null);
          // A seed/poll response must not undo a newer capacity or GPS event
          // received while that request was taking its database snapshot.
          for (const event of updatesDuringFetch.current.values()) latest = applyLocationUpdate(latest, event);
          setVehicles(latest);
          setError(null);
        } while (refreshPending.current);
      } catch (err) {
        setError(err as Error);
      } finally {
        updatesDuringFetch.current.clear();
        refreshInFlight.current = null;
        setLoading(false);
      }
    })();
    refreshInFlight.current = request;
    return request;
  }, []);

  useEffect(() => {
    fetchInitial();

    let isSubscribed = false;
    let lastRefreshAt = Date.now();
    let unsubscribeConnectionChange: (() => void) | null = null;
    let unsubscribeChannel: (() => void) | null = null;

    const refreshWhenVisible = () => {
      if (document.visibilityState !== 'visible' || !navigator.onLine) return;
      lastRefreshAt = Date.now();
      void fetchInitial();
    };

    const pollId = window.setInterval(() => {
      // Subscription health matters, not just transport connectivity. A slow
      // safety refresh also reconciles missed events and vehicles leaving duty.
      const refreshMs = isSubscribed ? RECONCILE_INTERVAL_MS : POLL_INTERVAL_MS;
      if (Date.now() - lastRefreshAt >= refreshMs) refreshWhenVisible();
    }, POLL_INTERVAL_MS);

    window.addEventListener('focus', refreshWhenVisible);
    window.addEventListener('online', refreshWhenVisible);
    document.addEventListener('visibilitychange', refreshWhenVisible);

    let echo: ReturnType<typeof getEcho> | null = null;
    try {
      echo = getEcho();
      unsubscribeConnectionChange = echo.connector.onConnectionChange((status: ConnectionStatus) => {
        if (status !== 'connected') isSubscribed = false;
      });

      // Leading dot = listen for the exact broadcastAs name
      // ('VehicleLocationUpdated') rather than Echo's namespaced default.
      const onLocationUpdated = (event: VehicleLocation) => {
        if (refreshInFlight.current) updatesDuringFetch.current.set(event.vehicle_id, event);
        setVehicles((prev) => applyLocationUpdate(prev, event));
      };
      const onSubscribed = () => {
        isSubscribed = true;
        refreshWhenVisible();
      };
      const onSubscriptionError = () => {
        isSubscribed = false;
        refreshWhenVisible();
      };
      const channel = echo.channel('vehicles');
      channel.listen('.VehicleLocationUpdated', onLocationUpdated);
      // Bind named callbacks so cleanup removes only this hook's listeners.
      channel.on('pusher:subscription_succeeded', onSubscribed);
      channel.on('pusher:subscription_error', onSubscriptionError);
      isSubscribed = channel.subscription.subscribed;
      unsubscribeChannel = () => {
        channel.stopListening('.VehicleLocationUpdated', onLocationUpdated);
        channel.subscription.unbind('pusher:subscription_succeeded', onSubscribed);
        channel.subscription.unbind('pusher:subscription_error', onSubscriptionError);
      };
    } catch (err) {
      console.warn('Echo subscription failed, falling back to polling:', err);
    }

    return () => {
      window.clearInterval(pollId);
      unsubscribeConnectionChange?.();
      unsubscribeChannel?.();
      window.removeEventListener('focus', refreshWhenVisible);
      window.removeEventListener('online', refreshWhenVisible);
      document.removeEventListener('visibilitychange', refreshWhenVisible);
    };
  }, [fetchInitial]);

  return { vehicles, loading, error, refresh: fetchInitial };
}
