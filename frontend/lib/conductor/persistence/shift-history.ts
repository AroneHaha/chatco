// frontend/lib/conductor/persistence/shift-history.ts
// Shift log history — persists shift start/end events to localStorage.
// Used by shift.store.ts for audit trail logging.

const SHIFT_LOGS_KEY = "conductor_shift_logs";

export interface ShiftLog {
  duration: string | null;
  shiftId: string;
  unitNumber: string;
  plateNumber: string;
  conductorName: string;
  driverName: string;
  route: string;
  timeIn: string;
  timeOut?: string;
}

export function logShiftStart(log: ShiftLog): void {
  if (typeof window === "undefined") return;
  const logs: ShiftLog[] = JSON.parse(localStorage.getItem(SHIFT_LOGS_KEY) || "[]");
  logs.unshift(log);
  localStorage.setItem(SHIFT_LOGS_KEY, JSON.stringify(logs));
}

export function logShiftEnd(shiftId: string): void {
  if (typeof window === "undefined") return;
  const logs: ShiftLog[] = JSON.parse(localStorage.getItem(SHIFT_LOGS_KEY) || "[]");
  const idx = logs.findIndex((l) => l.shiftId === shiftId);
  if (idx !== -1) {
    logs[idx].timeOut = new Date().toISOString();
    localStorage.setItem(SHIFT_LOGS_KEY, JSON.stringify(logs));
  }
}

export function getShiftLogs(): ShiftLog[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(SHIFT_LOGS_KEY) || "[]");
  } catch {
    return [];
  }
}

export function clearShiftLogs(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(SHIFT_LOGS_KEY);
}