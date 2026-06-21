import { api, ApiError, NetworkError } from "@/lib/api/client";
import { CONDUCTOR_API } from "@/lib/conductor/endpoints";
import * as transactionsStore from "@/lib/conductor/persistence/transactions.store";

export type { Transaction } from "@/lib/conductor/persistence/transactions.store";
export type { PaymentMethodType } from "@/types";

/**
 * S4-T8: Conductor fare recording wired to the real backend.
 *
 * POST /api/conductor/transactions -> Laravel POST /api/v1/conductor/transactions
 * GET  /api/conductor/transactions?shift_id= -> Laravel GET /api/v1/conductor/transactions?shift_id=
 *
 * Falls back to the localStorage cache ONLY on network error (Laravel
 * unreachable). This keeps the conductor working offline (e.g., on a
 * bumpy ride with spotty signal) without sacrificing data integrity —
 * the next successful API call syncs the cache.
 *
 * The Transaction shape returned to the dashboard / end-of-day is
 * unchanged — the Next.js proxy maps Laravel's snake_case to the
 * frontend's camelCase shape (see mapTransaction in server/mappers.ts).
 */

/**
 * Fetch shift transactions from the backend.
 *
 * Calls GET /api/conductor/transactions?shift_id={shiftId} which proxies
 * to Laravel. On network error (Laravel unreachable), falls back to the
 * localStorage cache.
 *
 * @param shiftId  The shift ID to fetch transactions for
 * @returns Array of transactions in the frontend's Transaction shape
 */
export async function fetchShiftTransactions(
  shiftId: string
): Promise<transactionsStore.Transaction[]> {
  try {
    const response = await api.get<{ data: transactionsStore.Transaction[] }>(
      CONDUCTOR_API.transactions.list(shiftId)
    );

    const transactions = response.data ?? [];

    // Cache successful API responses for offline fallback
    for (const txn of transactions) {
      transactionsStore.cacheTransaction(shiftId, txn);
    }

    return transactions;
  } catch (error) {
    // Only fall back on network errors (Laravel unreachable / 502).
    // API errors (401, 403, 422, 500) should propagate — the conductor
    // needs to know if they're unauthorized or the request was invalid.
    if (error instanceof NetworkError) {
      return transactionsStore.getShiftTransactions(shiftId);
    }

    // Re-throw ApiError and other unexpected errors
    throw error;
  }
}

/**
 * Create a transaction (record a cash fare).
 *
 * Calls POST /api/conductor/transactions which proxies to Laravel.
 * Laravel's TransactionService::recordCashFare() handles:
 *   - Active shift resolution (422 if none)
 *   - Idempotency check (natural key within 60s window)
 *   - Denormalization of conductor_name/unit_number/driver_name
 *
 * On network error (Laravel unreachable), falls back to localStorage so
 * the conductor can continue recording fares offline. The offline fare
 * will NOT appear in the backend earnings breakdown until the next
 * successful API call — the conductor should sync before end-of-day.
 *
 * @param shiftId  The shift ID (ignored by the proxy — Laravel resolves
 *                 the shift from the authenticated conductor's active shift)
 * @param txn      The transaction data (without transactionId/timestamp)
 * @returns The created transaction
 */
export async function createTransaction(
  shiftId: string,
  txn: Omit<transactionsStore.Transaction, "transactionId" | "timestamp">
): Promise<transactionsStore.Transaction> {
  try {
    const response = await api.post<{ data: transactionsStore.Transaction }>(
      CONDUCTOR_API.transactions.create,
      {
        ...txn,
        shiftId, // The proxy strips this; Laravel resolves the shift
      }
    );

    // Cache the API-returned transaction for offline fallback
    if (response.data) {
      transactionsStore.cacheTransaction(shiftId, response.data);
    }

    return response.data;
  } catch (error) {
    // Only fall back on network errors (Laravel unreachable / 502).
    if (error instanceof NetworkError) {
      return transactionsStore.saveTransaction(shiftId, txn);
    }

    // Re-throw ApiError (401/403/422/500) and other unexpected errors
    throw error;
  }
}

/**
 * Synchronous localStorage read — used by the dashboard for instant
 * rendering before the API call resolves. Kept for backward compat
 * with components that call this directly.
 */
export function getShiftTransactions(
  shiftId: string
): transactionsStore.Transaction[] {
  return transactionsStore.getShiftTransactions(shiftId);
}

/**
 * Alias for createTransaction — kept for backward compat with
 * components that call saveTransaction directly.
 */
export function saveTransaction(
  shiftId: string,
  txn: Omit<transactionsStore.Transaction, "transactionId" | "timestamp">
): Promise<transactionsStore.Transaction> {
  return createTransaction(shiftId, txn);
}

/**
 * Clear the localStorage cache for a shift.
 *
 * Called after a successful remittance submission (the transactions
 * are now persisted in the remittance record, so the cache is stale).
 */
export function clearShiftTransactions(shiftId: string) {
  transactionsStore.clearShiftTransactions(shiftId);
}
