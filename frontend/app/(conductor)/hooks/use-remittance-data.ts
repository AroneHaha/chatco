"use client";

import { useCallback, useEffect, useState } from "react";
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
  type ConductorShift,
} from "@/lib/conductor/services/shift.service";

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
  const [shift, setShift] = useState<ConductorShift | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [earnings, setEarnings] = useState<ShiftEarnings | null>(null);
  const [history, setHistory] = useState<RemittanceRecord[]>([]);
  const [status, setStatus] = useState<UseRemittanceDataResult["status"]>("loading");
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setStatus("loading");
    setError(null);

    try {
      const activeShift = await fetchActiveShift();
      setShift(activeShift);

      const [txnData, earningsData, historyData] = await Promise.all([
        activeShift
          ? fetchShiftTransactions(activeShift.shiftId)
          : Promise.resolve([] as Transaction[]),
        activeShift
          ? fetchShiftEarnings(activeShift.shiftId)
          : Promise.resolve({ cash_total: 0, gcash_total: 0, total: 0 } as ShiftEarnings),
        fetchRemittanceHistory(),
      ]);

      setTransactions(txnData);
      setEarnings(earningsData);
      setHistory(historyData);
      setStatus("success");
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

  return { shift, transactions, earnings, history, status, error, refresh };
}
