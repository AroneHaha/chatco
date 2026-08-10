// app/(admin)/receipts/data/receipts-data.ts
//
// Admin Receipts page data layer.
// Calls the real Laravel backend via the Next.js proxy.
// No mock data — admin sees only real DB data.

import { useState, useEffect, useCallback, useRef } from "react";

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
  status: "Completed" | "Pending" | "Failed" | "Cancelled" | "Expired" | "Refunded" | "Unknown";
  reconciliationStatus: "REFUND_REQUIRED" | "REFUNDED" | null;
  reconciliationReason: string | null;
  reconciliationRequiredAt: string | null;
  date: string;
  time: string;
}

export type ReceiptStatus = Receipt["status"];
export type PaymentMethod = Receipt["paymentMethod"];

// ─── API fetch helper ──────────────────────────────────────────────────

/** Server-side date scope for the fetch — keeps the default view (Today)
 * from pulling the entire transactions table on every page load/poll. */
export interface ReceiptsDateFilter {
  /** Exact-date match, from the date picker. */
  date?: string;
  /** Inclusive lower bound, from the range presets (Today/7 Days/Month). */
  dateFrom?: string;
}

async function fetchTransactions(filter: ReceiptsDateFilter = {}): Promise<Receipt[]> {
  const params = new URLSearchParams({ per_page: "500" });
  if (filter.date) params.set("date", filter.date);
  if (filter.dateFrom) params.set("date_from", filter.dateFrom);

  const res = await fetch(`/api/admin/transactions?${params.toString()}`, {
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
  // REFUNDED remains distinct from Completed: the payment was real, then the
  // provider returned it, so it must not be presented as settled fare revenue.
  let status: Receipt["status"];
  switch (rawStatus) {
    case "PAID":       status = "Completed"; break;
    case "PENDING":
    case "PROCESSING": status = "Pending"; break;
    case "FAILED":     status = "Failed"; break;
    case "CANCELLED":  status = "Cancelled"; break;
    case "EXPIRED":    status = "Expired"; break;
    case "REFUNDED":   status = "Refunded"; break;
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
    reconciliationStatus:
      r.payment_reconciliation_status === "REFUND_REQUIRED" || r.payment_reconciliation_status === "REFUNDED"
        ? r.payment_reconciliation_status
        : null,
    reconciliationReason: r.payment_reconciliation_reason
      ? String(r.payment_reconciliation_reason)
      : null,
    reconciliationRequiredAt: r.payment_reconciliation_required_at
      ? String(r.payment_reconciliation_required_at)
      : null,
    date,
    time,
  };
}

// ─── Hook ──────────────────────────────────────────────────────────────

export function useReceiptsData(date?: string, dateFrom?: string) {
  const [records, setRecords] = useState<Receipt[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Only the very first fetch should block the whole page behind the
  // skeleton. A later refetch triggered by changing a filter re-fires this
  // same effect (date/dateFrom changed `refresh`'s identity) — that one
  // should update the table in place, the same as the background poll.
  const hasLoadedOnceRef = useRef(false);

  const refresh = useCallback(async (isBackground = false) => {
    if (isBackground) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setError(null);

    try {
      const data = await fetchTransactions({ date, dateFrom });
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
  }, [date, dateFrom]);

  useEffect(() => {
    refresh(hasLoadedOnceRef.current);
    hasLoadedOnceRef.current = true;

    // Background auto-poll every 10 seconds (no flicker)
    const interval = setInterval(() => {
      refresh(true);
    }, 10000);

    return () => clearInterval(interval);
  }, [refresh]);

  return { records, isLoading, isRefreshing, error, refresh };
}
