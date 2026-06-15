// frontend/app/(admin)/vehicles/data/vehicles-data.ts
//
// Admin Vehicles data layer.
// Interfaces match the VehiclesController output EXACTLY.
// Controller: App\Http\Controllers\Api\Admin\VehiclesController

import { useState, useEffect, useCallback } from 'react';
import { apiGet } from '@/lib/api';

// ── Interfaces matching VehiclesController output ─────────────────────

export interface Personnel {
  id: string | number;
  name: string;
  role: 'Driver' | 'Conductor';
  contact: string | null;
  profilePic?: string | null;
}

export interface Vehicle {
  id: string | number;
  plateNumber: string;
  route: string | null;
  driver: string | null;
  conductor: string | null;
  status: string | null;
  speed: number | null;
}

export interface TerminatedPersonnel {
  id: string | number;
  name: string | null;
  role: string | null;
  contact: string | null;
  profilePic?: string | null;
  status: string | null;
  reason: string | null;
  terminatedDate: string | null;
  lastVehicle: string | null;
}

export interface ShiftLog {
  id: string;
  personnelName: string | null;
  role: string | null;
  vehicle: string | null;
  shiftDate: string | null;
  details: string | null;
}

export interface DriverRating {
  id: string;
  date?: string | null;
  commuterName?: string | null;
  plateNumber?: string | null;
  route?: string | null;
  rating?: number | null;
  comment?: string | null;
}

export interface DriverProfile extends Personnel {
  hireDate: string | null;
  licenseNumber: string | null;
  licenseExpiry: string | null;
  totalTrips: number;
  assignedVehicle: string | null;
  assignedRoute: string | null;
}

// ── Consolidated data shape ───────────────────────────────────────────

export interface VehiclesData {
  personnel: Personnel[];
  vehicles: Vehicle[];
  terminatedPersonnel: TerminatedPersonnel[];
  shiftHistoryLog: ShiftLog[];
  driverProfiles: Record<string, DriverProfile>;
  driverRatings: Record<string, DriverRating[]>;
}

// ── API response shapes ───────────────────────────────────────────────

interface VehiclesListResponse {
  vehicles: Vehicle[];
  personnel: Personnel[];
  terminatedPersonnel: TerminatedPersonnel[];
  shiftHistoryLog: ShiftLog[];
}

interface DriverProfileResponse {
  profile: DriverProfile;
}

interface DriverRatingsResponse {
  ratings: DriverRating[];
}

// ── Hook ──────────────────────────────────────────────────────────────

const EMPTY_DATA: VehiclesData = {
  personnel: [],
  vehicles: [],
  terminatedPersonnel: [],
  shiftHistoryLog: [],
  driverProfiles: {},
  driverRatings: {},
};

export function useVehiclesData() {
  const [data, setData] = useState<VehiclesData>(EMPTY_DATA);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await apiGet<VehiclesListResponse>('/api/admin/vehicles');
      setData({
        vehicles: result.vehicles ?? [],
        personnel: result.personnel ?? [],
        terminatedPersonnel: result.terminatedPersonnel ?? [],
        shiftHistoryLog: result.shiftHistoryLog ?? [],
        driverProfiles: {},
        driverRatings: {},
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load vehicles data';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchDriverProfile = useCallback(async (driverId: string): Promise<DriverProfile | null> => {
    try {
      const result = await apiGet<DriverProfileResponse>(`/api/admin/drivers/${driverId}`);
      const profile = result.profile;
      if (profile) {
        setData((prev) => ({
          ...prev,
          driverProfiles: {
            ...prev.driverProfiles,
            [driverId]: profile,
          },
        }));
      }
      return profile ?? null;
    } catch {
      return null;
    }
  }, []);

  const fetchDriverRatings = useCallback(async (driverId: string): Promise<DriverRating[]> => {
    try {
      const result = await apiGet<DriverRatingsResponse>(`/api/admin/drivers/${driverId}/ratings`);
      const ratings = result.ratings ?? [];
      setData((prev) => ({
        ...prev,
        driverRatings: {
          ...prev.driverRatings,
          [driverId]: ratings,
        },
      }));
      return ratings;
    } catch {
      return [];
    }
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { data, isLoading, error, refetch, setData, fetchDriverProfile, fetchDriverRatings };
}