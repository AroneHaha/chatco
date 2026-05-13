export type PaymentStatus = "pending" | "processing" | "paid" | "failed";
export type PaymentMethod = "GCash_Scanned" | "GCash_Direct" | "Cash" | "Voucher";

export interface GCashPaymentIntent {
  id: string;
  amount: number; // in pesos
  amountInCentavos: number;
  currency: "PHP";
  status: PaymentStatus;
  paymentMethod: PaymentMethod;
  commuterId: string;
  commuterName: string;
  pickupPoint: number;
  dropoffPoint: number;
  vehicleId?: string;
  conductorId?: string;
  shiftId?: string;
  paymongoPaymentId?: string;
  redirectUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePaymentParams {
  amount: number;
  commuterId: string;
  commuterName: string;
  pickupPoint: number;
  dropoffPoint: number;
  vehicleId?: string;
  conductorId?: string;
  shiftId?: string;
}


/**
 * PayMongo configuration.
 * Swap sk_test_ → sk_live_ for production.
 * Get keys from https://dashboard.paymongo.com
 */
export const PAYMONGO_CONFIG = {
  secretKey: process.env.PAYMONGO_SECRET_KEY || "sk_test_xxxxxxxxxxxxxxxx",
  publicKey: process.env.PAYMONGO_PUBLIC_KEY || "pk_test_xxxxxxxxxxxxxxxx",
  webhookSecret: process.env.PAYMONGO_WEBHOOK_SECRET || "whsec_xxxxxxxxxxxxxx",
  baseUrl: "https://api.paymongo.com/v1",
  isSandbox: true, // flip to false for production
};

const STORAGE_KEY = "chatco_payment_history";

// ─── Payment Intent Creation ─────────────────────────────────────────

/**
 * Create a GCash payment intent.
 * In sandbox mode, this simulates the PayMongo API call.
 * In production, this calls POST /api/payments/create which hits PayMongo.
 */
export async function createPaymentIntent(
  params: CreatePaymentParams
): Promise<GCashPaymentIntent> {
  const intent: GCashPaymentIntent = {
    id: `PAY-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`,
    amount: params.amount,
    amountInCentavos: Math.round(params.amount * 100),
    currency: "PHP",
    status: "pending",
    paymentMethod: "GCash_Direct",
    commuterId: params.commuterId,
    commuterName: params.commuterName,
    pickupPoint: params.pickupPoint,
    dropoffPoint: params.dropoffPoint,
    vehicleId: params.vehicleId,
    conductorId: params.conductorId,
    shiftId: params.shiftId,
    redirectUrl: `${window.location.origin}/payment/callback?id=${params.commuterId}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // In production, call our API route which hits PayMongo
  if (!PAYMONGO_CONFIG.isSandbox) {
    try {
      const response = await fetch("/api/payments/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: intent.amountInCentavos,
          commuterId: params.commuterId,
          description: `CHATCO Fare: Point ${params.pickupPoint} → Point ${params.dropoffPoint}`,
        }),
      });
      const data = await response.json();
      if (data.attributes) {
        intent.paymongoPaymentId = data.id;
        intent.redirectUrl = data.attributes.next_action?.redirect?.url || intent.redirectUrl;
      }
    } catch (error) {
      console.error("PayMongo API error:", error);
    }
  }

  // Save to local payment history
  savePaymentToHistory(intent);

  return intent;
}

// ─── Payment Verification ────────────────────────────────────────────

/**
 * Verify the status of a payment.
 * In sandbox, simulates a successful payment after a delay.
 * In production, calls our API to check PayMongo status.
 */
export async function verifyPayment(
  paymentId: string
): Promise<PaymentStatus> {
  if (!PAYMONGO_CONFIG.isSandbox) {
    try {
      const response = await fetch(`/api/payments/verify?id=${paymentId}`);
      const data = await response.json();
      return data.status || "pending";
    } catch {
      return "pending";
    }
  }

  // Sandbox: simulate payment processing
  await new Promise((r) => setTimeout(r, 1500));
  const newStatus: PaymentStatus = "paid";
  updatePaymentStatus(paymentId, newStatus);
  return newStatus;
}

// ─── Payment History ─────────────────────────────────────────────────

/**
 * Get payment history for a commuter.
 * In production, this comes from the database via API.
 */
export async function getPaymentHistory(
  commuterId?: string
): Promise<GCashPaymentIntent[]> {
  const history = getLocalPaymentHistory();
  if (commuterId) {
    return history.filter((p) => p.commuterId === commuterId);
  }
  return history;
}

// ─── Local Storage Helpers (sandbox/prototype) ───────────────────────

function getLocalPaymentHistory(): GCashPaymentIntent[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as GCashPaymentIntent[];
  } catch {
    return [];
  }
}

function savePaymentToHistory(intent: GCashPaymentIntent): void {
  if (typeof window === "undefined") return;
  const history = getLocalPaymentHistory();
  history.unshift(intent);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
}

function updatePaymentStatus(
  paymentId: string,
  status: PaymentStatus
): void {
  if (typeof window === "undefined") return;
  const history = getLocalPaymentHistory();
  const idx = history.findIndex((p) => p.id === paymentId);
  if (idx !== -1) {
    history[idx].status = status;
    history[idx].updatedAt = new Date().toISOString();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  }
}

// ─── Payment Method Display Helpers ──────────────────────────────────

export function getPaymentMethodLabel(method: PaymentMethod): string {
  const labels: Record<PaymentMethod, string> = {
    GCash_Scanned: "GCash (Scanned)",
    GCash_Direct: "GCash (Direct)",
    Cash: "Cash",
    Voucher: "Voucher",
  };
  return labels[method];
}

export function getPaymentStatusColor(status: PaymentStatus): string {
  const colors: Record<PaymentStatus, string> = {
    pending: "text-yellow-400",
    processing: "text-blue-400",
    paid: "text-green-400",
    failed: "text-red-400",
  };
  return colors[status];
}

export function getPaymentStatusLabel(status: PaymentStatus): string {
  const labels: Record<PaymentStatus, string> = {
    pending: "Pending",
    processing: "Processing",
    paid: "Paid",
    failed: "Failed",
  };
  return labels[status];
}