// app/(admin)/remittance/data/remittance-data.ts
//
// Admin Remittance page data layer.
// Uses canonical RemittanceRecord from @/types as the single source of truth.
//
// ARCHITECTURE:
//   1. Primary source: Backend API (when available)
//   2. Dev fallback: Reads conductor-submitted remittances from localStorage
//      (same key that remittance-history.ts writes to), so admin sees
//      ACTUAL conductor submissions — not disconnected mock data.
//   3. Seed: If localStorage is empty, injects a small seed dataset so
//      the admin UI isn't blank during first-run development.
//
// STATUS RULE:
//   remittanceStatus is set AUTOMATICALLY by the conductor's submission:
//     - "Remitted" → submission succeeded
//     - "Pending"  → submission failed (API down), conductor can retry
//   Admin does NOT manually change status. The status reflects the
//   conductor's submission outcome, not admin approval.
//
// All consumers MUST use the useRemittanceData() hook — there is NO
// legacy static export. Components that need data call the hook.

import { useState, useEffect, useCallback } from "react";
import type {
  RemittanceRecord,
  RemittanceStatus,
} from "@/types";

// ─── Re-export canonical types for local consumers ─────────────────────
export type { RemittanceStatus };
export type { RemittanceRecord };

// ─── Admin table row shape ─────────────────────────────────────────────
// The admin table only needs a subset of RemittanceRecord for the list
// view, but we keep the full record so the detail modal has everything
// without a second fetch.
export type RemittanceRow = RemittanceRecord;

// ─── Seed data (only used when localStorage is empty) ──────────────────
// These records mirror the canonical RemittanceRecord shape. They are NOT
// the admin's "real" data — they just prevent a blank screen on first run.
// Once a conductor submits a real remittance, it appears here live.

