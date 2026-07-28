"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { claimGcash, type ClaimResult } from "@/lib/commuter/services/payment.service";
import { ApiError } from "@/lib/api/client";
import { formatCurrency } from "@/lib/shared/fare/fare-calculator";

interface ScanModalProps {
  onClose: () => void;
  commuterId: string;
  commuterName: string;
}

type Step = "scanning" | "verifying" | "confirm" | "redirecting" | "success" | "failed";

/**
 * Commuter Scan Modal — Real GCash Payment Flow
 *
 * Flow:
 *  1. scanning   — Camera scans the conductor's QR (which contains the qr_token)
 *  2. verifying  — Calls POST /api/commuter/payments/claim { qr_token }
 *                  Backend binds the commuter's passenger_id to the transaction
 *                  + returns the PayMongo checkout_url + amount + route
 *  3. confirm    — Shows the fare details + "Pay with GCash" button
 *  4. redirecting — Redirects to the PayMongo hosted authorize page
 *  5. success    — (only reached if checkout_url is null = FakeGateway dev mode)
 *  6. failed     — Bad token / expired / already claimed / network error
 *
 * After the commuter authorizes on PayMongo's hosted page, PayMongo redirects
 * to {APP_URL}/gcash/return?transaction_id=... — handled by the
 * app/(commuter)/gcash/return/page.tsx route, which polls the status and
 * shows the final result.
 *
 * In DEV mode (FakeGateway, no PayMongo keys), checkout_url is null. The
 * claim still binds the commuter to the transaction, and the conductor's
 * [DEV] Simulate Payment button drives it to PAID through the webhook path.
 */
