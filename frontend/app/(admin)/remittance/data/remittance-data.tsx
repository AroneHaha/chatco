// app/(admin)/remittance/data/remittance-data.ts
//
// Admin Remittance page data layer.
// Calls the real Laravel backend via the Next.js proxy.
// No mock data, no localStorage fallback — admin sees only real DB data.

import { useState, useEffect, useCallback } from "react";
import type {
  RemittanceRecord,
  RemittanceStatus,
} from "@/types";

// ─── Re-export canonical types for local consumers ─────────────────────
export type { RemittanceStatus };
export type { RemittanceRecord };

// ─── Admin table row shape ─────────────────────────────────────────────
export type RemittanceRow = RemittanceRecord;

// ─── API fetch helper ──────────────────────────────────────────────────
// Calls the real Laravel backend via the Next.js proxy.
// No mock data, no localStorage fallback — admin sees only real DB data.

async function fetchRemittances(): Promise<RemittanceRecord[]> {
  const res = await fetch("/api/admin/remittances", {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) {
    throw new Error("Failed to fetch remittances from server.");
  }
  const json = await res.json();
  const apiRecords = json.data ?? json;
  if (!Array.isArray(apiRecords)) return [];
  return apiRecords.map(mapLaravelRemittance);
}

/**
 * Map a Laravel Remittance model (snake_case) to the frontend's
 * RemittanceRecord type (camelCase).
 */
function mapLaravelRemittance(r: Record<string, unknown>): RemittanceRecord {
  const cashTotal = Number(r.cash_total ?? r.total_collected ?? 0);
  const gcashTotal = Number(r.gcash_total ?? 0);

  return {
    shiftId: String(r.shift_id ?? ""),
    date: String(r.date ?? ""),
    conductorName: String(r.conductor_name ?? "—"),
    driverName: String(r.driver_name ?? "—"),
    unitNumber: String(r.unit_number ?? "—"),
    totalPassengers: Number(r.total_passengers ?? 0),
    cashlessBreakdown: {
      gcashScanned: 0,
      gcashDirect: 0,
      voucher: 0,
    },
    totalCashless: gcashTotal,
    cashDeclared: Number(r.cash_declared ?? 0),
    remittanceStatus: (r.remittance_status === "COMPLETE" || r.remittance_status === "Remitted")
      ? "Remitted"
      : "Pending",
    timeIn: String(r.time_in ?? ""),
    timeOut: String(r.time_out ?? ""),
    cashTotal,
    gcashTotal,
  };
}

// ─── Hook ──────────────────────────────────────────────────────────────

export function useRemittanceData() {
  const [records, setRecords] = useState<RemittanceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchRemittances();
      setRecords(data);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to load remittances";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { records, isLoading, error, refresh };
}
