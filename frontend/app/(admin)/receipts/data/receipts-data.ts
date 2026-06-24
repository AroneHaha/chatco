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
  status: "Completed" | "Pending" | "Failed";
  date: string;
  time: string;
}

export type ReceiptStatus = Receipt["status"];
export type PaymentMethod = Receipt["paymentMethod"];

// ─── API fetch helper ──────────────────────────────────────────────────

async function fetchTransactions(): Promise<Receipt[]> {
  const res = await fetch("/api/admin/transactions", {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) {
    throw new Error("Failed to fetch transactions from server.");
  }
  const json = await res.json();
  const apiRecords = json.data ?? json;
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

  // Map backend payment_method to frontend paymentMethod
  let paymentMethod: Receipt["paymentMethod"] = "Cash";
  if (rawMethod === "GCASH") paymentMethod = "Gcash";
  else if (rawMethod === "VOUCHER") paymentMethod = "Voucher";

  // Map backend status to frontend status
  let status: Receipt["status"] = "Completed";
  if (rawStatus === "PENDING") status = "Pending";
  else if (rawStatus === "FAILED") status = "Failed";

  // Format date and time from created_at
  const createdAt = String(r.created_at ?? "");
  const dateObj = new Date(createdAt);
  const date = createdAt ? dateObj.toISOString().split("T")[0] : "";
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
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchTransactions();
      setRecords(data);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to load transactions";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();

    // Auto-poll every 10 seconds for real-time updates
    const interval = setInterval(() => {
      refresh();
    }, 10000);

    return () => clearInterval(interval);
  }, [refresh]);

  return { records, isLoading, error, refresh };
}
