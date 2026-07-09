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
 *
 * The backend AdminController::remittances() row shape is:
 *   shift_id, date, conductor_name, driver_name, unit_number,
 *   total_passengers, cash_total, gcash_total, total_collected,
 *   remitted_amount, shortage, remittance_status, time_in, time_out
 *
 * NOTE: There is no `cash_declared` field on the backend — the conductor's
 * declared cash for the shift is `cash_total`. We map cashDeclared → cashTotal
 * so the table column reflects real data instead of always 0.
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
    // The backend doesn't track a separate "declared" amount — the conductor's
    // recorded cash total IS the declared amount. Map it through so the
    // RemittanceTable's "Cash Declared" column shows real data.
    cashDeclared: cashTotal,
    // The backend writes remittance_status as 'COMPLETE' (no shortage) or
    // 'SHORTAGE' (cash declared < expected). The admin UI shows both as
    // "Remitted" (the shift WAS ended + the remittance WAS submitted) —
    // the shortage is surfaced separately via the shortage field if present.
    // Pending shifts (active, no remittance yet) show as "Pending".
    remittanceStatus: (r.remittance_status === "COMPLETE" ||
                       r.remittance_status === "SHORTAGE" ||
                       r.remittance_status === "Remitted")
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
