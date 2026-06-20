import * as transactionsStore from "@/lib/conductor/persistence/transactions.store";

export type { Transaction } from "@/lib/conductor/persistence/transactions.store";
export type { PaymentMethodType } from "@/types";

/**
 * Conductor fares (cash/GCash/voucher) are tracked CLIENT-SIDE in localStorage,
 * not persisted per-fare to the backend — only the remittance total is sent to
 * the DB at end of shift (see remittance.service + the remittances proxy).
 *
 * Why not the API: the conductor transactions Next route is a mock in-memory
 * store that has no knowledge of the real (Laravel) active shift, so writes 409
 * and reads come back empty — the two would land in different places and the
 * dashboard total would never reflect recorded fares. Using one localStorage
 * store for both read and write keeps the dashboard, end-of-day summary, and
 * remittance in sync.
 */
export async function fetchShiftTransactions(shiftId: string) {
  return transactionsStore.getShiftTransactions(shiftId);
}

export async function createTransaction(
  shiftId: string,
  txn: Omit<transactionsStore.Transaction, "transactionId" | "timestamp">
) {
  return transactionsStore.saveTransaction(shiftId, txn);
}

export function getShiftTransactions(shiftId: string) {
  return transactionsStore.getShiftTransactions(shiftId);
}

export function saveTransaction(
  shiftId: string,
  txn: Omit<transactionsStore.Transaction, "transactionId" | "timestamp">
) {
  return createTransaction(shiftId, txn);
}

export function clearShiftTransactions(shiftId: string) {
  transactionsStore.clearShiftTransactions(shiftId);
}
