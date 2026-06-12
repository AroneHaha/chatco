import type { ConductorShift } from "@/lib/conductor/persistence/shift.store";
import type { Transaction } from "@/lib/conductor/persistence/transactions.store";
import type { RemittanceRecord } from "@/lib/conductor/persistence/remittance.store";
import type { ConductorRating } from "@/lib/conductor/services/ratings.service";
import type { ConductorHailRequest } from "@/lib/conductor/types";
import type { ShiftLog } from "@/lib/conductor-shift-history";
import {
  SEED_DRIVERS,
  SEED_HAILS,
  SEED_UNITS,
  buildSeedRatings,
} from "@/lib/conductor/server/seed";

interface ConductorUserState {
  activeShift: ConductorShift | null;
  transactions: Record<string, Transaction[]>;
  remittances: RemittanceRecord[];
  shiftLogs: ShiftLog[];
  ratingsByShift: Record<string, ConductorRating[]>;
}

type GlobalStore = Map<string, ConductorUserState>;

const globalKey = "__chatco_conductor_store__";

function getStoreMap(): GlobalStore {
  const g = globalThis as typeof globalThis & { [globalKey]?: GlobalStore };
  if (!g[globalKey]) {
    g[globalKey] = new Map();
  }
  return g[globalKey]!;
}

function getUserState(userId: string): ConductorUserState {
  const store = getStoreMap();
  if (!store.has(userId)) {
    store.set(userId, {
      activeShift: null,
      transactions: {},
      remittances: [],
      shiftLogs: [],
      ratingsByShift: {},
    });
  }
  return store.get(userId)!;
}

function computeDuration(timeIn: string, timeOut: string | null): string | null {
  const start = new Date(timeIn).getTime();
  const end = timeOut ? new Date(timeOut).getTime() : Date.now();
  const diff = Math.floor((end - start) / 1000);
  const h = Math.floor(diff / 3600);
  const m = Math.floor((diff % 3600) / 60);
  if (h > 0) return `${h}h ${m.toString().padStart(2, "0")}m`;
  return `${m}m`;
}

export function getProfile(userId: string, name?: string) {
  return {
    id: userId,
    name: name ?? "Conductor",
  };
}

export function listUnits() {
  return SEED_UNITS;
}

export function listDrivers() {
  return SEED_DRIVERS;
}

export function getActiveShift(userId: string): ConductorShift | null {
  const state = getUserState(userId);
  if (!state.activeShift?.isActive) return null;
  return state.activeShift;
}

export function startShift(
  userId: string,
  data: {
    conductorName: string;
    unitNumber: string;
    route: string;
    driverName: string;
  }
): ConductorShift {
  const state = getUserState(userId);

  if (state.activeShift?.isActive) {
    throw new Error("An active shift already exists.");
  }

  const unit = SEED_UNITS.find((u) => u.unitNumber === data.unitNumber);
  const shift: ConductorShift = {
    ...data,
    shiftId: `SHF-${Date.now().toString(36).toUpperCase()}`,
    timeIn: new Date().toISOString(),
    timeOut: null,
    isActive: true,
  };

  state.activeShift = shift;

  const logEntry: ShiftLog = {
    shiftId: shift.shiftId,
    unitNumber: shift.unitNumber,
    plateNumber: unit?.plateNumber ?? shift.unitNumber,
    conductorName: shift.conductorName,
    driverName: shift.driverName,
    route: shift.route,
    timeIn: shift.timeIn,
    timeOut: null,
    duration: null,
  };
  state.shiftLogs.unshift(logEntry);

  return shift;
}

export function endShift(userId: string): ConductorShift | null {
  const state = getUserState(userId);
  const shift = state.activeShift;
  if (!shift?.isActive) return null;

  shift.timeOut = new Date().toISOString();
  shift.isActive = false;
  state.activeShift = null;

  const log = state.shiftLogs.find(
    (entry) => entry.shiftId === shift.shiftId && entry.timeOut === null
  );
  if (log) {
    log.timeOut = shift.timeOut;
    log.duration = computeDuration(log.timeIn, log.timeOut);
  }

  return shift;
}

export function listTransactions(userId: string, shiftId: string): Transaction[] {
  const state = getUserState(userId);
  return state.transactions[shiftId] ?? [];
}

export function addTransaction(
  userId: string,
  shiftId: string,
  txn: Omit<Transaction, "transactionId" | "timestamp">
): Transaction {
  const state = getUserState(userId);
  const existing = state.transactions[shiftId] ?? [];
  const newTxn: Transaction = {
    ...txn,
    transactionId: `TXN-${Date.now()}`,
    timestamp: Date.now(),
  };
  state.transactions[shiftId] = [...existing, newTxn];
  return newTxn;
}

export function listRemittances(userId: string): RemittanceRecord[] {
  return getUserState(userId).remittances;
}

export function addRemittance(
  userId: string,
  record: RemittanceRecord
): RemittanceRecord[] {
  const state = getUserState(userId);
  if (state.remittances.some((r) => r.shiftId === record.shiftId)) {
    return state.remittances;
  }
  state.remittances.unshift(record);
  return state.remittances;
}

export function listRatings(userId: string, shiftId: string): ConductorRating[] {
  const state = getUserState(userId);
  if (!state.ratingsByShift[shiftId]) {
    state.ratingsByShift[shiftId] = buildSeedRatings(shiftId);
  }
  return state.ratingsByShift[shiftId];
}

export function listHails(): ConductorHailRequest[] {
  return SEED_HAILS;
}

export function listShiftLogs(userId: string): ShiftLog[] {
  return getUserState(userId).shiftLogs;
}
