// lib/commuter/persistence/payment-history.store.ts
// localStorage persistence for commuter payment history.
// Same pattern as lib/conductor/persistence/shift.store.ts.
// Only used in local/prototype mode; replaced by API when backend is connected.

import type { CommuterPaymentRecord } from "../commuter/types";

const STORAGE_KEY = "chatco_payment_history";

export function getPaymentHistory(): CommuterPaymentRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function savePayment(record: CommuterPaymentRecord): void {
  if (typeof window === "undefined") return;
  const history = getPaymentHistory();
  history.unshift(record);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
}

export function clearPaymentHistory(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}
