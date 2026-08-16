import { api, NetworkError } from "@/lib/api/client";
import { CONDUCTOR_API } from "@/lib/conductor/endpoints";
import * as transactionsStore from "@/lib/conductor/persistence/transactions.store";

export type { Transaction } from "@/lib/conductor/persistence/transactions.store";
export type { PaymentMethodType } from "@/types";

export interface PaginatedTransactions {
  transactions: transactionsStore.Transaction[];
  currentPage: number;
  perPage: number;
  total: number;
  totalPages: number;
  totalAmount: number;
}

interface TransactionPageOptions {
  page: number;
  perPage: number;
  paymentMethod?: "CASH" | "GCASH" | "VOUCHER";
  dateFrom?: string;
  dateTo?: string;
}

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

    const pending = transactionsStore
      .getPendingCashTransactions()
      .filter((item) => item.shiftId === shiftId)
      .flatMap((item) => item.localTransactions);
    return transactions.concat(pending);
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

export async function fetchShiftTransactionsPage(
  shiftId: string,
  options: TransactionPageOptions
): Promise<PaginatedTransactions> {
  try {
    const response = await api.get<{ data: PaginatedTransactions }>(
      CONDUCTOR_API.transactions.page(shiftId, {
        page: options.page,
        perPage: options.perPage,
        paymentMethod: options.paymentMethod,
        dateFrom: options.dateFrom,
        dateTo: options.dateTo,
      })
    );

    const page = response.data ?? {
      transactions: [],
      currentPage: options.page,
      perPage: options.perPage,
      total: 0,
      totalPages: 1,
      totalAmount: 0,
    };

    for (const txn of page.transactions) {
      transactionsStore.cacheTransaction(shiftId, txn);
    }

    return page;
  } catch (error) {
    if (error instanceof NetworkError) {
      const cached = transactionsStore.getShiftTransactions(shiftId);
      const start = (options.page - 1) * options.perPage;
      const rows = cached.slice(start, start + options.perPage);
      return {
        transactions: rows,
        currentPage: options.page,
        perPage: options.perPage,
        total: cached.length,
        totalPages: Math.max(1, Math.ceil(cached.length / options.perPage)),
        totalAmount: cached.reduce((sum, txn) => sum + txn.finalAmount, 0),
      };
    }

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
 * @param shiftId  The originating shift ID, preserved for offline retries
 * @param txn      The transaction data (without transactionId/timestamp)
 * @returns The created transaction
 */
export async function createTransaction(
  shiftId: string,
  txn: Omit<transactionsStore.Transaction, "transactionId" | "timestamp">
): Promise<transactionsStore.Transaction> {
  const idempotencyKey =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const payload = { ...txn, shiftId, idempotencyKey };

  try {
    // Fresh idempotency key per record-fare action. Lets the backend
    // collapse a true retry (network re-send) without ever dropping a
    // distinct fare — two passengers paying the same fare for the same
    // segment get different keys and are both recorded.
    const response = await api.post<{ data: transactionsStore.Transaction }>(
      CONDUCTOR_API.transactions.create,
      payload
    );

    // Cache the API-returned transaction for offline fallback
    if (response.data) {
      transactionsStore.cacheTransaction(shiftId, { ...response.data, syncStatus: "SYNCED" });
    }

    // Dispatch event so the dashboard + end-of-day hooks refresh
    // (cacheTransaction no longer dispatches to avoid loops, but
    // createTransaction MUST dispatch so the UI updates after recording)
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("conductor:transaction-updated"));
    }

    return response.data;
  } catch (error) {
    // Only fall back on network errors (Laravel unreachable / 502).
    if (error instanceof NetworkError) {
      const saved = transactionsStore.saveTransaction(shiftId, txn);
      transactionsStore.enqueuePendingCashTransaction({
        id: `pending-${idempotencyKey}`,
        shiftId,
        kind: "single",
        idempotencyKey,
        payload,
        localTransactions: [saved],
        createdAt: Date.now(),
      });
      // saveTransaction already dispatches the event
      return saved;
    }

    // Re-throw ApiError (401/403/422/500) and other unexpected errors
    throw error;
  }
}

export interface GroupPassengerInput {
  passenger_type: "REGULAR" | "SENIOR" | "SENIOR_CITIZEN" | "STUDENT" | "PWD";
  quantity: number;
}

