"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  fetchShiftTransactions,
  getShiftTransactions,
  type Transaction,
} from "@/lib/conductor/services/transactions.service";

interface TransactionSummary {
  gcash: number;
  cash: number;
  voucher: number;
  total: number;
}

function summarizeTransactions(transactions: Transaction[]): TransactionSummary {
  const gcash = transactions
    .filter(
      (txn) =>
        txn.paymentMethod === "GCash_Scanned" || txn.paymentMethod === "GCash_Direct"
    )
    .reduce((sum, txn) => sum + txn.finalAmount, 0);
  const cash = transactions
    .filter((txn) => txn.paymentMethod === "Cash")
    .reduce((sum, txn) => sum + txn.finalAmount, 0);
  const voucher = transactions
    .filter((txn) => txn.paymentMethod === "Voucher")
    .reduce((sum, txn) => sum + txn.finalAmount, 0);

  return { gcash, cash, voucher, total: gcash + cash + voucher };
}

interface UseConductorTransactionsResult {
  transactions: Transaction[];
  summary: TransactionSummary;
  status: "loading" | "success" | "error" | "empty";
  error: string | null;
  refresh: () => Promise<void>;
}

export function useConductorTransactions(
  shiftId: string | null
): UseConductorTransactionsResult {
  // shiftId is null on the very first render (it comes from the shift hook,
  // which itself starts null to match the server's no-localStorage render),
  // so start empty/loading here too rather than reading the cache in the
  // initializer — that would only be safe once shiftId is already non-null,
  // which never happens on mount.
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [status, setStatus] = useState<UseConductorTransactionsResult["status"]>("loading");
  const [error, setError] = useState<string | null>(null);
  const refreshInFlight = useRef<Promise<void> | null>(null);

  // Reconcile transactions the moment shiftId changes. This is React's
  // documented "adjust state when a prop changes" pattern (a render-phase
  // reset, not an effect), and — unlike a useState initializer — it only
  // ever runs on a render after mount, once shiftId has already diverged
  // from its hydration-time value, so reading the cache here can't cause a
  // hydration mismatch. Seeding from the new shiftId's cache (rather than
  // always clearing to []) is what gives a returning conductor instant
  // numbers instead of a blank total while fetchShiftTransactions()
  // verifies against the server; a freshly started shift has no cache yet
  // so this still comes back empty, and the previous shift's rows never
  // reach the DOM.
  const [renderedShiftId, setRenderedShiftId] = useState(shiftId);
  if (shiftId !== renderedShiftId) {
    setRenderedShiftId(shiftId);
    const cached = shiftId ? getShiftTransactions(shiftId) : [];
    setTransactions(cached);
    setStatus(shiftId ? (cached.length > 0 ? "success" : "loading") : "empty");
    setError(null);
  }

  const refresh = useCallback(async () => {
    if (refreshInFlight.current) return refreshInFlight.current;

    if (!shiftId) {
      setTransactions([]);
      setStatus("empty");
      setError(null);
      return;
    }

    const request = (async () => {
      try {
        const data = await fetchShiftTransactions(shiftId);
        setTransactions(data);
        setStatus(data.length > 0 ? "success" : "empty");
        setError(null);
      } catch (err) {
        const fallback = getShiftTransactions(shiftId);
        setTransactions(fallback);
        setStatus(fallback.length > 0 ? "success" : "error");
        setError(
          err instanceof Error ? err.message : "Unable to load transactions."
        );
      } finally {
        refreshInFlight.current = null;
      }
    })();

    refreshInFlight.current = request;
    return request;
  }, [shiftId]);

  useEffect(() => {
    void refresh();
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") void refresh();
    }, 15000);
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

  return {
    transactions,
    summary: summarizeTransactions(transactions),
    status,
    error,
    refresh,
  };
}
