// app/(admin)/vehicles/data/vehicles-data.ts
//
// S5-T11 — Admin Vehicle Management data hook.
//
// VEHICLES: fetched from the real Laravel API via the Next.js proxy
//   (GET /api/admin/vehicles → /api/v1/admin/vehicles) through the
//   vehicle.service.ts gateway (snake→camel mapper + typed errors).
//   Create / update / delete also go through the service so the modal
//   components get typed validation + conflict errors for free.
//
// PERSONNEL (drivers + conductors): fetched directly from /api/admin/drivers
//   and /api/admin/conductors. These are NOT vehicle CRUD — they feed the
//   Personnel tab + the assign-driver/conductor dropdowns in the create/edit
//   modals. Kept inline here because they're a cross-cutting concern of the
//   fleet page, not part of the vehicle service's responsibility.
//
// No mock vehicle data — every vehicle row comes from the API.

import { useState, useEffect, useCallback } from 'react';
import {
  list as listVehicles,
  create as createVehicle,
  update as updateVehicle,
  remove as deleteVehicle,
  type AdminVehicle,
  type VehicleListFilters,
  type VehicleMutationInput,
  type PaginationMeta,
  type VehicleOperationError,
} from '@/lib/admin/services/vehicle.service';

// ─── Re-exported types (used by components) ─────────────────────────

export type { VehicleListFilters, VehicleMutationInput, PaginationMeta, VehicleOperationError };

// ─── Interfaces (kept as the legacy view-model the table/modals use) ───

export interface Personnel {
  id: string;
  name: string;
  role: 'Driver' | 'Conductor';
  contact: string;
  profilePic: string;
}

export interface Vehicle {
  id: string;
  unitNumber: string;
  plateNumber: string;
  route: string;
  driver: string | null;
  conductor: string | null;
  status: 'Operating' | 'Under Maintenance' | 'Out of Service / Damaged';
  speed: number;
  /** The raw service-layer vehicle (for API calls + richer detail in modals). */
  _raw?: AdminVehicle;
}

export interface TerminatedPersonnel {
  id: string;
  name: string;
  role: string;
  contact: string;
  status: 'Terminated' | 'Resigned';
  reason: string;
  terminatedDate: string;
  lastVehicle: string;
}

export interface ShiftLog {
  id: string;
  personnelName: string;
  role: string;
  vehicle: string;
  shiftDate: string;
  details: string;
}

export interface DriverRating {
  id: string;
  date: string;
  commuterName: string;
  plateNumber: string;
  route: string;
  rating: number;
  comment: string;
}

export interface DriverProfile extends Personnel {
  hireDate: string;
  licenseNumber: string;
  licenseExpiry: string;
  totalTrips: number;
  assignedVehicle: string | null;
  assignedRoute: string | null;
}

export interface VehiclesData {
  personnel: Personnel[];
  vehicles: Vehicle[];
  terminatedPersonnel: TerminatedPersonnel[];
  shiftHistoryLog: ShiftLog[];
  driverProfiles: Record<string, DriverProfile>;
  driverRatings: Record<string, DriverRating[]>;
}

// ─── Mapper: service AdminVehicle → legacy Vehicle (table view-model) ───

function mapToVehicle(v: AdminVehicle): Vehicle {
  return {
    id: v.id,
    unitNumber: v.unitNumber,
    plateNumber: v.plateNumber || '—',
    route: v.route?.name ?? '—',
    driver: v.driver?.name ?? null,
    conductor: v.conductor?.name ?? null,
    status: v.statusLabel as Vehicle['status'],
    speed: 0, // speed is a live-fleet concern (monitoring endpoint), not the CRUD list
    _raw: v,
  };
}

// ─── Personnel fetch helper (drivers + conductors) ──────────────────

/**
 * Fetch drivers + conductors for the Personnel tab + the assign dropdowns
 * in the create/edit modals. These endpoints return flat arrays (not
 * paginated), so they're fetched directly rather than via the vehicle
 * service.
 */
