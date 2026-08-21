// app/(admin)/remittance/data/remittance-data.ts
//
// Admin Remittance page data layer.
// Calls the real Laravel backend via the Next.js proxy.
// No mock data, no localStorage fallback — admin sees only real DB data.

import { useState, useEffect, useCallback, useRef } from "react";
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

interface RemittancePage {
  records: RemittanceRecord[];
  total: number;
  lastPage: number;
}

export async function fetchRemittances(page: number, search: string, date: string, status: RemittanceStatus | 'All', dateFrom = '', conductor = '', driver = '', perPage = 20): Promise<RemittancePage> {
  const params = new URLSearchParams({ page: String(page), per_page: String(perPage) });
  if (search) params.set('search', search);
  // Exact date wins when set; otherwise fall back to the range preset's lower bound.
  if (date) params.set('date', date);
  else if (dateFrom) params.set('date_from', dateFrom);
  if (status !== 'All') params.set('status', status);
  if (conductor) params.set('conductor', conductor);
  if (driver) params.set('driver', driver);
  const res = await fetch(`/api/admin/remittances?${params}`, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) {
    throw new Error("Failed to fetch remittances from server.");
  }
  const json = await res.json();
  // The backend now returns a paginator: { data: { data: [...], ... } }
  const paginator = json.data ?? {};
  const apiRecords = paginator.data ?? [];
  return {
    records: Array.isArray(apiRecords) ? apiRecords.map(mapLaravelRemittance) : [],
    total: Number(paginator.total ?? 0),
    lastPage: Number(paginator.last_page ?? 1),
  };
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
  const rawStatus = String(r.remittance_status ?? "");
  const remittanceStatus: RemittanceRecord["remittanceStatus"] =
    rawStatus === "SHORTAGE" ? "Shortage" :
    rawStatus === "OVERAGE" ? "Overage" :
    rawStatus === "COMPLETE" || rawStatus === "Remitted" ? "Remitted" :
    Boolean(r.is_overdue) ? "Overdue" : "Pending";

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
    cashDeclared: Number(r.remitted_amount ?? r.cash_declared ?? 0),
    // The backend writes remittance_status as 'COMPLETE' (no shortage) or
    // 'SHORTAGE' (cash declared < expected). The admin UI shows both as
    // "Remitted" (the shift WAS ended + the remittance WAS submitted) —
    // the shortage is surfaced separately via the shortage field if present.
    // Pending shifts (active, no remittance yet) show as "Pending".
    remittanceStatus,
    timeIn: String(r.time_in ?? ""),
    timeOut: String(r.time_out ?? ""),
    cashTotal,
    gcashTotal,
    shortage: Number(r.shortage ?? 0),
    overage: Number(r.overage ?? 0),
    dueAt: r.remittance_due_at ? String(r.remittance_due_at) : null,
    remittedAt: r.remitted_at ? String(r.remitted_at) : null,
    reminderCount: Number(r.reminder_count ?? 0),
  };
}

// ─── Hook ──────────────────────────────────────────────────────────────

export function useRemittanceData(page = 1, search = '', date = '', status: RemittanceStatus | 'All' = 'All', dateFrom = '', conductor = '', driver = '') {
  const [records, setRecords] = useState<RemittanceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [lastPage, setLastPage] = useState(1);
  const refreshInFlight = useRef<Promise<void> | null>(null);

  const load = useCallback(async (silent = false) => {
    if (refreshInFlight.current) return refreshInFlight.current;

    if (!silent) setIsLoading(true);
    const request = (async () => {
      setError(null);
      try {
        const data = await fetchRemittances(page, search, date, status, dateFrom, conductor, driver);
        setRecords(data.records);
        setTotal(data.total);
        setLastPage(data.lastPage);
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : "Failed to load remittances";
        setError(message);
      } finally {
        if (!silent) setIsLoading(false);
        refreshInFlight.current = null;
      }
    })();

    refreshInFlight.current = request;
    return request;
  }, [date, dateFrom, page, search, status, conductor, driver]);

  const refresh = useCallback(() => load(false), [load]);

  useEffect(() => {
    void load(false);
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") void load(true);
    }, 30000);
    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") void load(true);
    };

    window.addEventListener("focus", refreshWhenVisible);
    window.addEventListener("online", refreshWhenVisible);
    document.addEventListener("visibilitychange", refreshWhenVisible);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", refreshWhenVisible);
      window.removeEventListener("online", refreshWhenVisible);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [load]);

  return { records, total, lastPage, isLoading, error, refresh };
}
