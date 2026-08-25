import type { PaymentMethodType } from "@/types";

export interface Transaction {
  transactionId: string;
  paymentMethod: PaymentMethodType;
  finalAmount: number;
  passengerName: string;
  passengerId: string;
  passengerRole?: string;
  from: string;
  to: string;
  pickupStopId?: string;
  dropoffStopId?: string;
  distance: number;
  baseFare: number;
  succeedingKm: number;
  discountAmount?: number;
  conductorName?: string;
  unitNumber?: string;
  driverName?: string;
  voucherCode?: string;
  /** Opaque token encoded in the cash receipt QR for commuter reward claims. */
  receiptQrToken?: string;
  groupId?: string;
  multiplePaymentReference?: string;
  groupPosition?: number;
  rewardEligible?: boolean;
  payerName?: string;
  payerId?: string;
  totalPassengers?: number;
  grossAmount?: number;
  passengerBreakdown?: PassengerBreakdown[];
  timestamp: number;
  syncStatus?: "SYNCED" | "PENDING_SYNC";
}

export interface PendingCashTransaction {
  id: string;
  shiftId: string;
  kind: "single" | "group";
  idempotencyKey: string;
  payload: Record<string, unknown>;
  localTransactions: Transaction[];
  createdAt: number;
  deviceId?: string;
  offlineCreatedAt?: string;
  attempts?: number;
  lastAttemptAt?: number;
  lastError?: string;
}

export interface PassengerBreakdown {
  passengerType: "REGULAR" | "STUDENT" | "SENIOR" | "SENIOR_CITIZEN" | "PWD";
  quantity: number;
  unitFare: number;
  unitDiscountAmount: number;
  subtotal: number;
}

const PREFIX = "conductor_txns_";
const PENDING_KEY = "conductor_pending_cash_v1";

function getKey(shiftId: string) {
  return `${PREFIX}${shiftId}`;
}

export function saveTransaction(
  shiftId: string,
  txn: Omit<Transaction, "transactionId" | "timestamp">
): Transaction {
  const key = getKey(shiftId);
  const existing: Transaction[] = JSON.parse(localStorage.getItem(key) || "[]");
  const newTxn: Transaction = {
    ...txn,
    transactionId: `TXN-${Date.now()}`,
    timestamp: Date.now(),
    syncStatus: "PENDING_SYNC",
  };
  existing.push(newTxn);
  localStorage.setItem(key, JSON.stringify(existing));

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("conductor:transaction-updated"));
  }

  return newTxn;
}

export function getPendingCashTransactions(): PendingCashTransaction[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(PENDING_KEY) || "[]") as PendingCashTransaction[];
  } catch {
    return [];
  }
}

export function enqueuePendingCashTransaction(item: PendingCashTransaction): void {
  const existing = getPendingCashTransactions().filter((queued) => queued.id !== item.id);
  localStorage.setItem(PENDING_KEY, JSON.stringify([...existing, item]));
}

export function removePendingCashTransaction(id: string): void {
  const remaining = getPendingCashTransactions().filter((item) => item.id !== id);
  if (remaining.length) localStorage.setItem(PENDING_KEY, JSON.stringify(remaining));
  else localStorage.removeItem(PENDING_KEY);
}

export function updatePendingCashTransaction(
  id: string,
  update: Partial<PendingCashTransaction>
): void {
  const next = getPendingCashTransactions().map((item) =>
    item.id === id ? { ...item, ...update } : item
  );
  localStorage.setItem(PENDING_KEY, JSON.stringify(next));
}

export function getShiftTransactions(shiftId: string): Transaction[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(getKey(shiftId));
  if (!raw) return [];
  try {
    return JSON.parse(raw) as Transaction[];
  } catch {
    return [];
  }
}

export function clearShiftTransactions(shiftId: string) {
  localStorage.removeItem(getKey(shiftId));
}

/** Cache a transaction returned from the API for offline fallback reads.
 *  Does NOT dispatch the conductor:transaction-updated event (which would
 *  trigger a refresh loop). Only saveTransaction() dispatches the event. */
export function cacheTransaction(shiftId: string, txn: Transaction): void {
  if (typeof window === "undefined") return;
  const key = getKey(shiftId);
  const existing: Transaction[] = JSON.parse(localStorage.getItem(key) || "[]");
  if (existing.some((item) => item.transactionId === txn.transactionId)) return;
  existing.push(txn);
  localStorage.setItem(key, JSON.stringify(existing));
}

export function removeCachedTransactions(shiftId: string, transactionIds: string[]): void {
  const ids = new Set(transactionIds);
  const remaining = getShiftTransactions(shiftId).filter((item) => !ids.has(item.transactionId));
  if (remaining.length) localStorage.setItem(getKey(shiftId), JSON.stringify(remaining));
  else localStorage.removeItem(getKey(shiftId));
}