async function fetchPersonnel(): Promise<Personnel[]> {
  const [driversRes, conductorsRes] = await Promise.all([
    fetch('/api/admin/drivers', { headers: { Accept: 'application/json' } }),
    fetch('/api/admin/conductors', { headers: { Accept: 'application/json' } }),
  ]);

  if (!driversRes.ok) throw new Error('Failed to fetch drivers');
  // Conductors endpoint may fail if the server is older — fall back to empty.
  const conductorsJson = conductorsRes.ok ? await conductorsRes.json() : { data: [] };
  const driversJson = await driversRes.json();

  const apiDrivers: Record<string, unknown>[] = driversJson.data ?? [];
  const apiConductors: Record<string, unknown>[] = conductorsJson.data ?? [];

  const driverPersonnel: Personnel[] = apiDrivers.map((d) => ({
    id: String(d.id ?? ''),
    name: `${d.first_name ?? ''} ${d.last_name ?? ''}`.trim(),
    role: 'Driver' as const,
    contact: String(d.contact ?? '—'),
    profilePic: `https://placehold.co/150x150/0A1E33/62A0EA?text=${String(d.first_name ?? 'D')[0]}`,
  }));

  const conductorPersonnel: Personnel[] = apiConductors.map((c) => ({
    id: String(c.id ?? ''),
    name: `${c.first_name ?? ''} ${c.last_name ?? ''}`.trim(),
    role: 'Conductor' as const,
    contact: '—',
    profilePic: c.profile_picture_url
      ? String(c.profile_picture_url)
      : `https://placehold.co/150x150/0A1E33/F59E0B?text=${String(c.first_name ?? 'C')[0]}`,
  }));

  return [...driverPersonnel, ...conductorPersonnel];
}

// ─── Hook ───────────────────────────────────────────────────────────

export interface UseVehiclesDataReturn {
  data: VehiclesData;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
  setData: React.Dispatch<React.SetStateAction<VehiclesData>>;
  /** Create a vehicle via the API and refresh the list. */
  createVehicleApi: (input: VehicleMutationInput) => Promise<void>;
  /** Update a vehicle via the API and refresh the list. */
  updateVehicleApi: (id: string, input: VehicleMutationInput) => Promise<void>;
  /** Delete a vehicle via the API and refresh the list. */
  deleteVehicleApi: (id: string) => Promise<void>;
}

export function useVehiclesData(): UseVehiclesDataReturn {
  const [data, setData] = useState<VehiclesData>({
    personnel: [],
    vehicles: [],
    terminatedPersonnel: [],
    shiftHistoryLog: [],
    driverProfiles: {},
    driverRatings: {},
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Vehicles come through the service (typed mapper + error handling).
      // Personnel (drivers/conductors) are fetched directly — see fetchPersonnel.
      const [vehicleResult, personnel] = await Promise.all([
        listVehicles({ perPage: 100 }),
        fetchPersonnel(),
      ]);

      setData({
        personnel,
        vehicles: vehicleResult.vehicles.map(mapToVehicle),
        terminatedPersonnel: [], // No backend endpoint yet
        shiftHistoryLog: [],     // Shift history is fetched per-vehicle on demand
        driverProfiles: {},      // No backend endpoint yet
        driverRatings: {},       // No backend endpoint yet
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load vehicles data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const createVehicleApi = useCallback(
    async (input: VehicleMutationInput) => {
      await createVehicle(input);
      await refetch();
    },
    [refetch]
  );

  const updateVehicleApi = useCallback(
    async (id: string, input: VehicleMutationInput) => {
      await updateVehicle(id, input);
      await refetch();
    },
    [refetch]
  );

  const deleteVehicleApi = useCallback(
    async (id: string) => {
      await deleteVehicle(id);
      await refetch();
    },
    [refetch]
  );

  return { data, isLoading, error, refetch, setData, createVehicleApi, updateVehicleApi, deleteVehicleApi };
}
