// app/(admin)/vehicles/data/vehicles-data.ts

import { useState, useEffect, useCallback } from 'react';

// ─── Interfaces (kept as API contracts) ───

export interface Personnel {
  id: string;
  name: string;
  role: 'Driver' | 'Conductor';
  contact: string;
  profilePic: string;
}

export interface Vehicle {
  id: string;
  plateNumber: string;
  route: string;
  driver: string | null;
  conductor: string | null;
  status: 'Operating' | 'Under Maintenance' | 'Out of Service / Damaged';
  speed: number;
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

// ─── API fetch helper ──────────────────────────────────────────────────

async function fetchVehiclesData(): Promise<VehiclesData> {
  const [vehiclesRes, driversRes] = await Promise.all([
    fetch("/api/admin/vehicles", { headers: { Accept: "application/json" } }),
    fetch("/api/admin/drivers", { headers: { Accept: "application/json" } }),
  ]);

  if (!vehiclesRes.ok) throw new Error("Failed to fetch vehicles");
  if (!driversRes.ok) throw new Error("Failed to fetch drivers");

  const vehiclesJson = await vehiclesRes.json();
  const driversJson = await driversRes.json();

  const apiVehicles = vehiclesJson.data ?? [];
  const apiDrivers = driversJson.data ?? [];

  // Map Laravel Vehicles to frontend Vehicle type
  const vehicles: Vehicle[] = apiVehicles.map((v: Record<string, unknown>) => {
    const status = String(v.status ?? "ACTIVE");
    let vehicleStatus: Vehicle['status'] = 'Operating';
    if (status === 'MAINTENANCE') vehicleStatus = 'Under Maintenance';
    else if (status === 'INACTIVE') vehicleStatus = 'Out of Service / Damaged';

    const driver = v.driver as Record<string, unknown> | null;
    const conductor = v.conductor as Record<string, unknown> | null;
    const route = v.route as Record<string, unknown> | null;

    return {
      id: String(v.id ?? ""),
      plateNumber: String(v.plate_number ?? "—"),
      route: route?.name ? String(route.name) : "—",
      driver: driver ? `${driver.first_name ?? ''} ${driver.last_name ?? ''}`.trim() : null,
      conductor: conductor ? `${conductor.first_name ?? ''} ${conductor.last_name ?? ''}`.trim() : null,
      status: vehicleStatus,
      speed: Number(v.speed ?? 0),
    };
  });

  // Map Laravel Drivers to frontend Personnel type
  const driverPersonnel: Personnel[] = apiDrivers.map((d: Record<string, unknown>) => {
    const vehicle = d.vehicle as Record<string, unknown> | null;
    return {
      id: String(d.id ?? ""),
      name: `${d.first_name ?? ''} ${d.last_name ?? ''}`.trim(),
      role: 'Driver',
      contact: String(d.contact ?? "—"),
      profilePic: `https://placehold.co/150x150/0A1E33/62A0EA?text=${String(d.first_name ?? 'D')[0]}`,
    };
  });

  // Note: Conductors are not fetched from a dedicated admin endpoint yet.
  // For now, we extract them from the vehicle relationships.
  const conductorPersonnel: Personnel[] = apiVehicles
    .map((v: Record<string, unknown>) => v.conductor as Record<string, unknown> | null)
    .filter((c): c is Record<string, unknown> => c !== null)
    .map((c) => ({
      id: String(c.id ?? ""),
      name: `${c.first_name ?? ''} ${c.last_name ?? ''}`.trim(),
      role: 'Conductor' as const,
      contact: "—", // Conductor contact not available in vehicle relationship
      profilePic: `https://placehold.co/150x150/0A1E33/F59E0B?text=${String(c.first_name ?? 'C')[0]}`,
    }));

  // Deduplicate conductors (in case multiple vehicles share one)
  const uniqueConductors = Array.from(new Map(conductorPersonnel.map(c => [c.id, c])).values());

  return {
    personnel: [...driverPersonnel, ...uniqueConductors],
    vehicles,
    terminatedPersonnel: [], // No backend endpoint yet
    shiftHistoryLog: [],     // No backend endpoint yet
    driverProfiles: {},      // No backend endpoint yet
    driverRatings: {},       // No backend endpoint yet
  };
}

// ─── Hook ──────────────────────────────────────────────────────────────

export function useVehiclesData() {
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
      const apiData = await fetchVehiclesData();
      setData(apiData);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load vehicles data");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { data, isLoading, error, refetch, setData };
}
