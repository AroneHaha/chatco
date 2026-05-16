"use client";

import { useState, useEffect, useCallback } from "react";
import {
  decodeQRTransaction,
  simulateScan,
  simulateVerification,
  simulateConfirmation,
  saveCommuterPayment,
  type PaymentState,
  type QRTransactionPayload,
  type CommuterPaymentRecord,
} from "@/lib/qr-transaction";
import { formatCurrency } from "@/lib/fare-calculator";

interface ScanModalProps {
  onClose: () => void;
  commuterId: string;
  commuterName: string;
}

type Step = "scanning" | "verifying" | "confirm" | "processing" | "success" | "failed";

/**
 * Commuter Scan Modal — Scan-Only Payment Flow
 *
 * Flow:
 *  1. scanning   — Camera/scanner UI (simulated)
 *  2. verifying  — Loading verification (~1 second)
 *  3. confirm    — Show transaction details + "Confirm Payment" button
 *  4. processing — Processing payment (future: PayMongo API)
 *  5. success    — Payment completed
 *  6. failed     — Payment failed
 *
 * Architecture:
 *  - Uses QRTransactionPayload for typed QR data
 *  - PaymentState machine enforced via canTransition()
 *  - All states are backend-ready: replace simulate*() with real API calls
 *  - CommuterPaymentRecord stored for history
 */
