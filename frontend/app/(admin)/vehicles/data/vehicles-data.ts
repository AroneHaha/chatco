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
  unitNumber: string;
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
  const [vehiclesRes, driversRes, conductorsRes, shiftLogsRes, terminatedRes] = await Promise.all([
    fetch("/api/admin/vehicles", { headers: { Accept: "application/json" } }),
    fetch("/api/admin/drivers", { headers: { Accept: "application/json" } }),
    fetch("/api/admin/conductors", { headers: { Accept: "application/json" } }),
    // Shift logs + terminated personnel are best-effort — if either endpoint
    // is unavailable (e.g. older backend), the History tab just shows "no
    // records" instead of failing the entire fleet page.
    fetch("/api/admin/shift-logs?per_page=500", { headers: { Accept: "application/json" } }).catch(() => null),
    fetch("/api/admin/terminated-personnel?per_page=500", { headers: { Accept: "application/json" } }).catch(() => null),
  ]);

  if (!vehiclesRes.ok) throw new Error("Failed to fetch vehicles");
  if (!driversRes.ok) throw new Error("Failed to fetch drivers");

  const vehiclesJson = await vehiclesRes.json();
  const driversJson = await driversRes.json();
  // Conductors endpoint may fail if the server is older — fall back to
  // extracting conductors from vehicle relationships.
  const conductorsJson = conductorsRes.ok ? await conductorsRes.json() : { data: [] };
  const shiftLogsJson = shiftLogsRes?.ok ? await shiftLogsRes.json() : { data: [] };
  const terminatedJson = terminatedRes?.ok ? await terminatedRes.json() : { data: [] };

  // Drivers + conductors return flat arrays (non-paginated — used in
  // assignment dropdowns). Shift-logs + terminated-personnel now return
  // paginators: { data: { data: [...], current_page, total, ... } }.
  // We extract the inner data array for all, with fallbacks for both shapes.
  const apiVehicles = vehiclesJson.data?.data ?? vehiclesJson.data ?? [];
  const apiDrivers = driversJson.data ?? [];
  const apiConductors = conductorsJson.data ?? [];
  const apiShiftLogs = shiftLogsJson.data?.data ?? (Array.isArray(shiftLogsJson.data) ? shiftLogsJson.data : []);
  const apiTerminated = terminatedJson.data?.data ?? (Array.isArray(terminatedJson.data) ? terminatedJson.data : []);

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
      unitNumber: String(v.unit_number ?? "—"),
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

  // ── Map Laravel ShiftLogs to frontend ShiftLog entries ──
  // Each backend shift log has BOTH a driver_name and conductor_name (a
  // shift involves two people). We split each backend row into TWO frontend
  // entries — one for the driver, one for the conductor — so the HistoryTable
  // can filter by `log.personnelName === person.name` and find the right
  // person's shifts.
  //
  // Backend ShiftLog fields: shift_id, conductor_id, driver_id, vehicle_id,
  // route_id, conductor_name, driver_name, unit_number, plate_number,
  // time_in, time_out, is_active, notes, status + relations (vehicle, driver,
  // route). We use the denormalized *_name / unit_number / plate_number
  // columns (they're stored on the row at shift-start time so the log is
  // immutable even if the person is later renamed).
  const formatShiftDate = (iso: string | null): string => {
    if (!iso) return '—';
    try {
      return new Date(iso).toLocaleDateString('en-US', {
        year: 'numeric', month: 'short', day: 'numeric',
      });
    } catch {
      return '—';
    }
  };

  const buildDetails = (log: Record<string, unknown>): string => {
    const timeIn = log.time_in ? String(log.time_in).slice(11, 19) : '—';
    const timeOut = log.time_out ? String(log.time_out).slice(11, 19) : '—';
    const status = String(log.status ?? '—');
    const notes = log.notes ? String(log.notes) : '';
    let details = `Time in: ${timeIn} · Time out: ${timeOut} · Status: ${status}`;
    if (notes) details += ` · Notes: ${notes}`;
    return details;
  };

  const shiftHistoryLog: ShiftLog[] = [];
  for (const log of apiShiftLogs as Record<string, unknown>[]) {
    const shiftId = String(log.shift_id ?? '');
    const vehicleLabel = String(log.unit_number ?? log.plate_number ?? '—');
    const shiftDate = formatShiftDate((log.time_in as string | null) ?? null);
    const details = buildDetails(log);

    // Driver entry (skip if the shift has no driver_name)
    const driverName = String(log.driver_name ?? '').trim();
    if (driverName) {
      shiftHistoryLog.push({
        id: `${shiftId}:driver`,
        personnelName: driverName,
        role: 'Driver',
        vehicle: vehicleLabel,
        shiftDate,
        details,
      });
    }

    // Conductor entry (skip if the shift has no conductor_name)
    const conductorName = String(log.conductor_name ?? '').trim();
    if (conductorName) {
      shiftHistoryLog.push({
        id: `${shiftId}:conductor`,
        personnelName: conductorName,
        role: 'Conductor',
        vehicle: vehicleLabel,
        shiftDate,
        details,
      });
    }
  }

  return {
    personnel: [...driverPersonnel, ...conductorPersonnel],
    vehicles,
    // ── Terminated Personnel ──
    // Mapped from the terminated_personnel table (populated by the
    // destroyDriver/destroyConductor backend methods when an admin removes
    // someone via the "Remove Personnel" flow). Each record is immutable —
    // name/contact/last_vehicle are captured at termination time so the
    // history is preserved even if the underlying driver/user row is purged.
    terminatedPersonnel: (apiTerminated as Record<string, unknown>[]).map(t => ({
      id: String(t.id ?? ''),
      name: String(t.name ?? 'Unknown'),
      role: String(t.role ?? '—'),
      contact: String(t.contact ?? '—'),
      // Backend stores TERMINATED/RESIGNED; the UI label matches the modal's
      // termination_type values directly (the modal already uses these
      // exact strings as option values).
      status: (t.termination_type === 'RESIGNED' ? 'Resigned' : 'Terminated') as TerminatedPersonnel['status'],
      reason: String(t.reason ?? '—'),
      terminatedDate: String(t.terminated_date ?? ''),
      lastVehicle: String(t.last_vehicle ?? '—'),
    })),
    shiftHistoryLog,
    // driverProfiles + driverRatings: the PersonnelTable no longer uses
    // these — the DriverDetailModal fetches its own data from
    // /api/admin/drivers/{id} (which includes shift_logs). Kept in the
    // interface for backwards compatibility; always empty.
    driverProfiles: {},
    driverRatings: {},
  };
}

// ─── Hook ──────────────────────────────────────────────────────────────

/** How often the fleet page re-pulls assignments in the background. */
const VEHICLES_POLL_INTERVAL_MS = 30_000;

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

  // `silent` skips the loading flag so background polls don't flash skeletons
  // over a populated table.
  const load = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true);
    setError(null);
    try {
      const apiData = await fetchVehiclesData();
      setData(apiData);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load vehicles data");
    } finally {
      if (!silent) setIsLoading(false);
    }
  }, []);

  const refetch = useCallback(() => load(false), [load]);

  useEffect(() => {
    load(false);

    // Assignments change without any action from this browser — a conductor
    // starting a shift, or the midnight reset clearing every unit. Poll so an
    // admin leaving the fleet page open doesn't sit on stale assignments.
    const id = setInterval(() => {
      if (document.visibilityState === "visible") load(true);
    }, VEHICLES_POLL_INTERVAL_MS);

    // Catch up immediately when the tab is refocused after being hidden.
    const onVisible = () => {
      if (document.visibilityState === "visible") load(true);
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [load]);

  return { data, isLoading, error, refetch, setData };
}
