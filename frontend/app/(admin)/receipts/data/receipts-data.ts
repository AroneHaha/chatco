// app/(admin)/receipts/data/receipts-data.ts
//
// Admin Receipts page data layer.
// Calls the real Laravel backend via the Next.js proxy.
// No mock data — admin sees only real DB data.

import { useState, useEffect, useCallback } from "react";

export interface Receipt {
  id: string;
  commuterName: string;
  commuterRole: string;
  commuterId: string;
  plateNumber: string;
  route: string;
  fare: number;
  grossFare: number;
  discountAmount: number;
  totalPassengers: number;
  paidBy: string | null;
  multiplePaymentReference: string | null;
  passengerBreakdown: string;
  // "Unknown" is the explicit fail-safe for a value the backend sent that we
  // don't recognise. It is never guessed at — see mapLaravelTransaction.
  paymentMethod: "Cash" | "Gcash" | "Voucher" | "Unknown";
  status: "Completed" | "Pending" | "Failed" | "Cancelled" | "Expired" | "Unknown";
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
  // Note the absent `?? "CASH"` / `?? "PAID"` defaults: a missing column used
  // to be coerced into the happy path, so a row with no status at all rendered
  // as a green "Completed" badge. Unrecognised now means "Unknown", loudly.
  const rawMethod = String(r.payment_method ?? "");
  const rawStatus = String(r.status ?? "");

  // Map backend payment_method to frontend paymentMethod.
  // Backend PaymentMethod enum: CASH, GCASH, VOUCHER (free reward rides).
  let paymentMethod: Receipt["paymentMethod"];
  switch (rawMethod) {
    case "CASH":    paymentMethod = "Cash"; break;
    case "GCASH":   paymentMethod = "Gcash"; break;
    case "VOUCHER": paymentMethod = "Voucher"; break;
    default:        paymentMethod = "Unknown"; break;
  }

  // Map backend status to frontend status. Anything unrecognised is
  // surfaced as Unknown rather than assumed paid.
  //
  // REFUNDED is intentionally absent: the product has no refund flow, so a
  // refunded row can only originate from a provider-side action outside this
  // system. Falling through to the neutral "Unknown" badge is the honest
  // outcome — it flags the row for a human instead of implying the app
  // manages refunds.
  let status: Receipt["status"];
  switch (rawStatus) {
    case "PAID":       status = "Completed"; break;
    case "PENDING":
    case "PROCESSING": status = "Pending"; break;
    case "FAILED":     status = "Failed"; break;
    case "CANCELLED":  status = "Cancelled"; break;
    case "EXPIRED":    status = "Expired"; break;
    default:           status = "Unknown"; break;
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
  const breakdown = Array.isArray(r.passenger_breakdown)
    ? (r.passenger_breakdown as Array<Record<string, unknown>>)
        .filter((line) => Number(line.quantity) > 0)
        .map((line) => `${String(line.passenger_type) === "SENIOR" ? "Senior Citizen" : String(line.passenger_type)} × ${Number(line.quantity)}`)
        .join(", ")
    : String(r.passenger_role ?? "Regular");
  const payerName = String(r.payer_name_snapshot ?? r.payer_name ?? "") || null;
  const groupPosition = Number(r.group_position) || 0;
  const isGroupCompanion = Boolean(r.group_id) && groupPosition > 1;
  const commuterName = rawMethod === "CASH" || isGroupCompanion
    ? "Passenger"
    : String(r.passenger_name ?? payerName ?? "GCash Payer");
  const rawRole = String(r.passenger_role ?? "REGULAR").toUpperCase();
  const commuterRole = rawRole === "SENIOR" || rawRole === "SENIOR_CITIZEN"
    ? "Senior Citizen"
    : rawRole === "PWD"
      ? "PWD"
      : rawRole.charAt(0) + rawRole.slice(1).toLowerCase();
  const paymentGroup = r.payment_group as Record<string, unknown> | null;

  return {
    id: String(r.transaction_id ?? ""),
    commuterName,
    commuterRole,
    commuterId: String(r.passenger_id ?? ""),
    plateNumber,
    route,
    fare: Number(r.final_amount) || 0,
    grossFare: Number(r.gross_amount) || Number(r.final_amount) || 0,
    discountAmount: Number(r.discount_amount) || 0,
    totalPassengers: Number(r.total_passengers) || 1,
    paidBy: isGroupCompanion ? payerName : null,
    multiplePaymentReference: paymentGroup?.reference_number
      ? String(paymentGroup.reference_number)
      : null,
    passengerBreakdown: breakdown,
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
