import { api, NetworkError } from "@/lib/api/client";
import { CONDUCTOR_API } from "@/lib/conductor/endpoints";
import * as shiftStore from "@/lib/conductor/persistence/shift.store";
import type { ConductorShift } from "@/lib/conductor/persistence/shift.store";

export type { ConductorShift };

function hasRemoteApi(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_API_URL);
}

export async function fetchActiveShift(): Promise<ConductorShift | null> {
  if (hasRemoteApi()) {
    try {
      const response = await api.get<{ data: ConductorShift | null }>(
        CONDUCTOR_API.shifts.active
      );
      return response.data ?? null;
    } catch (error) {
      if (!(error instanceof NetworkError)) throw error;
    }
  }

  return shiftStore.getActiveShift();
}

export async function startShift(data: {
  conductorName: string;
  unitNumber: string;
  route: string;
  driverName: string;
}): Promise<ConductorShift> {
  if (hasRemoteApi()) {
    try {
      const response = await api.post<{ data: ConductorShift }>(
        CONDUCTOR_API.shifts.start,
        data
      );
      return response.data;
    } catch (error) {
      if (!(error instanceof NetworkError)) throw error;
    }
  }

  return shiftStore.startShift(data);
}

export async function endShift(): Promise<ConductorShift | null> {
  if (hasRemoteApi()) {
    try {
      const response = await api.post<{ data: ConductorShift | null }>(
        CONDUCTOR_API.shifts.end
      );
      return response.data ?? null;
    } catch (error) {
      if (!(error instanceof NetworkError)) throw error;
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

// Sync helpers for event listeners and legacy imports.
export function getActiveShift(): ConductorShift | null {
  return shiftStore.getActiveShift();
}

export function getShift(): ConductorShift | null {
  return shiftStore.getShift();
}
