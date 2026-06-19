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

import type {
  ConductorUnit,
  ConductorDriver,
} from "@/lib/conductor/types";
import type { ConductorShift } from "@/lib/conductor/persistence/shift.store";

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

export function mapArray<T>(items: unknown, mapFn: (item: unknown) => T): T[] {
  if (!Array.isArray(items)) return [];
  return items.map(mapFn);
}