export default function ScanModal({ onClose }: ScanModalProps) {
  const [step, setStep] = useState<Step>("scanning");
  const [claimResult, setClaimResult] = useState<ClaimResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [manualToken, setManualToken] = useState("");
  const [showManualEntry, setShowManualEntry] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannerRunningRef = useRef(false);
  const scannerContainerId = "qr-reader-container";

  // ─── Safely stop the scanner ───
  // html5-qrcode throws "Cannot stop, scanner is not running or paused" if
  // stop() is called on a scanner that already stopped or never started.
  // We track the running state in a ref + guard every stop() call.
  const stopScanner = useCallback(async () => {
    if (!scannerRef.current) return;
    if (!scannerRunningRef.current) return;

    try {
      await scannerRef.current.stop();
    } catch {
      // Already stopped or never started — ignore.
    } finally {
      scannerRunningRef.current = false;
      try {
        scannerRef.current?.clear();
      } catch {
        // clear() can also throw if the element is gone — ignore.
      }
      scannerRef.current = null;
    }
  }, []);

  // ─── Camera scanner setup ───
  // Uses html5-qrcode (already installed) to scan the conductor's QR.
  // The QR contains JUST the qr_token (a 32-char opaque string). We pass
  // it to claimGcash() which POSTs to /commuter/payments/claim.
  useEffect(() => {
    if (step !== "scanning") return;

    let mounted = true;

    const startScanner = async () => {
      try {
        const html5QrCode = new Html5Qrcode(scannerContainerId);
        scannerRef.current = html5QrCode;

        await html5QrCode.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 220, height: 220 } },
          (decodedText) => {
            if (!mounted) return;
            // Stop the scanner immediately — we have a result. The
            // useEffect cleanup will also run when the step changes, but
            // stopScanner() guards against double-stop.
            void stopScanner();
            handleScanSuccess(decodedText);
          },
          () => {
            // Per-frame failure — ignore, the scanner keeps trying.
          }
        );
        // Only mark as running AFTER start() succeeds — otherwise the
        // cleanup function would try to stop a scanner that never started.
        if (mounted) {
          scannerRunningRef.current = true;
        } else {
          // Component unmounted during start() — stop immediately.
          void stopScanner();
        }
      } catch {
        // Camera not available / permission denied — fall back to manual entry.
        if (mounted) setShowManualEntry(true);
        scannerRef.current = null;
      }
    };

    void startScanner();

    return () => {
      mounted = false;
      void stopScanner();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, stopScanner]);

  // ─── Release the camera when the modal closes entirely ───
  // This is separate from the step-change cleanup so it fires when the
  // whole modal unmounts (user clicks Close), not just when the step
  // changes within the modal.
  useEffect(() => {
    return () => {
      void stopScanner();
    };
  }, [stopScanner]);

  // ─── Handle successful QR scan ───
  // The decoded text IS the qr_token. Call claimGcash() to bind this
  // commuter to the transaction + get the PayMongo checkout_url.
  const handleScanSuccess = useCallback(async (qrToken: string) => {
    setStep("verifying");
    setError(null);

    try {
      const result = await claimGcash(qrToken.trim());
      setClaimResult(result);
      setStep("confirm");
    } catch (err) {
      // Extract the backend's specific error message. The ApiError.body
      // contains the Laravel envelope { success, data, message, errors }.
      let msg = "Failed to claim this payment. The QR may be invalid or expired.";

      if (err instanceof ApiError) {
        const body = err.body as { message?: string; errors?: Record<string, string[]> } | null;
        if (body?.errors) {
          // 422 validation error — surface the first field error.
          const firstField = Object.keys(body.errors)[0];
          const firstError = firstField ? body.errors[firstField]?.[0] : null;
          msg = firstError ?? body.message ?? msg;
        } else if (body?.message) {
          // 404 / 410 / 409 / other — use the backend's message verbatim.
          msg = body.message;
        }

        // Status-specific friendly messages.
        if (err.status === 404) msg = "This payment QR is invalid or was not found. Please ask the conductor to generate a new one.";
        else if (err.status === 410) msg = "This payment QR has expired or already been paid. Please ask the conductor to generate a new one.";
        else if (err.status === 409) msg = "This payment has already been claimed by another commuter. Please ask the conductor to generate a new one.";
        else if (err.status === 401) msg = "You must be logged in as a commuter to claim a payment.";
        else if (err.status === 422 && !body?.errors) msg = body?.message ?? "Your commuter account is missing required information to claim this payment.";
      } else if (err instanceof Error) {
        msg = err.message;
      }

      setError(msg);
      setStep("failed");
    }
  }, []);

  // ─── Handle manual token entry (fallback when camera unavailable) ───
  const handleManualSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualToken.trim()) return;
    await handleScanSuccess(manualToken.trim());
  }, [manualToken, handleScanSuccess]);

  // ─── Redirect to PayMongo hosted authorize page ───
  // In real mode, checkout_url is the PayMongo hosted page. The commuter
  // authorizes there, PayMongo redirects to /gcash/return, and the webhook
  // flips the transaction to PAID.
  // In dev mode (FakeGateway), checkout_url is null — we show a waiting
  // state and the conductor's [DEV] Simulate button drives it to PAID.
  const handleConfirmPayment = useCallback(() => {
    if (!claimResult) return;

    if (claimResult.checkoutUrl) {
      // Real PayMongo flow — redirect to the hosted authorize page.
      setStep("redirecting");
      window.location.href = claimResult.checkoutUrl;
    } else {
      // Dev mode (FakeGateway) — no redirect. Show a waiting state.
      // The conductor's [DEV] Simulate Payment button will drive the
      // status to PAID via the webhook path. The commuter can close
      // this modal and check their payment history for the final status.
      setStep("success");
    }
  }, [claimResult]);

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

          {/* Camera viewfinder — html5-qrcode mounts here */}
          <div className="relative bg-[#050F1A] h-72 sm:h-80 overflow-hidden">
            <div id={scannerContainerId} className="w-full h-full" />
            {/* Scan frame overlay */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="relative w-52 h-52">
                <div className="absolute top-0 left-0 w-8 h-8 border-t-3 border-l-3 border-[#62A0EA] rounded-tl-lg" />
                <div className="absolute top-0 right-0 w-8 h-8 border-t-3 border-r-3 border-[#62A0EA] rounded-tr-lg" />
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-3 border-l-3 border-[#62A0EA] rounded-bl-lg" />
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-3 border-r-3 border-[#62A0EA] rounded-br-lg" />
              </div>
            </div>
          </div>

          {/* Action area */}
          <div className="p-4 sm:p-5 space-y-3">
            {showManualEntry ? (
              <form onSubmit={handleManualSubmit} className="space-y-3">
                <p className="text-center text-xs text-amber-400/70">
                  Camera unavailable — enter the token manually
                </p>
                <input
                  type="text"
                  value={manualToken}
                  onChange={(e) => setManualToken(e.target.value)}
                  placeholder="Paste qr_token here"
                  className="w-full px-3 py-2.5 bg-[#0E1628] border border-white/10 rounded-xl text-white text-sm font-mono placeholder-white/20 focus:outline-none focus:border-[#62A0EA]/50"
                />
                <button
                  type="submit"
                  disabled={!manualToken.trim()}
                  className="w-full py-3.5 rounded-xl bg-[#1A5FB4] hover:bg-[#164A8F] disabled:opacity-50 text-white text-sm font-bold transition-all shadow-lg shadow-[#1A5FB4]/30"
                >
                  Claim Payment
                </button>
              </form>
            ) : (
              <p className="text-center text-xs text-white/30">
                Align the QR code shown by the conductor within the frame
              </p>
            )}
            <button
              onClick={() => setShowManualEntry(!showManualEntry)}
              className="w-full text-center text-[11px] text-white/30 hover:text-white/50 transition-colors"
            >
              {showManualEntry ? "Use camera instead" : "Enter token manually"}
            </button>
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
            Claiming this payment + binding it to your account…
          </p>
        </div>
      </div>
    );
  }

  // ─── STEP: Confirm Payment ───────────────────────────────────

  if (step === "confirm" && claimResult) {
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
                <p className="text-3xl font-extrabold text-white">{formatCurrency(claimResult.amount)}</p>
              </div>

              {claimResult.discountAmount > 0 && (
                <>
                  <div className="flex justify-between text-sm">
                    <span className="text-white/40">Regular fare</span>
                    <span className="text-white/60 line-through">{formatCurrency(claimResult.regularAmount)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-emerald-400">{claimResult.passengerRole?.replaceAll('_', ' ')} discount</span>
                    <span className="font-semibold text-emerald-400">-{formatCurrency(claimResult.discountAmount)}</span>
                  </div>
                </>
              )}

              {/* Route */}
              <div className="flex justify-between text-sm">
                <span className="text-white/40">Route</span>
                <span className="text-white text-right max-w-[60%] truncate">
                  {claimResult.pickupName ?? "—"} → {claimResult.dropoffName ?? "—"}
                </span>
              </div>

              {/* Payment Method */}
              <div className="flex justify-between text-sm">
                <span className="text-white/40">Method</span>
                <span className="text-[#62A0EA] font-medium">GCash</span>
              </div>

              {/* Transaction ID */}
              <div className="flex justify-between text-sm">
                <span className="text-white/40">Ref ID</span>
                <span className="text-white/50 text-xs font-mono">{claimResult.transactionId}</span>
              </div>
            </div>

            {/* GCash Notice */}
            <div className="bg-[#1A5FB4]/10 border border-[#1A5FB4]/20 rounded-xl p-3 mb-5">
              <div className="flex items-center gap-2 mb-1">
                <svg className="w-4 h-4 text-[#62A0EA]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
                </svg>
                <span className="text-xs font-semibold text-[#62A0EA]">GCash Secure Payment</span>
              </div>
              <p className="text-[10px] text-white/40">
                {claimResult.checkoutUrl
                  ? "You'll be redirected to GCash's secure page to authorize this payment."
                  : "Dev mode — the conductor will simulate the payment. Check your payment history for the final status."}
              </p>
            </div>

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
                className="flex-1 py-3 rounded-xl text-white text-sm font-bold transition-colors shadow-lg bg-[#1A5FB4] hover:bg-[#164A8F] shadow-[#1A5FB4]/30"
              >
                {claimResult.checkoutUrl ? "Pay with GCash" : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── STEP: Redirecting (real PayMongo flow) ─────────────────

  if (step === "redirecting") {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
        <div className="w-full max-w-xs bg-[#071A2E] rounded-2xl border border-white/10 shadow-2xl p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full border-4 border-[#1A5FB4] border-t-transparent animate-spin" />
          <h2 className="text-lg font-bold text-white mb-2">
            Redirecting to GCash
          </h2>
          <p className="text-sm text-white/40">
            You&apos;re being redirected to GCash&apos;s secure page to authorize this payment…
          </p>
        </div>
      </div>
    );
  }

  // ─── STEP: Success (dev mode only — real flow redirects to PayMongo) ───

  if (step === "success" && claimResult) {
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
              Payment Claimed
            </h2>
            <p className="text-sm text-white/40 mb-4">
              Your payment is being processed. Check your payment history for the final status.
            </p>

            <div className="bg-white/5 rounded-xl p-4 text-left space-y-2 mb-5">
              <div className="flex justify-between text-sm">
                <span className="text-white/40">Amount</span>
                <span className="text-white font-bold">{formatCurrency(claimResult.amount)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-white/40">Route</span>
                <span className="text-white/70">
                  {claimResult.pickupName ?? "—"} → {claimResult.dropoffName ?? "—"}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-white/40">Ref ID</span>
                <span className="text-white/50 text-xs font-mono">{claimResult.transactionId}</span>
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
              {error ?? "Could not process the payment. The QR code may be invalid, expired, or already claimed by another commuter."}
            </p>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 py-3 rounded-xl border border-white/10 text-white/60 text-sm font-semibold hover:bg-white/5 transition-colors"
              >
                Close
              </button>
              <button
                onClick={() => { setStep("scanning"); setClaimResult(null); setError(null); }}
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