const SEED_REMITTANCE: RemittanceRecord[] = [
  {
    shiftId: "S-101",
    date: "2024-05-01",
    conductorName: "Jose Ngani",
    driverName: "Ramon Dela Cruz",
    unitNumber: "XQJ 4728",
    totalPassengers: 52,
    cashlessBreakdown: { gcashScanned: 1200, gcashDirect: 400, voucher: 100 },
    totalCashless: 1700,
    cashDeclared: 0,
    remittanceStatus: "Remitted",
    timeIn: "2024-05-01T05:30:00.000Z",
    timeOut: "2024-05-01T17:45:00.000Z",
    cashTotal: 800,
    gcashTotal: 1700,
  },
  {
    shiftId: "S-102",
    date: "2024-05-01",
    conductorName: "Mark Pakak",
    driverName: "Luis Villanueva",
    unitNumber: "VMY 9183",
    totalPassengers: 48,
    cashlessBreakdown: { gcashScanned: 1100, gcashDirect: 350, voucher: 0 },
    totalCashless: 1450,
    cashDeclared: 0,
    remittanceStatus: "Pending",
    timeIn: "2024-05-01T06:00:00.000Z",
    timeOut: "2024-05-01T18:00:00.000Z",
    cashTotal: 1000,
    gcashTotal: 1450,
  },
  {
    shiftId: "S-103",
    date: "2024-05-02",
    conductorName: "Ericks Son",
    driverName: "Pedro Santos",
    unitNumber: "LKW 3579",
    totalPassengers: 55,
    cashlessBreakdown: { gcashScanned: 1300, gcashDirect: 500, voucher: 200 },
    totalCashless: 2000,
    cashDeclared: 0,
    remittanceStatus: "Remitted",
    timeIn: "2024-05-02T05:15:00.000Z",
    timeOut: "2024-05-02T16:30:00.000Z",
    cashTotal: 600,
    gcashTotal: 2000,
  },
  {
    shiftId: "S-104",
    date: "2024-05-03",
    conductorName: "Rinel Trinel",
    driverName: "Francisco Garcia",
    unitNumber: "TNB 8462",
    totalPassengers: 50,
    cashlessBreakdown: { gcashScanned: 1150, gcashDirect: 600, voucher: 0 },
    totalCashless: 1750,
    cashDeclared: 0,
    remittanceStatus: "Remitted",
    timeIn: "2024-05-03T05:45:00.000Z",
    timeOut: "2024-05-03T17:20:00.000Z",
    cashTotal: 800,
    gcashTotal: 1750,
  },
  {
    shiftId: "S-105",
    date: "2024-05-04",
    conductorName: "Leon Barbel",
    driverName: "Elena Valdez",
    unitNumber: "PVR 6894",
    totalPassengers: 46,
    cashlessBreakdown: { gcashScanned: 1000, gcashDirect: 300, voucher: 100 },
    totalCashless: 1400,
    cashDeclared: 0,
    remittanceStatus: "Pending",
    timeIn: "2024-05-04T06:10:00.000Z",
    timeOut: "2024-05-04T18:00:00.000Z",
    cashTotal: 1000,
    gcashTotal: 1400,
  },
  {
    shiftId: "S-106",
    date: "2024-05-05",
    conductorName: "Jose Ngani",
    driverName: "Ramon Dela Cruz",
    unitNumber: "XQJ 4728",
    totalPassengers: 47,
    cashlessBreakdown: { gcashScanned: 950, gcashDirect: 400, voucher: 0 },
    totalCashless: 1350,
    cashDeclared: 0,
    remittanceStatus: "Remitted",
    timeIn: "2024-05-05T05:30:00.000Z",
    timeOut: "2024-05-05T16:50:00.000Z",
    cashTotal: 1000,
    gcashTotal: 1350,
  },
  {
    shiftId: "S-107",
    date: "2024-05-05",
    conductorName: "Mark Pakak",
    driverName: "Luis Villanueva",
    unitNumber: "VMY 9183",
    totalPassengers: 49,
    cashlessBreakdown: { gcashScanned: 1100, gcashDirect: 380, voucher: 0 },
    totalCashless: 1480,
    cashDeclared: 0,
    remittanceStatus: "Remitted",
    timeIn: "2024-05-05T06:00:00.000Z",
    timeOut: "2024-05-05T17:30:00.000Z",
    cashTotal: 1000,
    gcashTotal: 1480,
  },
  {
    shiftId: "S-108",
    date: "2024-05-06",
    conductorName: "Ericks Son",
    driverName: "Pedro Santos",
    unitNumber: "LKW 3579",
    totalPassengers: 53,
    cashlessBreakdown: { gcashScanned: 1350, gcashDirect: 550, voucher: 150 },
    totalCashless: 2050,
    cashDeclared: 0,
    remittanceStatus: "Pending",
    timeIn: "2024-05-06T05:00:00.000Z",
    timeOut: "2024-05-06T18:15:00.000Z",
    cashTotal: 650,
    gcashTotal: 2050,
  },
  {
    shiftId: "S-109",
    date: "2024-05-06",
    conductorName: "Rinel Trinel",
    driverName: "Francisco Garcia",
    unitNumber: "TNB 8462",
    totalPassengers: 51,
    cashlessBreakdown: { gcashScanned: 1200, gcashDirect: 520, voucher: 0 },
    totalCashless: 1720,
    cashDeclared: 0,
    remittanceStatus: "Remitted",
    timeIn: "2024-05-06T05:45:00.000Z",
    timeOut: "2024-05-06T17:00:00.000Z",
    cashTotal: 800,
    gcashTotal: 1720,
  },
  {
    shiftId: "S-110",
    date: "2024-05-07",
    conductorName: "Leon Barbel",
    driverName: "Elena Valdez",
    unitNumber: "PVR 6894",
    totalPassengers: 48,
    cashlessBreakdown: { gcashScanned: 1060, gcashDirect: 400, voucher: 0 },
    totalCashless: 1460,
    cashDeclared: 0,
    remittanceStatus: "Remitted",
    timeIn: "2024-05-07T06:00:00.000Z",
    timeOut: "2024-05-07T17:45:00.000Z",
    cashTotal: 1000,
    gcashTotal: 1460,
  },
  {
    shiftId: "S-111",
    date: "2024-05-08",
    conductorName: "Jose Ngani",
    driverName: "Ramon Dela Cruz",
    unitNumber: "XQJ 4728",
    totalPassengers: 45,
    cashlessBreakdown: { gcashScanned: 900, gcashDirect: 300, voucher: 0 },
    totalCashless: 1200,
    cashDeclared: 0,
    remittanceStatus: "Pending",
    timeIn: "2024-05-08T05:30:00.000Z",
    timeOut: "2024-05-08T16:30:00.000Z",
    cashTotal: 1100,
    gcashTotal: 1200,
  },
  {
    shiftId: "S-112",
    date: "2024-05-08",
    conductorName: "Mark Pakak",
    driverName: "Luis Villanueva",
    unitNumber: "VMY 9183",
    totalPassengers: 50,
    cashlessBreakdown: { gcashScanned: 1150, gcashDirect: 400, voucher: 0 },
    totalCashless: 1550,
    cashDeclared: 0,
    remittanceStatus: "Remitted",
    timeIn: "2024-05-08T06:00:00.000Z",
    timeOut: "2024-05-08T17:00:00.000Z",
    cashTotal: 1000,
    gcashTotal: 1550,
  },
  {
    shiftId: "S-113",
    date: "2024-05-09",
    conductorName: "Ericks Son",
    driverName: "Pedro Santos",
    unitNumber: "LKW 3579",
    totalPassengers: 54,
    cashlessBreakdown: { gcashScanned: 1300, gcashDirect: 550, voucher: 200 },
    totalCashless: 2050,
    cashDeclared: 0,
    remittanceStatus: "Remitted",
    timeIn: "2024-05-09T05:00:00.000Z",
    timeOut: "2024-05-09T18:00:00.000Z",
    cashTotal: 600,
    gcashTotal: 2050,
  },
  {
    shiftId: "S-114",
    date: "2024-05-09",
    conductorName: "Rinel Trinel",
    driverName: "Francisco Garcia",
    unitNumber: "TNB 8462",
    totalPassengers: 47,
    cashlessBreakdown: { gcashScanned: 1000, gcashDirect: 400, voucher: 0 },
    totalCashless: 1400,
    cashDeclared: 0,
    remittanceStatus: "Pending",
    timeIn: "2024-05-09T05:45:00.000Z",
    timeOut: "2024-05-09T16:45:00.000Z",
    cashTotal: 1000,
    gcashTotal: 1400,
  },
  {
    shiftId: "S-115",
    date: "2024-05-10",
    conductorName: "Leon Barbel",
    driverName: "Elena Valdez",
    unitNumber: "PVR 6894",
    totalPassengers: 51,
    cashlessBreakdown: { gcashScanned: 1180, gcashDirect: 400, voucher: 0 },
    totalCashless: 1580,
    cashDeclared: 0,
    remittanceStatus: "Remitted",
    timeIn: "2024-05-10T06:00:00.000Z",
    timeOut: "2024-05-10T17:30:00.000Z",
    cashTotal: 1000,
    gcashTotal: 1580,
  },
];

