import { useEffect, useState, useCallback } from 'react';
import { getEcho } from '@/lib/echo';
import { api } from '@/lib/api';

export interface VehicleLocation {
  vehicleId: string;
  plateNumber: string;
  vehicleType: string;
  lat: number;
  lng: number;
  speed: number | null;
  heading: number | null;
  capacityStatus: string;
  routeName: string | null;
  updatedAt: string;
}

interface UseVehicleLocationsResult {
  vehicles: VehicleLocation[];
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
}

export function useVehicleLocations(): UseVehicleLocationsResult {
  const [vehicles, setVehicles] = useState<VehicleLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchInitial = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/vehicles/locations');
      setVehicles(response.data.data ?? []);
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
          const index = prev.findIndex((v) => v.vehicleId === event.vehicleId);
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