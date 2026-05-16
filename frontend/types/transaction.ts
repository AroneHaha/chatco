/**
 * Canonical Transaction & Payment types for the Chatco application.
 *
 * Architecture notes (Laravel + Supabase):
 * - Transaction maps to the `transactions` Supabase table
 * - GCashPaymentIntent maps to PayMongo payment records
 * - CommuterPaymentRecord is the commuter-side view of a completed payment
 * - QRTransactionPayload is the data encoded in conductor-generated QR codes
 *
 * This file is the SINGLE SOURCE OF TRUTH for all transaction/payment types.
 * Do NOT re-define Transaction, RemittanceRecord, or payment types elsewhere.
 */

// ─── Payment Method ──────────────────────────────────────────────────
export type PaymentMethodType =
  | "Wallet_Scanned"
  | "Wallet_Prepay"
  | "Voucher"
  | "GCash"
  | "Cash";

export type QRPaymentMethod = "GCash" | "Cash";

export type PaymentStatus = "pending" | "processing" | "paid" | "failed";

export type GCashPaymentMethodType =
  | "GCash_Scanned"
  | "GCash_Direct"
  | "Cash"
  | "Voucher";

// ─── Transaction (Conductor-side, from Supabase `transactions` table) ─
export interface Transaction {
  transactionId: string;
  paymentMethod: PaymentMethodType;
  finalAmount: number;
  passengerName: string;
  passengerId: string;
  passengerRole?: string;
  from: string;
  to: string;
  distance: number;
  baseFare: number;
  succeedingKm: number;
  discountAmount?: number;
  conductorName?: string;
  unitNumber?: string;
  driverName?: string;
  timestamp: number;
}

// ─── GCash Payment Intent (PayMongo integration) ─────────────────────
export interface GCashPaymentIntent {
  id: string;
  amount: number;
  amountInCentavos: number;
  currency: "PHP";
  status: PaymentStatus;
  paymentMethod: GCashPaymentMethodType;
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

// ─── QR Transaction Payload (encoded in conductor QR codes) ──────────
export interface QRTransactionPayload {
  version: 1;
  transactionId: string;
  amount: number;
  from: string;
  to: string;
  barangaysTraveled: number;
  commuterType: string;
  paymentMethod: QRPaymentMethod;
  conductorId: string;
  shiftId: string;
  unitNumber: string;
  createdAt: string;
  regularFare: number;
  discountAmount: number;
}

// ─── Commuter Payment Record (commuter-side view) ────────────────────
export interface CommuterPaymentRecord {
  transactionId: string;
  amount: number;
  from: string;
  to: string;
  paymentMethod: QRPaymentMethod;
  conductorId: string;
  unitNumber: string;
  status: string;
  scannedAt: string;
  confirmedAt: string;
  createdAt: string;
}

// ─── Payment State Machine ───────────────────────────────────────────
export type PaymentState =
  | "idle"
  | "scanned"
  | "verifying"
  | "confirmed"
  | "processing"
  | "completed"
  | "failed";

export const VALID_TRANSITIONS: Record<PaymentState, PaymentState[]> = {
  idle: ["scanned", "failed"],
  scanned: ["verifying", "idle", "failed"],
  verifying: ["confirmed", "failed"],
  confirmed: ["processing", "failed"],
  processing: ["completed", "failed"],
  completed: [],
  failed: ["idle"],
};

export function canTransition(
  from: PaymentState,
  to: PaymentState
): boolean {
  return VALID_TRANSITIONS[from].includes(to);
}
