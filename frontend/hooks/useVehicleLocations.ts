import { useEffect, useState, useCallback } from 'react';
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

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

export function useVehicleLocations(): UseVehicleLocationsResult {
  const [vehicles, setVehicles] = useState<VehicleLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchInitial = useCallback(async () => {
    try {
      setLoading(true);
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const response = await fetch(`${API_BASE_URL}/vehicles/locations`, {
        headers: {
          Accept: 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      const json = await response.json();
      setVehicles(json.data ?? []);
      setError(null);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInitial();

    let echo: ReturnType<typeof getEcho> | null = null;
    try {
      echo = getEcho();
      echo.channel('vehicles').listen('VehicleLocationUpdated', (event: VehicleLocation) => {
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
      if (echo) {
        echo.channel('vehicles').stopListening('VehicleLocationUpdated');
      }
    };
  }, [fetchInitial]);

  return { vehicles, loading, error, refresh: fetchInitial };
}
