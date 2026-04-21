export interface ShiftLog {
  shiftId: string;
  unitNumber: string;
  plateNumber: string;
  conductorName: string;
  driverName: string;
  route: string;
  timeIn: string;        // ISO string
  timeOut: string | null; // ISO string, null if shift still active
  duration: string | null; // formatted "2h 30m", null if still active
}

const LOGS_KEY = "conductor_shift_logs";

function getAllLogs(): ShiftLog[] {
  const raw = localStorage.getItem(LOGS_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as ShiftLog[];
  } catch {
    return [];
  }
}

function saveLogs(logs: ShiftLog[]) {
  localStorage.setItem(LOGS_KEY, JSON.stringify(logs));
}

function computeDuration(timeIn: string, timeOut: string | null): string {
  const start = new Date(timeIn).getTime();
  const end = timeOut ? new Date(timeOut).getTime() : Date.now();
  const diff = Math.floor((end - start) / 1000);
  const h = Math.floor(diff / 3600);
  const m = Math.floor((diff % 3600) / 60);
  if (h > 0) return `${h}h ${m.toString().padStart(2, "0")}m`;
  return `${m}m`;
}

/** Called when a conductor starts a shift — records time-in */
export function logShiftStart(data: {
  shiftId: string;
  unitNumber: string;
  plateNumber: string;
  conductorName: string;
  driverName: string;
  route: string;
  timeIn: string;
}): ShiftLog {
  const logs = getAllLogs();

  const entry: ShiftLog = {
    ...data,
    timeOut: null,
    duration: null,
  };

  logs.unshift(entry); // newest first
  saveLogs(logs);
  return entry;
}

/** Called when remittance completes — records time-out */
export function logShiftEnd(shiftId: string): ShiftLog | null {
  const logs = getAllLogs();
  const entry = logs.find((l) => l.shiftId === shiftId && l.timeOut === null);

  if (!entry) return null;

  entry.timeOut = new Date().toISOString();
  entry.duration = computeDuration(entry.timeIn, entry.timeOut);
  saveLogs(logs);

  return entry;
}

/** Get all logs for a specific unit */
export function getUnitLogs(unitNumber: string): ShiftLog[] {
  return getAllLogs().filter((l) => l.unitNumber === unitNumber);
}

/** Get all logs across all units */
export function getAllShiftLogs(): ShiftLog[] {
  return getAllLogs();
}

/** Get the most recent completed log for a unit */
export function getLastCompletedShift(unitNumber: string): ShiftLog | null {
  return getAllLogs().find((l) => l.unitNumber === unitNumber && l.timeOut !== null) || null;
}

/** Format an ISO string for display */
export function formatLogTime(iso: string): string {
  return new Date(iso).toLocaleString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export function formatLogDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}