/**
 * Canonical Shift & Remittance types for the Chatco application.
 *
 * Architecture notes (Laravel + Supabase):
 * - ShiftLog maps to the `shift_logs` Supabase table
 * - RemittanceRecord maps to the `remittances` Supabase table
 *
 * This file is the SINGLE SOURCE OF TRUTH for shift/remittance types.
 * Do NOT re-define ShiftLog or RemittanceRecord elsewhere.
 */

// ─── Shift Log ───────────────────────────────────────────────────────
export interface ShiftLog {
  shiftId: string;
  unitNumber: string;
  plateNumber: string;
  conductorName: string;
  driverName: string;
  route: string;
  timeIn: string; // ISO string
  timeOut: string | null; // null if shift still active
  duration: string | null; // formatted "2h 30m", null if still active
}

// ─── Remittance Record ───────────────────────────────────────────────
export interface RemittanceRecord {
  shiftId: string;
  date: string;
  conductorName: string;
  driverName: string;
  unitNumber: string;
  totalPassengers: number;
  cashlessBreakdown: {
    gcashScanned: number;
    gcashDirect: number;
    voucher: number;
  };
  totalCashless: number;
  // The admin's physically-counted cash for this shift — see remittanceStatus.
  // Meaningless (0) until status is "Settled"/"Shortage"/"Overage"; the
  // conductor no longer declares this themselves (see review-request-modal
  // history: cash declaration moved to Admin > Remittance Module).
  cashDeclared: number;
  // "Pending": shift still active/ongoing (no Remittance row yet).
  // "For Cash Declaration" / "Overdue": conductor submitted, ended shift,
  //   admin hasn't declared cash yet (same underlying PENDING status either
  //   way — "Overdue" is just past the grace window).
  // "Settled" / "Shortage" / "Overage": admin has declared cash.
  remittanceStatus: "Pending" | "For Cash Declaration" | "Overdue" | "Settled" | "Shortage" | "Overage";
  timeIn: string;
  timeOut: string;
  cashTotal: number; // system-tracked cash from Payment module
  gcashTotal: number; // system-tracked GCash from Payment module
  shortage?: number;
  overage?: number;
  dueAt?: string | null;
  remittedAt?: string | null;
  reminderCount?: number;
  deviceId?: string;
  deviceType?: "WEB" | "MOBILE";
}

// ─── Remittance Status ───────────────────────────────────────────────
export type RemittanceStatus = RemittanceRecord["remittanceStatus"];
