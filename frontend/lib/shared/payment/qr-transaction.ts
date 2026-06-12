/**
 * QR Transaction Library — Backend-Proof Transaction Flow
 *
 * This module defines the typed data structure that gets encoded into the
 * conductor-generated QR code, and the payment state machine that the
 * commuter follows when scanning and confirming.
 *
 * Architecture:
 * ─────────────────────────────────────────────────────────────
 * 1. Conductor creates a transaction → generates QR with payload
 * 2. Commuter scans QR → decodes payload → enters verification
 * 3. Commuter confirms → payment state transitions to "confirmed"
 * 4. In production: PayMongo API replaces the frontend simulation
 *    and real-time DB events sync conductor ↔ commuter dashboards
 * ─────────────────────────────────────────────────────────────
 *
 * Future integration points:
 * - Replace `simulateVerification()` with PayMongo source creation
 * - Replace `simulateConfirmation()` with PayMongo payment confirmation
 * - Add WebSocket/Firebase listeners for real-time state sync
 * - Add server-side transaction validation
 */

// ─── QR Payload Types ──────────────────────────────────────────────

export type QRPaymentMethod = "GCash" | "Cash";

export interface QRTransactionPayload {
  /** Protocol prefix for validation */
  version: 1;
  /** Unique transaction ID — will match conductor's TXN-xxx format */
  transactionId: string;
  /** Fare amount in PHP pesos */
  amount: number;
  /** Pickup point name */
  from: string;
  /** Drop-off point name */
  to: string;
  /** Number of barangays traversed */
  barangaysTraveled: number;
  /** Commuter type: REGULAR | STUDENT | SENIOR_CITIZEN | PWD */
  commuterType: string;
  /** Payment method selected by conductor */
  paymentMethod: QRPaymentMethod;
  /** Conductor identifier */
  conductorId: string;
  /** Shift ID for transaction grouping */
  shiftId: string;
  /** Unit/vehicle number */
  unitNumber: string;
  /** ISO timestamp of transaction creation */
  createdAt: string;
  /** Regular fare before discount */
  regularFare: number;
  /** Discount amount applied */
  discountAmount: number;
}

// ─── Payment State Machine ─────────────────────────────────────────

/**
 * States for the commuter-side payment flow.
 *
 * idle      → Scanner active, waiting for QR
 * scanned   → QR decoded, payload available
 * verifying → Frontend simulation of payment verification (~1s)
 * confirmed → Commuter has confirmed the payment
 * processing → Payment is being processed (future: PayMongo API)
 * completed → Payment successful
 * failed    → Payment failed
 */
export type PaymentState =
  | "idle"
  | "scanned"
  | "verifying"
  | "confirmed"
  | "processing"
  | "completed"
  | "failed";

/**
 * Valid state transitions — enforces the state machine flow.
 * Used for type-safe state transitions and debugging.
 */
export const VALID_TRANSITIONS: Record<PaymentState, PaymentState[]> = {
  idle: ["scanned", "failed"],
  scanned: ["verifying", "idle", "failed"],
  verifying: ["confirmed", "failed"],
  confirmed: ["processing", "failed"],
  processing: ["completed", "failed"],
  completed: [],
  failed: ["idle"],
};

export function canTransition(from: PaymentState, to: PaymentState): boolean {
  return VALID_TRANSITIONS[from].includes(to);
}

// ─── QR Encoding / Decoding ────────────────────────────────────────

const QR_PREFIX = "chatco://txn/";

/**
 * Encode a QRTransactionPayload into a string for QR code embedding.
 * Uses JSON-based encoding with a protocol prefix for easy identification.
 *
 * In production, this could be a signed JWT or encrypted payload
 * to prevent tampering. For now, JSON is sufficient for the prototype.
 */
export function encodeQRTransaction(payload: QRTransactionPayload): string {
  return `${QR_PREFIX}${JSON.stringify(payload)}`;
}

/**
 * Decode a QR string back into a QRTransactionPayload.
 * Returns null if the string is not a valid Chatco transaction QR.
 */
