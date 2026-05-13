// lib/refund-service.ts
// Refund processing logic for engine breakdowns, interrupted trips, incomplete rides

export type RefundReason =
  | "ENGINE_BREAKDOWN"
  | "INTERRUPTED_TRIP"
  | "INCOMPLETE_RIDE"
  | "OVERCHARGED"
  | "OTHER";

export type RefundStatus = "PENDING" | "APPROVED" | "REJECTED" | "PROCESSED";

export type RefundPaymentMethod = "GCash_Scanned" | "GCash_Direct" | "Cash";

export interface RefundRequest {
  id: string;
  transactionId: string;
  commuterId: string;
  commuterName: string;
  amount: number;
  reason: RefundReason;
  description: string;
  status: RefundStatus;
  paymentMethod: RefundPaymentMethod;
  reviewedBy?: string;
  reviewedAt?: string;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SubmitRefundParams {
  transactionId: string;
  commuterId: string;
  commuterName: string;
  amount: number;
  reason: RefundReason;
  description: string;
  paymentMethod: RefundPaymentMethod;
}

const STORAGE_KEY = "chatco_refund_requests";

/** Refund reason options for UI display */
export const REFUND_REASONS: {
  value: RefundReason;
  label: string;
  description: string;
}[] = [
  {
    value: "ENGINE_BREAKDOWN",
    label: "Engine Breakdown",
    description:
      "The jeepney broke down during the trip and could not continue.",
  },
  {
    value: "INTERRUPTED_TRIP",
    label: "Interrupted Trip",
    description:
      "The trip was interrupted (accident, road closure, etc.) before reaching the destination.",
  },
  {
    value: "INCOMPLETE_RIDE",
    label: "Incomplete Ride",
    description:
      "The commuter was dropped off before reaching their intended destination.",
  },
  {
    value: "OVERCHARGED",
    label: "Overcharged Fare",
    description:
      "The fare charged was higher than the official CHATCO fare matrix rate.",
  },
  {
    value: "OTHER",
    label: "Other",
    description: "Any other reason not listed above.",
  },
];

// ─── CRUD Operations ─────────────────────────────────────────────────

/**
 * Submit a new refund request.
 * Status starts as PENDING until admin/conductor reviews it.
 */
export async function submitRefundRequest(
  params: SubmitRefundParams
): Promise<RefundRequest> {
  const request: RefundRequest = {
    id: `REF-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`,
    transactionId: params.transactionId,
    commuterId: params.commuterId,
    commuterName: params.commuterName,
    amount: params.amount,
    reason: params.reason,
    description: params.description,
    status: "PENDING",
    paymentMethod: params.paymentMethod,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // In production: POST /api/refunds
  await new Promise((r) => setTimeout(r, 800)); // simulate API
  saveRefundLocal(request);

  return request;
}

/**
 * Approve a refund request (admin/conductor action).
 * For GCash payments, triggers PayMongo reversal.
 * For cash payments, marks as manual refund.
 */
export async function approveRefund(
  refundId: string,
  reviewerId: string
): Promise<RefundRequest | null> {
  const refunds = getLocalRefunds();
  const idx = refunds.findIndex((r) => r.id === refundId);
  if (idx === -1) return null;

  refunds[idx].status = "APPROVED";
  refunds[idx].reviewedBy = reviewerId;
  refunds[idx].reviewedAt = new Date().toISOString();
  refunds[idx].updatedAt = new Date().toISOString();

  // In production: call PayMongo refund API for GCash payments
  if (
    refunds[idx].paymentMethod === "GCash_Scanned" ||
    refunds[idx].paymentMethod === "GCash_Direct"
  ) {
    // Process GCash reversal through PayMongo
    // await processRefund(refunds[idx].transactionId, 'Approved refund');
    refunds[idx].status = "PROCESSED";
  }

  saveLocalRefunds(refunds);
  return refunds[idx];
}

/**
 * Reject a refund request (admin/conductor action).
 */
export async function rejectRefund(
  refundId: string,
  reviewerId: string,
  rejectionReason: string
): Promise<RefundRequest | null> {
  const refunds = getLocalRefunds();
  const idx = refunds.findIndex((r) => r.id === refundId);
  if (idx === -1) return null;

  refunds[idx].status = "REJECTED";
  refunds[idx].reviewedBy = reviewerId;
  refunds[idx].reviewedAt = new Date().toISOString();
  refunds[idx].rejectionReason = rejectionReason;
  refunds[idx].updatedAt = new Date().toISOString();

  saveLocalRefunds(refunds);
  return refunds[idx];
}

/**
 * Get refund history for a specific commuter, or all refunds.
 */
export async function getRefundHistory(
  commuterId?: string
): Promise<RefundRequest[]> {
  const refunds = getLocalRefunds();
  if (commuterId) {
    return refunds.filter((r) => r.commuterId === commuterId);
  }
  return refunds;
}

// ─── Display Helpers ──────────────────────────────────────────────────

export function getRefundStatusLabel(status: RefundStatus): string {
  const labels: Record<RefundStatus, string> = {
    PENDING: "Pending Review",
    APPROVED: "Approved",
    REJECTED: "Rejected",
    PROCESSED: "Refunded",
  };
  return labels[status];
}

export function getRefundStatusColor(status: RefundStatus): string {
  const colors: Record<RefundStatus, string> = {
    PENDING: "text-yellow-400 bg-yellow-400/10",
    APPROVED: "text-blue-400 bg-blue-400/10",
    REJECTED: "text-red-400 bg-red-400/10",
    PROCESSED: "text-green-400 bg-green-400/10",
  };
  return colors[status];
}

export function getRefundReasonLabel(reason: RefundReason): string {
  const found = REFUND_REASONS.find((r) => r.value === reason);
  return found ? found.label : reason;
}

// ─── Local Storage (prototype) ───────────────────────────────────────

function getLocalRefunds(): RefundRequest[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as RefundRequest[];
  } catch {
    return [];
  }
}

function saveRefundLocal(request: RefundRequest): void {
  if (typeof window === "undefined") return;
  const refunds = getLocalRefunds();
  refunds.unshift(request);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(refunds));
}

function saveLocalRefunds(refunds: RefundRequest[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(refunds));
}