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
 *   POST /api/commuter/receipts/claim        -> claimCashReceipt()
 *   GET  /api/payments/{id}/status           -> fetchPaymentStatus()
 *   POST /api/payments/{id}/simulate         -> simulatePayment()  (dev only)
 */

import { api } from "@/lib/api/client";
import { COMMUTER_API } from "@/lib/commuter/endpoints";
import {
  mapFeedback,
  type Feedback,
  type RawFeedback,
} from "@/lib/commuter/services/feedback.service";

// ─── View-model ──────────────────────────────────────────────────────

export type PaymentStatus =
  | "pending" | "processing" | "paid" | "failed" | "cancelled" | "expired" | "refunded";

/**
 * The voucher spent on a ride. Free-ride (and earned reward) vouchers cover a
 * whole fare; a discount voucher takes a fixed amount off, capped at the fare.
 */
export interface PaymentVoucher {
  kind: "free_ride" | "discount";
  /** Discount vouchers only: the fixed value taken off. */
  amountOff: number | null;
}

/** One passenger's receipt within a group payment (see CommuterPayment.group). */
export interface GroupPassenger {
  id: string;
  role: string | null;
  amount: number;
  voucher: PaymentVoucher | null;
  status: PaymentStatus;
  /** Real name only for the payer's own line (backend sets a generic "Passenger" placeholder for the rest — sibling rows are never bound to a commuter account). */
  name: string | null;
  /** True for the line that is this commuter's own transaction (matches CommuterPayment.id). */
  isYou: boolean;
}

/**
 * Present only when this payment was part of a conductor-recorded group fare
 * (multiple passengers, settled by one GCash/cash payer). `passengers`
 * covers every rider on that payment, including this commuter's own line.
 */
export interface GroupPaymentInfo {
  referenceNumber: string | null;
  totalAmount: number;
  passengerCount: number;
  passengers: GroupPassenger[];
}

export interface CommuterPayment {
  id: string;
  amount: number;
  status: PaymentStatus;
  /** "Voucher" only when a voucher covered the whole fare. */
  method: "Cash" | "GCash" | "Voucher";
  voucher: PaymentVoucher | null;
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
  /** Set when this payment covered other passengers too. */
  group?: GroupPaymentInfo;
  feedback: Feedback | null;
  feedbackExists: boolean;
  canLeaveFeedback: boolean;
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
  regularAmount: number;
  discountAmount: number;
  passengerRole: string | null;
  pickupName: string | null;
  dropoffName: string | null;
  /** True when this commuter has an available voucher that could cover their
   * own portion of this ride (their own seat only — never the whole group). */
  voucherAvailable: boolean;
  availableVoucher?: { id: string; type: "FREE_RIDE" | "DISCOUNT" | "REWARD"; amount: number | null } | null;
  /** True when this ride is part of a multi-passenger group payment. */
  isGroup: boolean;
  /** Group payments only: every voucher the payer can spend, one per seat. */
  availableVouchers: VoucherOption[];
  /** Group payments only: each seat and its current fare (payer included). */
  seats: GroupSeat[];
}

export interface VoucherOption {
  id: string;
  type: "FREE_RIDE" | "DISCOUNT" | "REWARD";
  amount: number | null;
  expiresAt: string | null;
}

export interface GroupSeat {
  position: number;
  passengerType: string | null;
  fare: number;
  isPayer: boolean;
}

/** Result of binding a scanned paper cash receipt to the commuter. */
export interface ReceiptClaimResult {
  transactionId: string;
  amount: number;
  pickupName: string | null;
  dropoffName: string | null;
  conductorName: string | null;
  unitNumber: string | null;
  paidAt: string | null;
  /** True when this commuter had already claimed it — no extra ride counted. */
  alreadyClaimed: boolean;
}

// ─── Raw backend shapes ──────────────────────────────────────────────

/** One sibling receipt row from PaymentGroup::transactions() (group_id, ordered by group_position). */
interface RawGroupTransaction {
  transaction_id: string;
  group_position: number;
  passenger_role: string | null;
  final_amount: number | string;
  status: string;
  passenger_name: string | null;
  voucher?: RawVoucher | null;
}

/** The ride's `voucher` relation — type and value only, never the code. */
interface RawVoucher {
  type: string;
  amount: number | string | null;
}

/** PaymentController::history()'s eager-loaded `paymentGroup` relation — null for non-group payments. */
interface RawPaymentGroup {
  id: string;
  reference_number: string | null;
  total_amount: number | string;
  passenger_count: number;
  transactions: RawGroupTransaction[];
}

