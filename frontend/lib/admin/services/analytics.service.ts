// lib/admin/services/analytics.service.ts
//
// Frontend service for the admin analytics dashboard.
// Fetches aggregated business metrics from GET /api/admin/analytics
// with optional date-range filtering.

import { useState, useEffect, useCallback } from "react";

// ─── Types ────────────────────────────────────────────────────────────

export interface AnalyticsDateRange {
  from: string;
  to: string;
  days: number;
}

export interface AnalyticsTotals {
  total_fares: number;
  cash_total: number;
  gcash_total: number;
  paid_count: number;
  pending_count: number;
  total_passengers: number;
}

export interface AnalyticsPaymentSplit {
  cash: { count: number; total: number };
  gcash: { count: number; total: number };
}

export interface AnalyticsDailyPoint {
  date: string;
  cash: number;
  gcash: number;
  total: number;
  count: number;
}

export interface AnalyticsRemittances {
  total_remitted: number;
  total_collected: number;
  total_shortage: number;
  count: number;
}

export interface AnalyticsFleet {
  active_vehicles: number;
  total_vehicles: number;
  active_conductors: number;
  total_conductors: number;
}

export interface AnalyticsData {
  date_range: AnalyticsDateRange;
  totals: AnalyticsTotals;
  payment_split: AnalyticsPaymentSplit;
  daily_series: AnalyticsDailyPoint[];
  remittances: AnalyticsRemittances;
  fleet: AnalyticsFleet;
}

export interface AnalyticsRange {
  date_from?: string;
  date_to?: string;
}

export interface AnalyticsState {
  data: AnalyticsData | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

// ─── Fetch helper ─────────────────────────────────────────────────────

/**
 * Fetch aggregated analytics from /api/admin/analytics.
 * Optionally pass date_from / date_to (YYYY-MM-DD) to filter the window.
 * If omitted, the backend defaults to the last 30 days.
 *
 * @throws Error on non-2xx or network failure.
 */
export async function getAnalytics(range?: AnalyticsRange, signal?: AbortSignal): Promise<AnalyticsData> {
  const params = new URLSearchParams();
  if (range?.date_from) params.append("date_from", range.date_from);
  if (range?.date_to) params.append("date_to", range.date_to);
  const qs = params.toString();
  const url = `/api/admin/analytics${qs ? `?${qs}` : ""}`;

  const res = await fetch(url, {
    headers: { Accept: "application/json" },
    signal,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.message ?? `Failed to fetch analytics (HTTP ${res.status})`);
  }

  const json = await res.json();
  return json.data as AnalyticsData;
}

// ─── Data hook ────────────────────────────────────────────────────────

/**
 * useAnalytics — fetches analytics data on mount and when `range` changes.
 *
 * @param range Optional { date_from, date_to } filter. When undefined, the
 *              backend returns the last 30 days.
 */
export function useAnalytics(range?: AnalyticsRange): AnalyticsState {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const rangeKey = `${range?.date_from ?? ""}|${range?.date_to ?? ""}`;

  const fetchAnalytics = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await getAnalytics(range);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load analytics");
    } finally {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rangeKey]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  return {
    data,
    isLoading,
    error,
    refetch: fetchAnalytics,
  };
}

// ─── Formatting helpers ───────────────────────────────────────────────

/**
 * Format a number as Philippine Peso currency.
 *   1234.5 -> "₱1,234.50"
 *   0      -> "₱0.00"
 */
export function formatPeso(amount: number): string {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Format a number with thousands separators (no currency symbol).
 *   1234567 -> "1,234,567"
 */
export function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-PH").format(value);
}

/**
 * Format a YYYY-MM-DD date string to a readable short form.
 *   "2026-06-25" -> "Jun 25"
 */
export function formatShortDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString("en-PH", {
      month: "short",
      day: "numeric",
    });
  } catch {
    return dateStr;
  }
}