export default function ScanModal({ onClose, commuterId, commuterName }: ScanModalProps) {
  const [step, setStep] = useState<Step>("scanning");
  const [payload, setPayload] = useState<QRTransactionPayload | null>(null);
  const [scanAnimFrame, setScanAnimFrame] = useState(0);

  // ─── Scanning animation ──────────────────────────────────────
  useEffect(() => {
    if (step !== "scanning") return;
    const interval = setInterval(() => {
      setScanAnimFrame((f) => (f + 1) % 3);
    }, 600);
    return () => clearInterval(interval);
  }, [step]);

  // ─── Handle simulated scan ───────────────────────────────────
  const handleSimulateScan = useCallback(async () => {
    setStep("verifying");

    try {
      // Simulate QR scan → decode the payload
      const qrString = await simulateScan();
      const decoded = decodeQRTransaction(qrString);

      if (!decoded) {
        setStep("failed");
        return;
      }

      setPayload(decoded);

      // Simulate verification delay (~1 second)
      const verified = await simulateVerification();

      if (verified) {
        setStep("confirm");
      } else {
        setStep("failed");
      }
    } catch {
      setStep("failed");
    }
  }, []);

  // ─── Handle payment confirmation ─────────────────────────────
  const handleConfirmPayment = useCallback(async () => {
    if (!payload) return;

    setStep("processing");

    try {
      const success = await simulateConfirmation();

      if (success) {
        // Save the payment record for commuter history
        const record: CommuterPaymentRecord = {
          transactionId: payload.transactionId,
          amount: payload.amount,
          from: payload.from,
          to: payload.to,
          paymentMethod: payload.paymentMethod,
          conductorId: payload.conductorId,
          unitNumber: payload.unitNumber,
          status: "completed",
          scannedAt: payload.createdAt,
          confirmedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        };
        saveCommuterPayment(record);

        // Dispatch event for real-time sync (future: WebSocket)
        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent("commuter:payment-confirmed", {
              detail: { transactionId: payload.transactionId },
            })
          );
        }

        setStep("success");
      } else {
        setStep("failed");
      }
    } catch {
      setStep("failed");
    }
  }, [payload]);

  // ─── STEP: Scanning ──────────────────────────────────────────

  if (step === "scanning") {
    return (
      <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4">
        <div className="w-full sm:max-w-sm bg-[#071A2E] sm:rounded-2xl rounded-t-2xl border border-white/10 shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#1A5FB4]/15 border border-[#1A5FB4]/25 flex items-center justify-center">
                <svg className="w-5 h-5 text-[#62A0EA]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0 1 3.75 9.375v-4.5ZM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 0 1-1.125-1.125v-4.5ZM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0 1 13.5 9.375v-4.5Z" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Scan QR Code</h2>
                <p className="text-[11px] text-white/40">Point your camera at the conductor&apos;s QR</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white/40 hover:text-white transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Simulated Camera Viewfinder */}
          <div className="relative bg-[#050F1A] h-72 sm:h-80 flex items-center justify-center overflow-hidden">
            {/* Scan frame corners */}
            <div className="relative w-52 h-52">
              {/* Top-left corner */}
              <div className="absolute top-0 left-0 w-8 h-8 border-t-3 border-l-3 border-[#62A0EA] rounded-tl-lg" />
              {/* Top-right corner */}
              <div className="absolute top-0 right-0 w-8 h-8 border-t-3 border-r-3 border-[#62A0EA] rounded-tr-lg" />
              {/* Bottom-left corner */}
              <div className="absolute bottom-0 left-0 w-8 h-8 border-b-3 border-l-3 border-[#62A0EA] rounded-bl-lg" />
              {/* Bottom-right corner */}
              <div className="absolute bottom-0 right-0 w-8 h-8 border-b-3 border-r-3 border-[#62A0EA] rounded-br-lg" />

              {/* Animated scan line */}
              <div
                className="absolute left-2 right-2 h-0.5 bg-gradient-to-r from-transparent via-[#62A0EA] to-transparent transition-all duration-500 ease-in-out"
                style={{
                  top: scanAnimFrame === 0 ? "20%" : scanAnimFrame === 1 ? "50%" : "80%",
                  opacity: 0.8,
                }}
              />

              {/* Center QR icon hint */}
              <div className="absolute inset-0 flex items-center justify-center">
                <svg className="w-16 h-16 text-white/10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={0.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0 1 3.75 9.375v-4.5ZM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 0 1-1.125-1.125v-4.5ZM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0 1 13.5 9.375v-4.5Z" />
                </svg>
              </div>
            </div>

            {/* Dimming overlay outside scan frame */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-0 inset-x-0 h-[calc(50%-104px)] bg-black/30" />
              <div className="absolute bottom-0 inset-x-0 h-[calc(50%-104px)] bg-black/30" />
              <div className="absolute top-[calc(50%-104px)] bottom-[calc(50%-104px)] left-0 w-[calc(50%-104px)] bg-black/30" />
              <div className="absolute top-[calc(50%-104px)] bottom-[calc(50%-104px)] right-0 w-[calc(50%-104px)] bg-black/30" />
            </div>
          </div>

          {/* Action area */}
          <div className="p-4 sm:p-5 space-y-3">
            <p className="text-center text-xs text-white/30">
              Align the QR code shown by the conductor within the frame
            </p>
            <button
              onClick={handleSimulateScan}
              className="w-full py-3.5 rounded-xl bg-[#1A5FB4] hover:bg-[#164A8F] text-white text-sm font-bold transition-all shadow-lg shadow-[#1A5FB4]/30 flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0 1 3.75 9.375v-4.5Z" />
              </svg>
              Simulate Scan
            </button>
            <p className="text-center text-[10px] text-white/15">
              Frontend prototype — simulates scanning a conductor QR code
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ─── STEP: Verifying ─────────────────────────────────────────

  if (step === "verifying") {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
        <div className="w-full max-w-xs bg-[#071A2E] rounded-2xl border border-white/10 shadow-2xl p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full border-4 border-[#1A5FB4] border-t-transparent animate-spin" />
          <h2 className="text-lg font-bold text-white mb-2">
            Verifying Transaction
          </h2>
          <p className="text-sm text-white/40">
            Confirming payment details with the conductor…
          </p>
        </div>
      </div>
    );
  }

  // ─── STEP: Confirm Payment ───────────────────────────────────

  if (step === "confirm" && payload) {
    return (
      <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4">
        <div className="w-full sm:max-w-sm bg-[#071A2E] sm:rounded-2xl rounded-t-2xl border border-white/10 shadow-2xl max-h-[95vh] sm:max-h-none overflow-y-auto">
          <div className="p-5 sm:p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#1A5FB4]/15 border border-[#1A5FB4]/25 flex items-center justify-center">
                  <svg className="w-5 h-5 text-[#62A0EA]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
                  </svg>
                </div>
                <h2 className="text-lg font-bold text-white">Confirm Payment</h2>
              </div>
              <button
                onClick={onClose}
                className="text-white/40 hover:text-white transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Transaction Details */}
            <div className="bg-white/5 rounded-xl p-4 space-y-3 mb-5">
              {/* Amount - prominent */}
              <div className="text-center pb-3 border-b border-white/10">
                <p className="text-[10px] text-white/30 uppercase tracking-wider font-semibold mb-1">Amount Due</p>
                <p className="text-3xl font-extrabold text-white">{formatCurrency(payload.amount)}</p>
                {payload.discountAmount > 0 && (
                  <div className="flex items-center justify-center gap-2 mt-1">
                    <span className="text-xs text-white/30 line-through">{formatCurrency(payload.regularFare)}</span>
                    <span className="text-[10px] text-green-400 font-medium">You save {formatCurrency(payload.discountAmount)}</span>
                  </div>
                )}
              </div>

              {/* Route */}
              <div className="flex justify-between text-sm">
                <span className="text-white/40">Route</span>
                <span className="text-white text-right max-w-[60%] truncate">
                  {payload.from} → {payload.to}
                </span>
              </div>

              {/* Barangays */}
              <div className="flex justify-between text-sm">
                <span className="text-white/40">Barangays</span>
                <span className="text-white">{payload.barangaysTraveled} traveled</span>
              </div>

              {/* Commuter Type */}
              <div className="flex justify-between text-sm">
                <span className="text-white/40">Type</span>
                <span className="text-white">
                  {payload.commuterType === "SENIOR_CITIZEN" ? "Senior" : payload.commuterType === "PWD" ? "PWD" : payload.commuterType === "STUDENT" ? "Student" : "Regular"}
                </span>
              </div>

              {/* Payment Method */}
              <div className="flex justify-between text-sm">
                <span className="text-white/40">Method</span>
                <span className="text-[#62A0EA] font-medium">{payload.paymentMethod}</span>
              </div>

              {/* Transaction ID */}
              <div className="flex justify-between text-sm">
                <span className="text-white/40">Ref ID</span>
                <span className="text-white/50 text-xs font-mono">{payload.transactionId}</span>
              </div>

              {/* Unit */}
              <div className="flex justify-between text-sm">
                <span className="text-white/40">Unit</span>
                <span className="text-white/70">{payload.unitNumber}</span>
              </div>
            </div>

            {/* GCash Notice */}
            {payload.paymentMethod === "GCash" && (
              <div className="bg-[#1A5FB4]/10 border border-[#1A5FB4]/20 rounded-xl p-3 mb-5">
                <div className="flex items-center gap-2 mb-1">
                  <svg className="w-4 h-4 text-[#62A0EA]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
                  </svg>
                  <span className="text-xs font-semibold text-[#62A0EA]">GCash Secure Payment</span>
                </div>
                <p className="text-[10px] text-white/40">Confirming will process your GCash payment. No wallet balance needed — pay directly.</p>
              </div>
            )}

            {payload.paymentMethod === "Cash" && (
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 mb-5">
                <div className="flex items-center gap-2 mb-1">
                  <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z" />
                  </svg>
                  <span className="text-xs font-semibold text-emerald-400">Cash Payment</span>
                </div>
                <p className="text-[10px] text-white/40">Please prepare the exact amount to hand to the conductor.</p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 py-3 rounded-xl border border-white/10 text-white/60 text-sm font-semibold hover:bg-white/5 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmPayment}
                className={`flex-1 py-3 rounded-xl text-white text-sm font-bold transition-colors shadow-lg ${
                  payload.paymentMethod === "GCash"
                    ? "bg-[#1A5FB4] hover:bg-[#164A8F] shadow-[#1A5FB4]/30"
                    : "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/30"
                }`}
              >
                Confirm Payment
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── STEP: Processing ────────────────────────────────────────

  if (step === "processing") {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
        <div className="w-full max-w-xs bg-[#071A2E] rounded-2xl border border-white/10 shadow-2xl p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full border-4 border-[#1A5FB4] border-t-transparent animate-spin" />
          <h2 className="text-lg font-bold text-white mb-2">
            Processing Payment
          </h2>
          <p className="text-sm text-white/40">
            {payload?.paymentMethod === "GCash"
              ? "Confirming your GCash payment…"
              : "Recording cash payment…"}
          </p>
        </div>
      </div>
    );
  }

  // ─── STEP: Success ───────────────────────────────────────────

  if (step === "success" && payload) {
    return (
      <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4">
        <div className="w-full sm:max-w-sm bg-[#071A2E] sm:rounded-2xl rounded-t-2xl border border-white/10 shadow-2xl max-h-[95vh] sm:max-h-none overflow-y-auto">
          <div className="p-5 sm:p-6 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center">
              <svg className="w-8 h-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
              </svg>
            </div>
            <h2 className="text-lg font-bold text-white mb-1">
              Payment Successful!
            </h2>
            <p className="text-sm text-white/40 mb-4">
              {payload.paymentMethod === "GCash"
                ? "Your fare has been paid via GCash"
                : "Cash payment has been confirmed"}
            </p>

            <div className="bg-white/5 rounded-xl p-4 text-left space-y-2 mb-5">
              <div className="flex justify-between text-sm">
                <span className="text-white/40">Amount Paid</span>
                <span className="text-white font-bold">{formatCurrency(payload.amount)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-white/40">Route</span>
                <span className="text-white/70">
                  {payload.from} → {payload.to}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-white/40">Barangays</span>
                <span className="text-white/70">{payload.barangaysTraveled} traveled</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-white/40">Method</span>
                <span className={payload.paymentMethod === "GCash" ? "text-[#62A0EA]" : "text-emerald-400"}>
                  {payload.paymentMethod}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-white/40">Ref ID</span>
                <span className="text-white/50 text-xs font-mono">{payload.transactionId}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-white/40">Unit</span>
                <span className="text-white/70">{payload.unitNumber}</span>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-full py-3 rounded-xl bg-[#1A5FB4] hover:bg-[#164A8F] text-white text-sm font-bold transition-all shadow-lg shadow-[#1A5FB4]/30"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── STEP: Failed ────────────────────────────────────────────

  if (step === "failed") {
    return (
      <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4">
        <div className="w-full sm:max-w-sm bg-[#071A2E] sm:rounded-2xl rounded-t-2xl border border-white/10 shadow-2xl max-h-[95vh] sm:max-h-none overflow-y-auto">
          <div className="p-5 sm:p-6 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center">
              <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-lg font-bold text-white mb-1">
              Payment Failed
            </h2>
            <p className="text-sm text-white/40 mb-6">
              Could not process the payment. The QR code may be invalid or expired. Please try scanning again.
            </p>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 py-3 rounded-xl border border-white/10 text-white/60 text-sm font-semibold hover:bg-white/5 transition-colors"
              >
                Close
              </button>
              <button
                onClick={() => { setStep("scanning"); setPayload(null); }}
                className="flex-1 py-3 rounded-xl bg-[#1A5FB4] hover:bg-[#164A8F] text-white text-sm font-bold transition-colors"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
