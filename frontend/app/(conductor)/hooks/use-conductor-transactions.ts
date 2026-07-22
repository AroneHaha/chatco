"use client";

import { useCallback, useEffect, useState } from "react";
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
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [status, setStatus] = useState<UseConductorTransactionsResult["status"]>("loading");
  const [error, setError] = useState<string | null>(null);

  // Drop the previous shift's rows the moment the shift changes. Without this
  // the summary keeps rendering the ended shift's cash/GCash totals until the
  // new shift's fetch resolves, so a freshly started shift briefly shows the
  // previous one's money. This is React's documented "adjust state when a prop
  // changes" pattern (a render-phase reset, not an effect) so the stale rows
  // never reach the DOM at all.
  const [renderedShiftId, setRenderedShiftId] = useState(shiftId);
  if (shiftId !== renderedShiftId) {
    setRenderedShiftId(shiftId);
    setTransactions([]);
    setStatus(shiftId ? "loading" : "empty");
    setError(null);
  }

  const refresh = useCallback(async () => {
    if (!shiftId) {
      setTransactions([]);
      setStatus("empty");
      setError(null);
      return;
    }

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
    }
  }, [shiftId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const handler = () => {
      void refresh();
    };
    window.addEventListener("conductor:transaction-updated", handler);
    return () => window.removeEventListener("conductor:transaction-updated", handler);
  }, [refresh]);

  return {
    transactions,
    summary: summarizeTransactions(transactions),
    status,
    error,
    refresh,
  };
}
