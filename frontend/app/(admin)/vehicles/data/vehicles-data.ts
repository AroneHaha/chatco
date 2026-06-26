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
  const [vehiclesRes, driversRes, conductorsRes] = await Promise.all([
    fetch("/api/admin/vehicles", { headers: { Accept: "application/json" } }),
    fetch("/api/admin/drivers", { headers: { Accept: "application/json" } }),
    fetch("/api/admin/conductors", { headers: { Accept: "application/json" } }),
  ]);

  if (!vehiclesRes.ok) throw new Error("Failed to fetch vehicles");
  if (!driversRes.ok) throw new Error("Failed to fetch drivers");

  const vehiclesJson = await vehiclesRes.json();
  const driversJson = await driversRes.json();
  // Conductors endpoint may fail if the server is older — fall back to
  // extracting conductors from vehicle relationships.
  const conductorsJson = conductorsRes.ok ? await conductorsRes.json() : { data: [] };

  // The admin /vehicles endpoint now returns a paginated response (Week 5
  // refactor): { data: { data: [...vehicles], current_page, total, ... } }
  // The inner .data is the actual vehicle array. The outer .data is the
  // Laravel paginator object. We extract the inner array here.
  // Drivers + conductors endpoints still return flat arrays.
  const apiVehicles = vehiclesJson.data?.data ?? vehiclesJson.data ?? [];
  const apiDrivers = driversJson.data ?? [];
  const apiConductors = conductorsJson.data ?? [];

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

  // Map Laravel ConductorProfiles to frontend Personnel type.
  // Uses the dedicated /admin/conductors endpoint (Batch 4) — no longer
  // extracted from vehicle relationships, so unassigned conductors appear too.
  const conductorPersonnel: Personnel[] = apiConductors.map((c: Record<string, unknown>) => ({
    id: String(c.id ?? ""),
    name: `${c.first_name ?? ''} ${c.last_name ?? ''}`.trim(),
    role: 'Conductor' as const,
    contact: "—",
    profilePic: c.profile_picture_url
      ? String(c.profile_picture_url)
      : `https://placehold.co/150x150/0A1E33/F59E0B?text=${String(c.first_name ?? 'C')[0]}`,
  }));

  return {
    personnel: [...driverPersonnel, ...conductorPersonnel],
    vehicles,
    terminatedPersonnel: [], // No backend endpoint yet (Batch 7)
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
