import { api, ApiError, NetworkError } from "@/lib/api/client";
import { CONDUCTOR_API } from "@/lib/conductor/endpoints";
import { shouldUseConductorApi } from "@/lib/conductor/services/api-mode";
import * as shiftStore from "@/lib/conductor/persistence/shift.store";
import type { ConductorShift } from "@/lib/conductor/persistence/shift.store";

export type { ConductorShift };

export async function fetchActiveShift(): Promise<ConductorShift | null> {
  if (shouldUseConductorApi()) {
    try {
      const response = await api.get<{ data: ConductorShift | null }>(
        CONDUCTOR_API.shifts.active
      );
      const shift = response.data ?? null;
      if (shift) shiftStore.cacheShift(shift);
      return shift;
    } catch (error) {
      if (!(error instanceof NetworkError) && !(error instanceof ApiError)) throw error;
    }
  }

  return shiftStore.getActiveShift();
}

/**
 * Start a conductor shift.
 *
 * In API mode (default), the proxy at `/api/conductor/shifts/start`
 * forwards `{ unitId, driverId, routeId? }` to Laravel as
 * `{ vehicle_id, driver_id, route_id }`, which creates the `shift_logs`
 * row inside a DB transaction.
 *
 * In local mode (`NEXT_PUBLIC_CONDUCTOR_API_MODE=local`), falls back to
 * the localStorage mock store (prototype only — no DB row is created).
 */
export async function startShift(data: {
  unitId: string;
  driverId: string;
  routeId?: string;
}): Promise<ConductorShift> {
  if (shouldUseConductorApi()) {
    const response = await api.post<{ data: ConductorShift }>(
      CONDUCTOR_API.shifts.start,
      data
    );
    shiftStore.cacheShift(response.data);
    return response.data;
  }

  // Local prototype fallback — generate a minimal shift from IDs.
  const shift: ConductorShift = {
    shiftId: `SHF-${Date.now().toString(36).toUpperCase()}`,
    conductorName: "Conductor",
    unitNumber: data.unitId,
    route: "",
    driverName: "Driver",
    timeIn: new Date().toISOString(),
    timeOut: null,
    isActive: true,
  };
  shiftStore.cacheShift(shift);
  return shift;
}

export async function endShift(): Promise<ConductorShift | null> {
  if (shouldUseConductorApi()) {
    try {
      const response = await api.post<{ data: ConductorShift | null }>(
        CONDUCTOR_API.shifts.end
      );
      if (response.data) shiftStore.cacheShift(response.data);
      return response.data ?? null;
    } catch (error) {
      if (!(error instanceof NetworkError) && !(error instanceof ApiError)) throw error;
    }
  }

  return shiftStore.endShift();
}

export function clearShift(): void {
  shiftStore.clearShift();
}

export function getElapsed(shift: ConductorShift): string {
  const start = new Date(shift.timeIn).getTime();
  const end = shift.timeOut ? new Date(shift.timeOut).getTime() : Date.now();
  const diff = Math.floor((end - start) / 1000);
  const h = Math.floor(diff / 3600);
  const m = Math.floor((diff % 3600) / 60);
  if (h > 0) return `${h}h ${m.toString().padStart(2, "0")}m`;
  return `${m}m`;
}

export function getDuration(shift: ConductorShift): string {
  if (!shift.timeOut) return getElapsed(shift);
  const start = new Date(shift.timeIn).getTime();
  const end = new Date(shift.timeOut).getTime();
  const diff = Math.floor((end - start) / 1000);
  const h = Math.floor(diff / 3600);
  const m = Math.floor((diff % 3600) / 60);
  if (h > 0) return `${h}h ${m.toString().padStart(2, "0")}m`;
  return `${m}m`;
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-PH", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export function getActiveShift(): ConductorShift | null {
  return shiftStore.getActiveShift();
}

export function getShift(): ConductorShift | null {
  return shiftStore.getShift();
}
