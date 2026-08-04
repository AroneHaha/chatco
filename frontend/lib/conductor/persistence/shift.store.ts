import { logShiftEnd, logShiftStart } from "./shift-history";

export interface ConductorShift {
  shiftId: string;
  conductorName: string;
  unitNumber: string;
  route: string;
  routeId?: string;
  driverName: string;
  timeIn: string;
  timeOut: string | null;
  isOnBreak?: boolean;
  breakStartedAt?: string | null;
  isActive: boolean;
}

const SHIFT_KEY = "conductor_shift";

export function startShift(data: {
  conductorName: string;
  unitNumber: string;
  route: string;
  routeId?: string;
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

  logShiftStart({
    shiftId: shift.shiftId,
    unitNumber: shift.unitNumber,
    plateNumber: "",
    conductorName: shift.conductorName,
    driverName: shift.driverName,
    route: shift.route,
    timeIn: shift.timeIn,
    duration: null,
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
  logShiftEnd(shift.shiftId);
  return shift;
}

export function clearShift() {
  localStorage.removeItem(SHIFT_KEY);
}

/** Cache shift state returned from the API for offline fallback reads. */
export function cacheShift(shift: ConductorShift): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(SHIFT_KEY, JSON.stringify(shift));
}