export async function createGroupCashTransaction(
  shiftId: string,
  input: {
    from: string;
    to: string;
    regularFare: number;
    discountedFare: number;
    passengers: GroupPassengerInput[];
  }
): Promise<{
  groupId: string;
  multiplePaymentReference: string;
  transactions: transactionsStore.Transaction[];
}> {
  const idempotencyKey = crypto.randomUUID();
  const payload = {
    shiftId,
    paymentMethod: "Cash",
    from: input.from,
    to: input.to,
    idempotencyKey,
    groupPassengers: input.passengers.map((passenger) => {
      const discounted = passenger.passenger_type !== "REGULAR";
      const finalAmount = discounted ? input.discountedFare : input.regularFare;
      return {
        type: passenger.passenger_type,
        quantity: passenger.quantity,
        final_amount: finalAmount,
        base_fare: input.regularFare,
        discount_amount: input.regularFare - finalAmount,
      };
    }),
  };

  try {
    const response = await api.post<{
      data: {
        group_id: string;
        multiple_payment_reference: string;
        transactions: transactionsStore.Transaction[];
      };
    }>(CONDUCTOR_API.transactions.create, payload);

    for (const transaction of response.data.transactions) {
      transactionsStore.cacheTransaction(shiftId, { ...transaction, syncStatus: "SYNCED" });
    }
    window.dispatchEvent(new CustomEvent("conductor:transaction-updated"));
    return {
      groupId: response.data.group_id,
      multiplePaymentReference: response.data.multiple_payment_reference,
      transactions: response.data.transactions.map((transaction) => ({
        ...transaction,
        multiplePaymentReference: response.data.multiple_payment_reference,
      })),
    };
  } catch (error) {
    if (!(error instanceof NetworkError)) throw error;
    const reference = `OFFLINE-${idempotencyKey.slice(0, 8).toUpperCase()}`;
    const totalPassengers = input.passengers.reduce((sum, row) => sum + row.quantity, 0);
    const localTransactions = input.passengers.flatMap((passenger) =>
      Array.from({ length: passenger.quantity }, (_, index) => {
        const discounted = passenger.passenger_type !== "REGULAR";
        const amount = discounted ? input.discountedFare : input.regularFare;
        return transactionsStore.saveTransaction(shiftId, {
          paymentMethod: "Cash",
          finalAmount: amount,
          passengerName: "Passenger",
          passengerId: "",
          passengerRole: passenger.passenger_type,
          from: input.from,
          to: input.to,
          distance: 0,
          baseFare: input.regularFare,
          succeedingKm: 0,
          discountAmount: discounted ? input.regularFare - input.discountedFare : 0,
          groupId: `offline-${idempotencyKey}`,
          multiplePaymentReference: reference,
          groupPosition: index + 1,
          totalPassengers,
        });
      })
    );
    transactionsStore.enqueuePendingCashTransaction({
      id: `pending-${idempotencyKey}`,
      shiftId,
      kind: "group",
      idempotencyKey,
      payload,
      localTransactions,
      createdAt: Date.now(),
    });
    return { groupId: `offline-${idempotencyKey}`, multiplePaymentReference: reference, transactions: localTransactions };
  }
}

/** Flush queued cash fares after connectivity returns. */
export async function syncPendingTransactions(): Promise<number> {
  const pending = transactionsStore.getPendingCashTransactions();
  let synced = 0;

  for (const item of pending) {
    try {
      const response = await api.post<{ data: { transactions?: transactionsStore.Transaction[] } | transactionsStore.Transaction }>(
        CONDUCTOR_API.transactions.create,
        item.payload,
      );
      const data = response.data;
      const serverTransactions = Array.isArray((data as { transactions?: unknown[] }).transactions)
        ? (data as { transactions: transactionsStore.Transaction[] }).transactions
        : [data as transactionsStore.Transaction];
      transactionsStore.removeCachedTransactions(item.shiftId, item.localTransactions.map((txn) => txn.transactionId));
      serverTransactions.forEach((txn) => transactionsStore.cacheTransaction(item.shiftId, { ...txn, syncStatus: "SYNCED" }));
      transactionsStore.removePendingCashTransaction(item.id);
      synced += serverTransactions.length;
    } catch (error) {
      if (error instanceof NetworkError) break;
      // Keep invalid/closed-shift items queued for an explicit retry/recovery.
    }
  }

  if (synced && typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("conductor:transaction-updated"));
  }
  return synced;
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

// ─── S4-T9: Earnings (cash vs GCash split from the DB) ────────────

/**
 * Earnings breakdown returned by Laravel's
 * TransactionService::getShiftEarnings().
 *
 * - cash_total:  sum of CASH+PAID (the physically-remitted figure)
 * - gcash_total: sum of GCASH+PAID (record-only, NOT remitted)
 * - total:       cash_total + gcash_total
 *
 * PENDING GCash is EXCLUDED (it may still FAIL).
 */
export interface ShiftEarnings {
  cash_total: number;
  gcash_total: number;
  total: number;
}

/**
 * Fetch the cash vs GCash earnings breakdown for a shift from the DB.
 *
 * Calls GET /api/conductor/earnings?shift_id={shiftId} which proxies
 * to Laravel's TransactionService::getShiftEarnings(). The backend
 * computes the split from the transactions table (only PAID rows count).
 *
 * On network error, falls back to computing the split from the
 * localStorage cache (best-effort — may not match the DB if the
 * cache is stale).
 *
 * @param shiftId  The shift ID to fetch earnings for
 * @returns { cash_total, gcash_total, total }
 */
export async function fetchShiftEarnings(
  shiftId: string
): Promise<ShiftEarnings> {
  try {
    const response = await api.get<{ data: ShiftEarnings }>(
      CONDUCTOR_API.earnings.get(shiftId)
    );

    return (
      response.data ?? {
        cash_total: 0,
        gcash_total: 0,
        total: 0,
      }
    );
  } catch (error) {
    // Only fall back on network errors (Laravel unreachable / 502).
    if (error instanceof NetworkError) {
      // Compute from localStorage cache (best-effort)
      const cached = transactionsStore.getShiftTransactions(shiftId);
      const cashTotal = cached
        .filter((t) => t.paymentMethod === "Cash")
        .reduce((sum, t) => sum + t.finalAmount, 0);
      const gcashTotal = cached
        .filter(
          (t) =>
            t.paymentMethod === "GCash_Scanned" ||
            t.paymentMethod === "GCash_Direct"
        )
        .reduce((sum, t) => sum + t.finalAmount, 0);

      return {
        cash_total: cashTotal,
        gcash_total: gcashTotal,
        total: cashTotal + gcashTotal,
      };
    }

    // Re-throw ApiError (401/403/422/500) and other unexpected errors
    throw error;
  }
}