interface RawTransaction {
  transaction_id: string;
  final_amount: number | string;
  status: string;
  payment_method: string;
  voucher?: RawVoucher | null;
  pickup_name: string | null;
  dropoff_name: string | null;
  conductor_name: string | null;
  unit_number: string | null;
  /** shift_logs.shift_id — present on rows bound to a conductor's shift (S6-T7). */
  shift_id: string | null;
  created_at: string;
  paid_at: string | null;
  payment_group: RawPaymentGroup | null;
  feedback: RawFeedback | null;
  feedback_exists: boolean;
  can_leave_feedback: boolean;
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

function mapGroup(raw: RawPaymentGroup, ownTransactionId: string): GroupPaymentInfo {
  return {
    referenceNumber: raw.reference_number,
    totalAmount: Number(raw.total_amount) || 0,
    passengerCount: raw.passenger_count,
    passengers: raw.transactions.map((line) => ({
      id: line.transaction_id,
      role: line.passenger_role,
      amount: Number(line.final_amount) || 0,
      voucher: mapVoucher(line.voucher),
      status: (line.status?.toLowerCase() as PaymentStatus) ?? "pending",
      name: line.passenger_name,
      isYou: line.transaction_id === ownTransactionId,
    })),
  };
}

function mapVoucher(raw: RawVoucher | null | undefined): PaymentVoucher | null {
  if (!raw) return null;
  return raw.type === "DISCOUNT"
    ? { kind: "discount", amountOff: Number(raw.amount) || null }
    : { kind: "free_ride", amountOff: null };
}

function mapPayment(raw: RawTransaction): CommuterPayment {
  return {
    id: raw.transaction_id,
    amount: Number(raw.final_amount) || 0,
    status: (raw.status?.toLowerCase() as PaymentStatus) ?? "pending",
    method: raw.payment_method === "GCASH" ? "GCash" : raw.payment_method === "VOUCHER" ? "Voucher" : "Cash",
    voucher: mapVoucher(raw.voucher),
    pickupName: raw.pickup_name ?? "—",
    dropoffName: raw.dropoff_name ?? "—",
    conductorName: raw.conductor_name ?? undefined,
    unitNumber: raw.unit_number ?? undefined,
    shiftId: raw.shift_id ?? undefined,
    createdAt: raw.created_at,
    paidAt: raw.paid_at,
    group: raw.payment_group ? mapGroup(raw.payment_group, raw.transaction_id) : undefined,
    feedback: raw.feedback ? mapFeedback(raw.feedback) : null,
    feedbackExists: Boolean(raw.feedback_exists),
    canLeaveFeedback: Boolean(raw.can_leave_feedback),
  };
}

// ─── Service ─────────────────────────────────────────────────────────

export type PaymentHistoryFilter = "all" | "today" | "week" | "month";

/**
 * Fetch one page of the commuter's payment history (newest first).
 * Server-side scoped to the authenticated commuter (passenger_id).
 *
 * `filter` narrows to a rolling time window server-side (matches the
 * Today/This Week/This Month tabs) so a narrow filter doesn't require
 * paging through the commuter's full history to find matching rows.
 * Omitting it (default "all") is the original, unfiltered query.
 */
export async function fetchPaymentHistory(
  page = 1,
  perPage = 20,
  filter: PaymentHistoryFilter = "all"
): Promise<PaymentHistoryPage> {
  const filterParam = filter !== "all" ? `&filter=${filter}` : "";
  const url = `${COMMUTER_API.payments.history}?page=${page}&per_page=${perPage}${filterParam}`;
  const response = await api.get<Envelope<Paginated<RawTransaction>>>(url);
  const p = response.data;

  return {
    items: (p?.data ?? []).map(mapPayment),
    page: p?.current_page ?? page,
    lastPage: p?.last_page ?? page,
    total: p?.total ?? 0,
  };
}

interface RawClaimResult {
  transaction_id: string;
  checkout_url: string | null;
  amount: number;
  regular_amount: number;
  discount_amount: number;
  passenger_role: string | null;
  pickup_name: string | null;
  dropoff_name: string | null;
  voucher_available: boolean;
  available_voucher?: { id: string; type: VoucherOption["type"]; amount: string | number | null } | null;
  is_group: boolean;
  available_vouchers?: { id: string; type: VoucherOption["type"]; amount: string | number | null; expires_at: string | null }[];
  seats?: { position: number; passenger_type: string | null; fare: string | number; is_payer: boolean }[];
}

function mapClaimResult(d: RawClaimResult): ClaimResult {
  return {
    transactionId: d.transaction_id,
    checkoutUrl: d.checkout_url,
    amount: Number(d.amount) || 0,
    regularAmount: Number(d.regular_amount) || Number(d.amount) || 0,
    discountAmount: Number(d.discount_amount) || 0,
    passengerRole: d.passenger_role,
    pickupName: d.pickup_name,
    dropoffName: d.dropoff_name,
    voucherAvailable: Boolean(d.voucher_available),
    availableVoucher: d.available_voucher ? {
      ...d.available_voucher,
      amount: d.available_voucher.amount == null ? null : Number(d.available_voucher.amount),
    } : null,
    isGroup: Boolean(d.is_group),
    availableVouchers: (d.available_vouchers ?? []).map((v) => ({
      id: v.id,
      type: v.type,
      amount: v.amount == null ? null : Number(v.amount),
      expiresAt: v.expires_at ?? null,
    })),
    seats: (d.seats ?? []).map((seat) => ({
      position: Number(seat.position),
      passengerType: seat.passenger_type,
      fare: Number(seat.fare) || 0,
      isPayer: Boolean(seat.is_payer),
    })),
  };
}

/**
 * Claim a GCash transaction by scanning the conductor's binding QR.
 * @throws {ApiError} 404 (bad token) / 410 (expired or paid) / 409 (claimed by another)
 */
export async function claimGcash(qrToken: string): Promise<ClaimResult> {
  const response = await api.post<Envelope<RawClaimResult>>(COMMUTER_API.payments.claim, { qr_token: qrToken });
  return mapClaimResult(response.data);
}

/**
 * Cover this commuter's own portion of an already-claimed, still-PENDING
 * GCash transaction with one of their available vouchers.
 *
 * Free-ride vouchers cover the caller's fare. Discount vouchers deduct their
 * fixed peso value. Any remaining caller/companion fare is paid through the
 * returned GCash checkout; a zero total settles immediately.
 *
 * @throws {ApiError} 403 (not this commuter's transaction) / 404 (not found)
 *                    / 409 (no longer redeemable) / 422 (not GCash, or no
 *                    eligible voucher) / 502 (gateway error re-issuing the
 *                    reduced companions-only intent)
 */
export async function redeemVoucherForGcash(transactionId: string, voucherId?: string): Promise<ClaimResult> {
  const response = await api.post<Envelope<RawClaimResult>>(
    COMMUTER_API.payments.redeemVoucher(transactionId),
    voucherId ? { voucher_id: voucherId } : {},
  );
  return mapClaimResult(response.data);
}

/**
 * Spend several vouchers on a group GCash payment, one per seat: free rides
 * cover the dearest seats, discounts come off the rest of the group total
 * (see lib/commuter/group-voucher-plan.ts for the preview of the same rule).
 * The response carries the remaining total and its new checkout; a zero
 * total settles the whole group immediately.
 *
 * @throws {ApiError} 409 (no longer redeemable, or vouchers already applied)
 *                    / 422 (voucher unavailable, or more than the ride needs)
 *                    / 502 (gateway error re-issuing the remaining charge)
 */
export async function redeemVouchersForGroupGcash(transactionId: string, voucherIds: string[]): Promise<ClaimResult> {
  const response = await api.post<Envelope<RawClaimResult>>(
    COMMUTER_API.payments.redeemVoucher(transactionId),
    { voucher_ids: voucherIds },
  );
  return mapClaimResult(response.data);
}

/**
 * Claim a paper cash receipt by scanning the QR printed on it.
 *
 * Binds the cash ride to this commuter, which is what makes it count toward
 * the free-ride reward cycle (rewards are derived from PAID non-voucher rides
 * bound to the account — there is no separate points balance).
 *
 * @throws {ApiError} 404 (unrecognised token) / 410 (receipt past its TTL)
 *                    / 409 (claimed by someone else) / 422 (not a cash ride)
 */
export async function claimCashReceipt(qrToken: string): Promise<ReceiptClaimResult> {
  const response = await api.post<Envelope<{
    transaction_id: string;
    amount: number;
    pickup_name: string | null;
    dropoff_name: string | null;
    conductor_name: string | null;
    unit_number: string | null;
    paid_at: string | null;
    already_claimed: boolean;
  }>>(COMMUTER_API.receipts.claim, { qr_token: qrToken });

  const d = response.data;
  return {
    transactionId: d.transaction_id,
    amount: Number(d.amount) || 0,
    pickupName: d.pickup_name,
    dropoffName: d.dropoff_name,
    conductorName: d.conductor_name,
    unitNumber: d.unit_number,
    paidAt: d.paid_at,
    alreadyClaimed: Boolean(d.already_claimed),
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
