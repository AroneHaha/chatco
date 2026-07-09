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

export type PaymentStatus =
  | "pending" | "processing" | "paid" | "failed" | "cancelled" | "expired" | "refunded";

export interface GcashInitiation {
  transactionId: string;
  qrToken: string;
  /** Provider hosted authorize URL; null when no real gateway is configured. */
  checkoutUrl: string | null;
  amount: number;
  expiresAt: string;
}

interface InitiateResponse {
  data: {
    transaction_id: string;
    qr_token: string;
    checkout_url: string | null;
    amount: number | string;
    expires_at: string;
  };
}

interface StatusResponse {
  data: { status: string; paid_at: string | null };
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
    }
  );

  const d = response.data;
  return {
    transactionId: d.transaction_id,
    qrToken: d.qr_token,
    checkoutUrl: d.checkout_url,
    amount: Number(d.amount) || 0,
    expiresAt: d.expires_at,
  };
}

/**
 * Poll the current payment status (webhook keeps it fresh).
 */
export async function fetchStatus(transactionId: string): Promise<PaymentStatus> {
  const response = await api.get<StatusResponse>(
    CONDUCTOR_API.payments.status(transactionId)
  );
  return (response.data.status?.toLowerCase() as PaymentStatus) ?? "pending";
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
