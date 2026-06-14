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

  const doFetch = useCallback(async () => {
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
    const controller = new AbortController();

    const run = async () => {
      if (controller.signal.aborted) return;
      if (!shiftId) {
        setTransactions([]);
        setStatus("empty");
        setError(null);
        return;
      }

      try {
        const data = await fetchShiftTransactions(shiftId);
        if (controller.signal.aborted) return;
        setTransactions(data);
        setStatus(data.length > 0 ? "success" : "empty");
        setError(null);
      } catch (err) {
        if (controller.signal.aborted) return;
        const fallback = getShiftTransactions(shiftId);
        setTransactions(fallback);
        setStatus(fallback.length > 0 ? "success" : "error");
        setError(
          err instanceof Error ? err.message : "Unable to load transactions."
        );
      }
    };

    run();
    return () => {
      controller.abort();
    };
  }, [shiftId]);

  useEffect(() => {
    const handler = () => {
      void doFetch();
    };
    window.addEventListener("conductor:transaction-updated", handler);
    return () => window.removeEventListener("conductor:transaction-updated", handler);
  }, [doFetch]);

  return {
    transactions,
    summary: summarizeTransactions(transactions),
    status,
    error,
    refresh: doFetch,
  };
}
