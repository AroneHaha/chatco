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

/** Server-side totals for the summary cards (`?summary=1`), aggregated over
 * every filtered row rather than only the returned page. */
export interface RemittanceSummaryTotals {
  passengers: number;
  cash: number;
  gcash: number;
  shortage: number;
  overage: number;
  /** Ended shifts awaiting the admin's cash count, not yet overdue. */
  forCashDeclaration: number;
  overdue: number;
  /** Sparkline buckets, oldest first, the last ending today (or on the exact
   * date being viewed) — fleet-wide, ignores the other filters. */
  trend: RemittanceTrendBucket[];
}

/** Sparkline bucket size: 7 days, 6 rolling weeks, or 6 calendar months. */
export type RemittanceTrendBy = 'day' | 'week' | 'month';

export interface RemittanceTrendBucket {
  /** Inclusive YYYY-MM-DD bounds; equal for a single day. */
  start: string;
  end: string;
  passengers: number;
  cash: number;
  gcash: number;
  shortage: number;
  overage: number;
  forCashDeclaration: number;
  overdue: number;
}

interface RemittancePage {
  records: RemittanceRecord[];
  total: number;
  lastPage: number;
  summary: RemittanceSummaryTotals | null;
}

export async function fetchRemittances(page: number, search: string, date: string, status: RemittanceStatus | 'All', dateFrom = '', conductor = '', driver = '', perPage = 20, summaryTrendBy?: RemittanceTrendBy): Promise<RemittancePage> {
  const params = new URLSearchParams({ page: String(page), per_page: String(perPage) });
  // Passing a trend granularity is what requests the summary aggregate.
  if (summaryTrendBy) {
    params.set('summary', '1');
    params.set('trend_by', summaryTrendBy);
  }
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
  const summary = paginator.summary;
  return {
    records: Array.isArray(apiRecords) ? apiRecords.map(mapLaravelRemittance) : [],
    total: Number(paginator.total ?? 0),
    lastPage: Number(paginator.last_page ?? 1),
    summary: summary ? {
      passengers: Number(summary.total_passengers ?? 0),
      cash: Number(summary.cash_total ?? 0),
      gcash: Number(summary.gcash_total ?? 0),
      shortage: Number(summary.shortage_total ?? 0),
      overage: Number(summary.overage_total ?? 0),
      forCashDeclaration: Number(summary.for_cash_declaration_count ?? 0),
      overdue: Number(summary.overdue_count ?? 0),
      trend: Array.isArray(summary.trend)
        ? summary.trend.map((day: Record<string, unknown>) => ({
            start: String(day.start ?? ''),
            end: String(day.end ?? ''),
            passengers: Number(day.passengers ?? 0),
            cash: Number(day.cash ?? 0),
            gcash: Number(day.gcash ?? 0),
            shortage: Number(day.shortage ?? 0),
            overage: Number(day.overage ?? 0),
            forCashDeclaration: Number(day.for_cash_declaration ?? 0),
            overdue: Number(day.overdue ?? 0),
          }))
        : [],
    } : null,
  };
}

/**
 * Map a Laravel Remittance model (snake_case) to the frontend's
 * RemittanceRecord type (camelCase).
 *
 * The backend AdminController::remittances() row shape is:
 *   shift_id, date, conductor_name, driver_name, unit_number,
 *   total_passengers, cash_total, gcash_total, total_collected,
 *   remitted_amount, shortage, remittance_status, is_overdue,
 *   is_active_shift, time_in, time_out
 *
 * remittance_status mapping — cash declaration is now an admin-only action
 * (see cash-declaration-modal.tsx), never the conductor's:
 *   SHORTAGE/OVERAGE/COMPLETE → admin already declared cash for this shift.
 *   PENDING + is_active_shift → the shift hasn't ended yet ("Pending").
 *   PENDING + ended, not overdue → awaiting the admin's cash count
 *     ("For Cash Declaration" — the row this endpoint's synthetic
 *     still-active rows can NEVER produce, since those are always
 *     is_active_shift: true).
 *   PENDING + ended, past the grace window → "Overdue".
 */
function mapLaravelRemittance(r: Record<string, unknown>): RemittanceRecord {
  const cashTotal = Number(r.cash_total ?? r.total_collected ?? 0);
  const gcashTotal = Number(r.gcash_total ?? 0);
  const rawStatus = String(r.remittance_status ?? "");
  const isActiveShift = Boolean(r.is_active_shift);
  const remittanceStatus: RemittanceRecord["remittanceStatus"] =
    rawStatus === "SHORTAGE" ? "Shortage" :
    rawStatus === "OVERAGE" ? "Overage" :
    rawStatus === "COMPLETE" || rawStatus === "Remitted" ? "Settled" :
    isActiveShift ? "Pending" :
    Boolean(r.is_overdue) ? "Overdue" : "For Cash Declaration";

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
    // `remitted_amount` is the admin's declared cash count (see
    // cash-declaration-modal.tsx) — meaningless (0) while status is still
    // "Pending"/"For Cash Declaration"/"Overdue".
    cashDeclared: Number(r.remitted_amount ?? r.cash_declared ?? 0),
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

export function useRemittanceData(page = 1, search = '', date = '', status: RemittanceStatus | 'All' = 'All', dateFrom = '', conductor = '', driver = '', perPage = 20, summaryTrendBy?: RemittanceTrendBy) {
  const [records, setRecords] = useState<RemittanceRecord[]>([]);
  const [summary, setSummary] = useState<RemittanceSummaryTotals | null>(null);
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
        const data = await fetchRemittances(page, search, date, status, dateFrom, conductor, driver, perPage, summaryTrendBy);
        setRecords(data.records);
        setSummary(data.summary);
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
  }, [date, dateFrom, page, search, status, conductor, driver, perPage, summaryTrendBy]);

  const refresh = useCallback(() => load(false), [load]);
  // Same refetch without the loading state, so figures already on screen
  // update in place (as the 30s poll does) instead of flashing a skeleton.
  const refreshSilently = useCallback(() => load(true), [load]);

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

  return { records, summary, total, lastPage, isLoading, error, refresh, refreshSilently };
}
