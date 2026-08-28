"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  fetchRemittanceHistory,
  getRemittanceHistory,
  type RemittanceRecord,
} from "@/lib/conductor/services/remittance.service";
import {
  fetchShiftTransactions,
  fetchShiftEarnings,
  getShiftTransactions,
  type Transaction,
  type ShiftEarnings,
} from "@/lib/conductor/services/transactions.service";
import {
  fetchActiveShift,
  getActiveShift,
  type ConductorShift,
} from "@/lib/conductor/services/shift.service";

/** Read every cached slice synchronously for the initial render. */
function readCache() {
  const shift = getActiveShift();
  return {
    shift,
    transactions: shift ? getShiftTransactions(shift.shiftId) : [],
    history: getRemittanceHistory(),
  };
}

interface UseRemittanceDataResult {
  shift: ConductorShift | null;
  transactions: Transaction[];
  earnings: ShiftEarnings | null;
  history: RemittanceRecord[];
  status: "loading" | "success" | "error" | "empty";
  error: string | null;
  refresh: () => Promise<void>;
}

/**
 * S4-T9: useRemittanceData now fetches the cash-vs-GCash earnings split
 * from the DB via GET /api/conductor/earnings?shift_id={id}.
 *
 * The `earnings` field contains the authoritative split:
 *   - cash_total:  physically-remitted cash (sum of CASH+PAID)
 *   - gcash_total: record-only GCash (sum of GCASH+PAID, NOT remitted)
 *   - total:       cash_total + gcash_total
 *
 * The end-of-day page uses `earnings` for the Collection Summary card
 * and the remittance submission (only cash_total is remitted).
 *
 * The `transactions` array is still fetched for the per-transaction
 * breakdown list (passenger count, payment method distribution, etc.).
 */
export function useRemittanceData(): UseRemittanceDataResult {
  // Start from null/[]/loading on every render pass, matching what the
  // server renders (it has no localStorage). The cache is applied in a
  // useLayoutEffect below instead of a useState initializer, since the
  // initializer also runs during client hydration and — unlike an effect —
  // isn't guaranteed to match the server-rendered output, which caused a
  // hydration mismatch for returning conductors.
  const [shift, setShift] = useState<ConductorShift | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [earnings, setEarnings] = useState<ShiftEarnings | null>(null);
  const [history, setHistory] = useState<RemittanceRecord[]>([]);
  const [status, setStatus] = useState<UseRemittanceDataResult["status"]>("loading");
  const [error, setError] = useState<string | null>(null);
  const refreshInFlight = useRef<Promise<void> | null>(null);

  // Seed from the last known cache so a returning conductor sees real
  // numbers on the first paint instead of a skeleton — refresh() still
  // verifies against the server right after mount and corrects this if it's
  // stale. useLayoutEffect only runs client-side, after hydration, and
  // before the browser paints, so this never conflicts with the
  // server-rendered HTML.
  useLayoutEffect(() => {
    const cache = readCache();
    if (cache.shift || cache.history.length > 0) {
      setShift(cache.shift);
      setTransactions(cache.transactions);
      setHistory(cache.history);
      setStatus("success");
    }
  }, []);

  const refresh = useCallback(async () => {
    if (refreshInFlight.current) return refreshInFlight.current;

    const request = (async () => {
      try {
        // fetchRemittanceHistory() never depended on the shift — run it
        // alongside the shift check instead of after it resolves.
        const [activeShift, historyData] = await Promise.all([
          fetchActiveShift(),
          fetchRemittanceHistory(),
        ]);
        setShift(activeShift);

        const [txnData, earningsData] = await Promise.all([
          activeShift
            ? fetchShiftTransactions(activeShift.shiftId)
            : Promise.resolve([] as Transaction[]),
          activeShift
            ? fetchShiftEarnings(activeShift.shiftId)
            : Promise.resolve({ cash_total: 0, gcash_total: 0, total: 0 } as ShiftEarnings),
        ]);

        setTransactions(txnData);
        setEarnings(earningsData);
        setHistory(historyData);
        setStatus("success");
        setError(null);
      } catch (err) {
        const activeShift = await fetchActiveShift().catch(() => null);
        setShift(activeShift);
        setTransactions(
          activeShift ? getShiftTransactions(activeShift.shiftId) : []
        );
        setEarnings(null);
        setHistory(getRemittanceHistory());
        setStatus("error");
        setError(
          err instanceof Error ? err.message : "Unable to load remittance data."
        );
      } finally {
        refreshInFlight.current = null;
      }
    })();

    refreshInFlight.current = request;
    return request;
  }, []);

  useEffect(() => {
    void refresh();
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") void refresh();
    }, 20000);
    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    const handler = () => void refresh();

    window.addEventListener("focus", handler);
    window.addEventListener("online", handler);
    window.addEventListener("conductor:transaction-updated", handler);
    document.addEventListener("visibilitychange", refreshWhenVisible);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", handler);
      window.removeEventListener("online", handler);
      window.removeEventListener("conductor:transaction-updated", handler);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [refresh]);

  return { shift, transactions, earnings, history, status, error, refresh };
}
