/**
 * Client-side commuter payment service.
 *
 * Calls the Next.js proxy routes (which forward to Laravel with the httpOnly
 * session cookie) — never Laravel directly. Maps the backend transaction
 * shape (snake_case, UPPERCASE enums, decimal strings) into a camelCase
 * view-model the UI consumes.
 *
 *   GET  /api/commuter/payments              -> fetchPaymentHistory()  (paginated)
 *   POST /api/commuter/payments/claim        -> claimGcash()
 *   GET  /api/payments/{id}/status           -> fetchPaymentStatus()
 *   POST /api/payments/{id}/simulate         -> simulatePayment()  (dev only)
 */

import { api } from "@/lib/api/client";
import { COMMUTER_API } from "@/lib/commuter/endpoints";

// ─── View-model ──────────────────────────────────────────────────────

export type PaymentStatus =
  | "pending" | "processing" | "paid" | "failed" | "cancelled" | "expired" | "refunded";

export interface CommuterPayment {
  id: string;
  amount: number;
  status: PaymentStatus;
  method: "Cash" | "GCash";
  pickupName: string;
  dropoffName: string;
  conductorName?: string;
  unitNumber?: string;
  /**
   * The shift_log row that served this ride (S6-T7). Links the payment to
   * the daily driver+conductor assignment. Present on PAID rides; may be
   * null for legacy/edge rows. The feedback modal uses this as the anchor
   * for POST /commuter/feedback (the backend derives the crew from it).
   */
  shiftId?: string;
  createdAt: string;
  paidAt: string | null;
}

export interface PaymentHistoryPage {
  items: CommuterPayment[];
  page: number;
  lastPage: number;
  total: number;
}

export interface ClaimResult {
  transactionId: string;
  checkoutUrl: string | null;
  amount: number;
  pickupName: string | null;
  dropoffName: string | null;
}

// ─── Raw backend shapes ──────────────────────────────────────────────

interface RawTransaction {
  transaction_id: string;
  final_amount: number | string;
  status: string;
  payment_method: string;
  pickup_name: string | null;
  dropoff_name: string | null;
  conductor_name: string | null;
  unit_number: string | null;
  /** shift_logs.shift_id — present on rows bound to a conductor's shift (S6-T7). */
  shift_id: string | null;
  created_at: string;
  paid_at: string | null;
}

interface Paginated<T> {
  data: T[];
  current_page: number;
  last_page: number;
  total: number;
}

interface Envelope<T> {
  success: boolean;
  data: T;
  message: string;
}

// ─── Mappers ─────────────────────────────────────────────────────────

function mapPayment(raw: RawTransaction): CommuterPayment {
  return {
    id: raw.transaction_id,
    amount: Number(raw.final_amount) || 0,
    status: (raw.status?.toLowerCase() as PaymentStatus) ?? "pending",
    method: raw.payment_method === "GCASH" ? "GCash" : "Cash",
    pickupName: raw.pickup_name ?? "—",
    dropoffName: raw.dropoff_name ?? "—",
    conductorName: raw.conductor_name ?? undefined,
    unitNumber: raw.unit_number ?? undefined,
    shiftId: raw.shift_id ?? undefined,
    createdAt: raw.created_at,
    paidAt: raw.paid_at,
  };
}

// ─── Service ─────────────────────────────────────────────────────────

/**
 * Fetch one page of the commuter's payment history (newest first).
 * Server-side scoped to the authenticated commuter (passenger_id).
 */
export async function fetchPaymentHistory(
  page = 1,
  perPage = 20
): Promise<PaymentHistoryPage> {
  const url = `${COMMUTER_API.payments.history}?page=${page}&per_page=${perPage}`;
  const response = await api.get<Envelope<Paginated<RawTransaction>>>(url);
  const p = response.data;

  return {
    items: (p?.data ?? []).map(mapPayment),
    page: p?.current_page ?? page,
    lastPage: p?.last_page ?? page,
    total: p?.total ?? 0,
  };
}

/**
 * Claim a GCash transaction by scanning the conductor's binding QR.
 * @throws {ApiError} 404 (bad token) / 410 (expired or paid) / 409 (claimed by another)
 */
export async function claimGcash(qrToken: string): Promise<ClaimResult> {
  const response = await api.post<Envelope<{
    transaction_id: string;
    checkout_url: string | null;
    amount: number;
    pickup_name: string | null;
    dropoff_name: string | null;
  }>>(COMMUTER_API.payments.claim, { qr_token: qrToken });

  const d = response.data;
  return {
    transactionId: d.transaction_id,
    checkoutUrl: d.checkout_url,
    amount: Number(d.amount) || 0,
    pickupName: d.pickup_name,
    dropoffName: d.dropoff_name,
  };
}

/**
 * Poll the current status of a transaction (webhook keeps it fresh).
 */
export async function fetchPaymentStatus(
  transactionId: string
): Promise<{ status: PaymentStatus; paidAt: string | null }> {
  const response = await api.get<Envelope<{ status: string; paid_at: string | null }>>(
    COMMUTER_API.payments.status(transactionId)
  );

  return {
    status: (response.data.status?.toLowerCase() as PaymentStatus) ?? "pending",
    paidAt: response.data.paid_at ?? null,
  };
}

/**
 * DEV ONLY — drive a PENDING GCash payment to PAID/FAILED without a real
 * provider (disabled server-side in production).
 */
export async function simulatePayment(
  transactionId: string,
  status: "PAID" | "FAILED"
): Promise<PaymentStatus> {
  const response = await api.post<Envelope<{ status: string }>>(
    COMMUTER_API.payments.simulate(transactionId),
    { status }
  );

  return (response.data.status?.toLowerCase() as PaymentStatus) ?? "pending";
}
