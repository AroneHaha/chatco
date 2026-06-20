// Shape mappers -- translate Laravel Eloquent model JSON (snake_case, relations
// nested) into the frontend's conductor types (camelCase, flat).
// Used by the Next.js conductor API routes which act as server-side proxies.

// ─── Laravel model shapes (as returned by the API) ───────────────────

interface LaravelRoute {
  id: string;
  name: string;
}

interface LaravelVehicle {
  id: string;
  unit_number: string;
  plate_number: string;
  vehicle_type: string | null;
  route_id: string | null;
  status: string;
  capacity_status: string | null;
  route?: LaravelRoute | null;
}

interface LaravelDriver {
  id: string;
  first_name: string;
  middle_name: string | null;
  last_name: string;
  status: string;
}

interface LaravelHailCommuter {
  // The User model has no `name` column (name lives in commuterProfile and is
  // only exposed via getDisplayName()). It is mapped here defensively so that
  // if the backend later eager-loads the profile or appends a display name,
  // this picks it up without a frontend change.
  name?: string | null;
  email?: string | null;
}

interface LaravelHail {
  id: string;
  // decimal:7 / decimal:2 casts serialize as STRINGS — must be coerced to
  // numbers before Leaflet / distance math can use them.
  commuter_lat: string | number;
  commuter_lng: string | number;
  commuter?: LaravelHailCommuter | null;
}

interface LaravelShiftLog {
  shift_id: string;
  conductor_id: string;
  driver_id: string;
  vehicle_id: string;
  route_id: string | null;
  conductor_name: string;
  driver_name: string;
  unit_number: string;
  plate_number: string;
  time_in: string;
  time_out: string | null;
  status: string;
  route?: LaravelRoute | null;
  vehicle?: LaravelVehicle | null;
  driver?: LaravelDriver | null;
}

// ─── Frontend types ──────────────────────────────────────────────────

import type {
  ConductorUnit,
  ConductorDriver,
  ConductorHailRequest,
} from "@/lib/conductor/types";
import type { ConductorShift } from "@/lib/conductor/persistence/shift.store";

// ─── Mappers ─────────────────────────────────────────────────────────

export function mapVehicle(v: unknown): ConductorUnit {
  const vehicle = v as LaravelVehicle;
  return {
    id: vehicle.id,
    unitNumber: vehicle.unit_number,
    plateNumber: vehicle.plate_number,
    route: vehicle.route?.name ?? "—",
    routeId: vehicle.route_id ?? undefined,
    status: "available",
  };
}

export function mapDriver(d: unknown): ConductorDriver {
  const driver = d as LaravelDriver;
  const name = [driver.first_name, driver.last_name]
    .filter(Boolean)
    .join(" ")
    .trim();
  return {
    id: driver.id,
    name: name || "Unknown Driver",
    status: "available",
  };
}

export function mapShiftLog(s: unknown): ConductorShift {
  const shift = s as LaravelShiftLog;
  return {
    shiftId: shift.shift_id,
    conductorName: shift.conductor_name,
    unitNumber: shift.unit_number,
    route: shift.route?.name ?? "",
    driverName: shift.driver_name,
    timeIn: shift.time_in,
    timeOut: shift.time_out,
    isActive: shift.status === "ACTIVE",
  };
}

export function mapConductorHail(h: unknown): ConductorHailRequest {
  const hail = h as LaravelHail;
  return {
    id: hail.id,
    // No display name is serialized by the backend yet, so fall back to a
    // generic label rather than rendering "undefined" in the map popup.
    commuterName: hail.commuter?.name ?? "Commuter",
    latitude: Number(hail.commuter_lat),
    longitude: Number(hail.commuter_lng),
  };
}

/**
 * Map an array of Laravel models. Returns [] for null/undefined input.
 */
export function mapArray<T>(items: unknown, mapFn: (item: unknown) => T): T[] {
  if (!Array.isArray(items)) return [];
  return items.map(mapFn);
}
