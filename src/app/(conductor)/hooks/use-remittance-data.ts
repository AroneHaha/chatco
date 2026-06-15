"use client";

import { useCallback, useEffect, useState } from "react";
import {
  fetchRemittanceHistory,
  getRemittanceHistory,
  type RemittanceRecord,
} from "@/lib/conductor/services/remittance.service";
import {
  fetchShiftTransactions,
  getShiftTransactions,
  type Transaction,
} from "@/lib/conductor/services/transactions.service";
import {
  fetchActiveShift,
  type ConductorShift,
} from "@/lib/conductor/services/shift.service";

interface UseRemittanceDataResult {
  shift: ConductorShift | null;
  transactions: Transaction[];
  history: RemittanceRecord[];
  status: "loading" | "success" | "error" | "empty";
  error: string | null;
  refresh: () => Promise<void>;
}

export function useRemittanceData(): UseRemittanceDataResult {
  const [shift, setShift] = useState<ConductorShift | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [history, setHistory] = useState<RemittanceRecord[]>([]);
  const [status, setStatus] = useState<UseRemittanceDataResult["status"]>("loading");
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setStatus("loading");
    setError(null);

    try {
      const activeShift = await fetchActiveShift();
      setShift(activeShift);

      const [txnData, historyData] = await Promise.all([
        activeShift
          ? fetchShiftTransactions(activeShift.shiftId)
          : Promise.resolve([]),
        fetchRemittanceHistory(),
      ]);

      setTransactions(txnData);
      setHistory(historyData);
      setStatus("success");
    } catch (err) {
      const activeShift = await fetchActiveShift().catch(() => null);
      setShift(activeShift);
      setTransactions(
        activeShift ? getShiftTransactions(activeShift.shiftId) : []
      );
      setHistory(getRemittanceHistory());
      setStatus("error");
      setError(
        err instanceof Error ? err.message : "Unable to load remittance data."
      );
    }
  }, []);

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

  return { shift, transactions, history, status, error, refresh };
}