// ─── localStorage key — MUST match remittance-history.ts ───────────────
// This is the same key the conductor side writes to. Admin reads from it
// so both sides see the same data. When backend is ready, this becomes
// an API call and this constant is removed.
const CONDUCTOR_STORAGE_KEY = "conductor_remittance_history";

// ─── API fetch helper ──────────────────────────────────────────────────
// S4-T10: Now calls the real Laravel backend via the Next.js proxy.
// Falls back to localStorage (conductor submissions) on network error,
// then to seed data on first run.

async function fetchRemittances(): Promise<RemittanceRecord[]> {
  // ── Stage 1: Try real API ──────────────────────────────────────────
  try {
    const res = await fetch("/api/admin/remittances", {
      headers: { Accept: "application/json" },
    });
    if (res.ok) {
      const json = await res.json();
      // The proxy returns { data: [...] } — extract the array
      const apiRecords = json.data ?? json;
      if (Array.isArray(apiRecords) && apiRecords.length > 0) {
        // Map snake_case backend fields to camelCase frontend type
        return apiRecords.map(mapLaravelRemittance);
      }
      // API returned empty array — no remittances in DB yet
      return [];
    }
  } catch {
    // Network error — fall through to localStorage
  }

  // ── Stage 2: Dev fallback — read conductor submissions from localStorage
  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem(CONDUCTOR_STORAGE_KEY);
      if (raw) {
        const records = JSON.parse(raw) as RemittanceRecord[];
        // Backfill any missing fields for old records
        const normalized = records.map((r) => ({
          ...r,
          cashlessBreakdown:
            r.cashlessBreakdown ?? { gcashScanned: 0, gcashDirect: 0, voucher: 0 },
          totalCashless: r.totalCashless ?? 0,
          gcashTotal: r.gcashTotal ?? 0,
          cashTotal: r.cashTotal ?? 0,
          cashDeclared: r.cashDeclared ?? 0,
        }));
        if (normalized.length > 0) return normalized;
      }
    } catch {
      // Corrupt localStorage — fall through to seed data
    }
  }

  // ── Stage 3: Seed data (empty localStorage, first run) ─────────────
  return SEED_REMITTANCE;
}

/**
 * Map a Laravel Remittance model (snake_case) to the frontend's
 * RemittanceRecord type (camelCase).
 *
 * Backend fields (from Remittance model + migration):
 *   shift_id, conductor_name, driver_name, unit_number, date,
 *   time_in, time_out, total_collected, remitted_amount, shortage,
 *   remittance_status, total_passengers, cash_total, gcash_total
 *
 * Frontend fields (from types/shift.ts RemittanceRecord):
 *   shiftId, conductorName, driverName, unitNumber, date,
 *   timeIn, timeOut, cashTotal, gcashTotal, remittanceStatus,
 *   totalPassengers, cashlessBreakdown, totalCashless, cashDeclared
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
      gcashScanned: 0, // Legacy — not tracked separately in S4
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