export function decodeQRTransaction(qrString: string): QRTransactionPayload | null {
  if (!qrString.startsWith(QR_PREFIX)) return null;

  try {
    const jsonStr = qrString.slice(QR_PREFIX.length);
    const parsed = JSON.parse(jsonStr);

    // Validate required fields
    if (
      typeof parsed.version !== "number" ||
      typeof parsed.transactionId !== "string" ||
      typeof parsed.amount !== "number" ||
      typeof parsed.from !== "string" ||
      typeof parsed.to !== "string" ||
      typeof parsed.paymentMethod !== "string"
    ) {
      return null;
    }

    return parsed as QRTransactionPayload;
  } catch {
    return null;
  }
}

// ─── Frontend Simulation Helpers ───────────────────────────────────

/**
 * Simulate QR scanning delay (frontend prototype only).
 * In production, this would be replaced by actual camera-based QR scanning.
 */
export function simulateScan(): Promise<string> {
  return new Promise((resolve) => {
    // Generate a mock QR payload for simulation
    const mockPayload: QRTransactionPayload = {
      version: 1,
      transactionId: `TXN-${Date.now()}`,
      amount: 22,
      from: "San Isidro",
      to: "Sto. Niño",
      barangaysTraveled: 6,
      commuterType: "REGULAR",
      paymentMethod: "GCash",
      conductorId: "cond_01",
      shiftId: "SH-CURRENT",
      unitNumber: "JEEP-001",
      createdAt: new Date().toISOString(),
      regularFare: 22,
      discountAmount: 0,
    };
    setTimeout(() => resolve(encodeQRTransaction(mockPayload)), 800);
  });
}

/**
 * Simulate payment verification (frontend prototype only).
 * In production, this calls PayMongo API to verify the payment source.
 */
export function simulateVerification(): Promise<boolean> {
  return new Promise((resolve) => {
    setTimeout(() => resolve(true), 1000);
  });
}

/**
 * Simulate payment confirmation processing (frontend prototype only).
 * In production, this creates a PayMongo payment intent and confirms it.
 */
export function simulateConfirmation(): Promise<boolean> {
  return new Promise((resolve) => {
    setTimeout(() => resolve(true), 1500);
  });
}

// ─── Commuter Payment Record ───────────────────────────────────────

/**
 * Record of a completed commuter payment.
 * Stored in localStorage for the commuter's payment history.
 * Structured to be compatible with the existing GCashPaymentIntent type
 * for seamless migration.
 */
export interface CommuterPaymentRecord {
  /** Unique transaction ID matching the QR payload */
  transactionId: string;
  /** Fare amount paid */
  amount: number;
  /** Pickup location */
  from: string;
  /** Drop-off location */
  to: string;
  /** Payment method */
  paymentMethod: QRPaymentMethod;
  /** Conductor who initiated the transaction */
  conductorId: string;
  /** Unit number of the jeepney */
  unitNumber: string;
  /** Payment state at time of record */
  status: PaymentState;
  /** When the QR was scanned */
  scannedAt: string;
  /** When payment was confirmed */
  confirmedAt: string;
  /** ISO timestamp */
  createdAt: string;
}

const COMMUTER_PAYMENT_KEY = "chatco_commuter_payments";

/**
 * Save a commuter payment record to localStorage.
 * In production, this would be a database write via API.
 */
export function saveCommuterPayment(record: CommuterPaymentRecord): void {
  if (typeof window === "undefined") return;
  const existing: CommuterPaymentRecord[] = JSON.parse(
    localStorage.getItem(COMMUTER_PAYMENT_KEY) || "[]"
  );
  existing.unshift(record);
  localStorage.setItem(COMMUTER_PAYMENT_KEY, JSON.stringify(existing));
}

/**
 * Get all commuter payment records from localStorage.
 */
export function getCommuterPayments(): CommuterPaymentRecord[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(COMMUTER_PAYMENT_KEY) || "[]");
  } catch {
    return [];
  }
}
