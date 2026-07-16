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
  distance: number;
  baseFare: number;
  succeedingKm: number;
  discountAmount?: number;
  conductorName?: string;
  unitNumber?: string;
  driverName?: string;
  voucherCode?: string;
  timestamp: number;
}

const PREFIX = "conductor_txns_";

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
  };
  existing.push(newTxn);
  localStorage.setItem(key, JSON.stringify(existing));

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("conductor:transaction-updated"));
  }

  return newTxn;
}

export function getShiftTransactions(shiftId: string): Transaction[] {
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
