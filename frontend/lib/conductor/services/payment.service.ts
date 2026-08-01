/**
 * Client-side conductor payment service (GCash).
 *
 * Calls the Next.js proxy routes (cookie auth) that forward to Laravel —
 * never Laravel directly.
 *
 *   POST /api/conductor/payments/gcash/initiate -> initiateGcash()
 *   GET  /api/payments/{id}/status              -> fetchStatus()
 *   POST /api/payments/{id}/simulate            -> simulate()  (dev only)
 */

import { api } from "@/lib/api/client";
import { CONDUCTOR_API } from "@/lib/conductor/endpoints";
import type { Transaction } from "@/lib/conductor/persistence/transactions.store";
import type { GroupPassengerInput } from "@/lib/conductor/services/transactions.service";

export type PaymentStatus =
  | "pending" | "processing" | "paid" | "failed" | "cancelled" | "expired" | "refunded";

export interface GcashInitiation {
  transactionId: string;
  qrToken: string;
  /** Provider hosted authorize URL; null when no real gateway is configured. */
  checkoutUrl: string | null;
  amount: number;
  expiresAt: string;
  /** Route names — populated when resuming a pending payment (the location
   *  picker state is gone after navigation/refresh, so these come from the
   *  transaction row instead). */
  from?: string | null;
  to?: string | null;
  groupId?: string | null;
  receipts?: Transaction[];
}

interface LaravelReceipt {
  transaction_id: string;
  payment_method: string;
  final_amount: string | number;
  passenger_id: string | null;
  passenger_name: string | null;
  passenger_role: string | null;
  payer_name: string | null;
  payer_name_snapshot?: string | null;
  payer_id?: string | null;
  total_passengers?: number;
  gross_amount?: string | number | null;
  passenger_breakdown?: Array<{
    passenger_type: "REGULAR" | "STUDENT" | "SENIOR" | "SENIOR_CITIZEN" | "PWD";
    quantity: number;
    unit_fare: string | number;
    unit_discount_amount: string | number;
    subtotal: string | number;
  }>;
  pickup_name: string | null;
  dropoff_name: string | null;
  base_fare: string | number | null;
  discount_amount: string | number | null;
  group_id: string | null;
  group_position: number | null;
  reward_eligible: boolean | number;
  qr_token: string | null;
  created_at: string;
}

function mapReceipt(row: LaravelReceipt): Transaction {
  return {
    transactionId: row.transaction_id,
    paymentMethod: row.payment_method === "GCASH" ? "GCash_Scanned" : "Cash",
    finalAmount: Number(row.final_amount) || 0,
    passengerName: row.passenger_name ?? "",
    passengerId: row.passenger_id ?? "",
    passengerRole: row.passenger_role ?? undefined,
    payerName: row.payer_name_snapshot ?? row.payer_name ?? undefined,
    payerId: row.payer_id ?? undefined,
    from: row.pickup_name ?? "",
    to: row.dropoff_name ?? "",
    distance: 0,
    baseFare: Number(row.base_fare) || 0,
    succeedingKm: 0,
    discountAmount: Number(row.discount_amount) || 0,
    receiptQrToken: row.qr_token ?? undefined,
    groupId: row.group_id ?? undefined,
    groupPosition: row.group_position ?? undefined,
    rewardEligible: Boolean(row.reward_eligible),
    totalPassengers: Number(row.total_passengers) || 1,
    grossAmount: Number(row.gross_amount) || Number(row.final_amount) || 0,
    passengerBreakdown: row.passenger_breakdown?.map((line) => ({
      passengerType: line.passenger_type,
      quantity: Number(line.quantity),
      unitFare: Number(line.unit_fare),
      unitDiscountAmount: Number(line.unit_discount_amount),
      subtotal: Number(line.subtotal),
    })),
    timestamp: new Date(row.created_at).getTime(),
  };
}

interface InitiateResponse {
  data: {
    transaction_id: string;
    qr_token: string;
    checkout_url: string | null;
    amount: number | string;
    expires_at: string;
    group_id?: string | null;
    receipts?: LaravelReceipt[];
  };
}

interface StatusResponse {
  data: {
    status: string;
    paid_at: string | null;
    payer_name?: string | null;
    receipts?: LaravelReceipt[];
  };
}

