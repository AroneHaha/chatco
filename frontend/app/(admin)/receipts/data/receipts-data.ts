// app/(admin)/receipts/data/receipts-data.ts
//
// Admin Receipts page data layer.
// Calls the real Laravel backend via the Next.js proxy.
// No mock data — admin sees only real DB data.

import { useState, useEffect, useCallback } from "react";

export interface Receipt {
  id: string;
  commuterName: string;
  commuterId: string;
  plateNumber: string;
  route: string;
  fare: number;
  paymentMethod: "Cash" | "Gcash" | "Voucher";
  status: "Completed" | "Pending" | "Failed" | "Cancelled" | "Expired" | "Refunded";
  date: string;
  time: string;
}

export type ReceiptStatus = Receipt["status"];
export type PaymentMethod = Receipt["paymentMethod"];

// ─── API fetch helper ──────────────────────────────────────────────────

async function fetchTransactions(): Promise<Receipt[]> {
  const res = await fetch("/api/admin/transactions?per_page=500", {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) {
    throw new Error("Failed to fetch transactions from server.");
  }
  const json = await res.json();
  // The backend now returns a paginator: { data: { data: [...], current_page, total, ... } }
  // Extract the inner data array. Fall back to flat array for backwards compat.
  const apiRecords = json.data?.data ?? json.data ?? json;
  if (!Array.isArray(apiRecords)) return [];
  return apiRecords.map(mapLaravelTransaction);
}

/**
 * Map a Laravel Transaction model (snake_case) to the frontend's
 * Receipt type (camelCase).
 */
function mapLaravelTransaction(r: Record<string, unknown>): Receipt {
  const rawMethod = String(r.payment_method ?? "CASH");
  const rawStatus = String(r.status ?? "PAID");

  // Map backend payment_method to frontend paymentMethod.
  // Backend PaymentMethod enum: CASH, GCASH, VOUCHER (free reward rides).
  let paymentMethod: Receipt["paymentMethod"] = "Cash";
  if (rawMethod === "GCASH") paymentMethod = "Gcash";
  else if (rawMethod === "VOUCHER") paymentMethod = "Voucher";

  // Map backend status to frontend status — all 7 PaymentStatus values
  // are handled so nothing falls through to "Completed" incorrectly.
  let status: Receipt["status"];
  switch (rawStatus) {
    case "PAID":      status = "Completed"; break;
    case "PENDING":
    case "PROCESSING": status = "Pending"; break;
    case "FAILED":    status = "Failed"; break;
    case "CANCELLED": status = "Cancelled"; break;
    case "EXPIRED":   status = "Expired"; break;
    case "REFUNDED":  status = "Refunded"; break;
    default:          status = "Completed"; break;
  }

  // Format date and time from created_at.
  // Built from local date parts, not toISOString() — the latter converts to UTC,
  // which put early-morning Manila transactions on the previous day and made
  // them unreachable via the date filter.
  const createdAt = String(r.created_at ?? "");
  const dateObj = new Date(createdAt);
  const date = createdAt
    ? `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, "0")}-${String(dateObj.getDate()).padStart(2, "0")}`
    : "";
  const time = createdAt
    ? dateObj.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      })
    : "";

  // Get plate number from shift_log relationship or fallback
  const shiftLog = r.shift_log as Record<string, unknown> | null;
  const plateNumber = shiftLog?.plate_number
    ? String(shiftLog.plate_number)
    : String(r.unit_number ?? "—");

  // Get route from pickup/dropoff names
  const pickupName = String(r.pickup_name ?? "");
  const dropoffName = String(r.dropoff_name ?? "");
  const route = pickupName && dropoffName ? `${pickupName} → ${dropoffName}` : "—";

  return {
    id: String(r.transaction_id ?? ""),
    commuterName: String(r.passenger_name ?? "Cash Passenger"),
    commuterId: String(r.passenger_id ?? ""),
    plateNumber,
    route,
    fare: Number(r.final_amount) || 0,
    paymentMethod,
    status,
    date,
    time,
  };
}

// ─── Hook ──────────────────────────────────────────────────────────────

export function useReceiptsData() {
  const [records, setRecords] = useState<Receipt[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async (isBackground = false) => {
    if (isBackground) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setError(null);

    try {
      const data = await fetchTransactions();
      setRecords(data);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to load transactions";
      // Only set error if it's not a background poll (so we don't flash error screens)
      if (!isBackground) {
        setError(message);
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    // Initial load (shows skeleton)
    refresh(false);

    // Background auto-poll every 10 seconds (no flicker)
    const interval = setInterval(() => {
      refresh(true);
    }, 10000);

    return () => clearInterval(interval);
  }, [refresh]);

  return { records, isLoading, isRefreshing, error, refresh };
}
