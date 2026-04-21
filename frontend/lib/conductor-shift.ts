import { logShiftStart, logShiftEnd } from "./conductor-shift-history";


export interface ConductorShift {
  shiftId: string;
  conductorName: string;
  unitNumber: string;
  route: string;
  driverName: string;
  timeIn: string;
  timeOut: string | null;
  isActive: boolean;
}

const SHIFT_KEY = "conductor_shift";

export function startShift(data: {
  conductorName: string;
  unitNumber: string;
  route: string;
  driverName: string;
}): ConductorShift {
  const shift: ConductorShift = {
    ...data,
    shiftId: `SHF-${Date.now().toString(36).toUpperCase()}`,
    timeIn: new Date().toISOString(),
    timeOut: null,
    isActive: true,
  };
  localStorage.setItem(SHIFT_KEY, JSON.stringify(shift));

  // Record time-in in shift history
  logShiftStart({
    shiftId: shift.shiftId,
    unitNumber: shift.unitNumber,
    plateNumber: "", // not available at this layer — fine for now
    conductorName: shift.conductorName,
    driverName: shift.driverName,
    route: shift.route,
    timeIn: shift.timeIn,
  });

  return shift;
}

export function getShift(): ConductorShift | null {
  const raw = localStorage.getItem(SHIFT_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as ConductorShift;
  } catch {
    return null;
  }
}

export function getActiveShift(): ConductorShift | null {
  const shift = getShift();
  if (!shift || !shift.isActive) return null;
  return shift;
}

export function endShift(): ConductorShift | null {
  const shift = getActiveShift();
  if (!shift) return null;

  shift.timeOut = new Date().toISOString();
  shift.isActive = false;
  localStorage.setItem(SHIFT_KEY, JSON.stringify(shift));

  // Record time-out in shift history
  logShiftEnd(shift.shiftId);

  return shift;
}

export function clearShift() {
  localStorage.removeItem(SHIFT_KEY);
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