/**
 * Start a GCash fare. Returns the binding-QR payload the conductor renders.
 * @throws {ApiError} 422 (no active shift) / 502 (provider failure)
 */
export async function initiateGcash(input: {
  finalAmount: number;
  from: string;
  to: string;
  baseFare?: number;
  distance?: number;
  discountAmount?: number;
  groupPassengers?: GroupPassengerInput[];
  pickupStopId?: string;
  dropoffStopId?: string;
}): Promise<GcashInitiation> {
  const response = await api.post<InitiateResponse>(
    CONDUCTOR_API.payments.gcashInitiate,
    {
      finalAmount: input.finalAmount,
      from: input.from,
      to: input.to,
      baseFare: input.baseFare,
      distance: input.distance,
      discountAmount: input.discountAmount,
      pickupStopId: input.pickupStopId,
      dropoffStopId: input.dropoffStopId,
      passengers: input.groupPassengers,
    }
  );

  const d = response.data;
  return {
    transactionId: d.transaction_id,
    qrToken: d.qr_token,
    checkoutUrl: d.checkout_url,
    amount: Number(d.amount) || 0,
    expiresAt: d.expires_at,
    groupId: d.group_id,
    receipts: d.receipts?.map(mapReceipt),
  };
}

interface PendingResponse {
  data: {
    transaction_id: string;
    qr_token: string;
    checkout_url: string | null;
    amount: number | string;
    expires_at: string;
    pickup_name: string | null;
    dropoff_name: string | null;
    group_id?: string | null;
    receipts?: LaravelReceipt[];
  } | null;
}

/**
 * The conductor's resumable PENDING GCash payment for their active shift,
 * or null. Called when the fare modal opens so an interrupted payment
 * (navigation, refresh) re-displays the SAME QR instead of a new one.
 * The backend lazily expires stale rows, so a resumable result is always
 * still claimable.
 */
export async function fetchPendingGcash(): Promise<GcashInitiation | null> {
  const response = await api.get<PendingResponse>(CONDUCTOR_API.payments.gcashPending);
  const d = response.data;
  if (!d) return null;
  return {
    transactionId: d.transaction_id,
    qrToken: d.qr_token,
    checkoutUrl: d.checkout_url,
    amount: Number(d.amount) || 0,
    expiresAt: d.expires_at,
    from: d.pickup_name,
    to: d.dropoff_name,
    groupId: d.group_id,
    receipts: d.receipts?.map(mapReceipt),
  };
}

/**
 * Poll the current payment status (webhook keeps it fresh).
 */
export async function fetchStatus(transactionId: string): Promise<{
  status: PaymentStatus;
  payerName: string | null;
  receipts: Transaction[];
}> {
  const response = await api.get<StatusResponse>(
    CONDUCTOR_API.payments.status(transactionId)
  );
  return {
    status: (response.data.status?.toLowerCase() as PaymentStatus) ?? "pending",
    payerName: response.data.payer_name ?? null,
    receipts: (response.data.receipts ?? []).map(mapReceipt),
  };
}

/**
 * DEV ONLY — drive a PENDING GCash payment to PAID/FAILED without a real
 * provider (disabled server-side in production).
 */
export async function simulate(
  transactionId: string,
  status: "PAID" | "FAILED"
): Promise<PaymentStatus> {
  const response = await api.post<StatusResponse>(
    CONDUCTOR_API.payments.simulate(transactionId),
    { status }
  );
  return (response.data.status?.toLowerCase() as PaymentStatus) ?? "pending";
}

/**
 * Cancel a PENDING GCash payment. Only the conductor of the shift that
 * owns the transaction can cancel it. The backend transitions PENDING →
 * CANCELLED through the state machine.
 *
 * Use case: the commuter didn't scan the QR in time, or the conductor
 * wants to abort instead of waiting for the 5-minute TTL.
 *
 * @throws {ApiError} 404 (not found) / 403 (not your transaction) / 422 (not PENDING)
 */
export async function cancelPayment(transactionId: string): Promise<PaymentStatus> {
  const response = await api.post<StatusResponse>(
    `/api/payments/${encodeURIComponent(transactionId)}/cancel`,
    {}
  );
  return (response.data.status?.toLowerCase() as PaymentStatus) ?? "cancelled";
}
