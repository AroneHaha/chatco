"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { fetchPaymentStatus, type PaymentStatus } from "@/lib/commuter/services/payment.service";

/**
 * /gcash/return — PayMongo redirect target
 *
 * After the commuter authorizes (or cancels) on PayMongo's hosted GCash
 * page, PayMongo redirects here with `?transaction_id=...` (the query param
 * configured in config/payments.php return_url).
 *
 * This page polls GET /api/payments/{id}/status every 3s until the status
 * reaches a terminal state (paid/failed/cancelled/expired). The backend's
 * PayMongo webhook usually flips the status to PAID within seconds of the
 * commuter authorizing — this polling picks that up.
 *
 * In DEV mode (FakeGateway), the conductor's [DEV] Simulate Payment button
 * drives the status to PAID through the same webhook path.
 */
export default function GcashReturnPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const transactionId = searchParams.get("transaction_id");

  const [status, setStatus] = useState<PaymentStatus | null>(null);
  const [pollCount, setPollCount] = useState(0);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!transactionId) return;

    const TERMINAL_STATUSES: PaymentStatus[] = ["paid", "failed", "cancelled", "expired", "refunded"];

    let mounted = true;

    const poll = async () => {
      try {
        const result = await fetchPaymentStatus(transactionId);
        if (!mounted) return;

        setStatus(result.status);
        setPollCount((c) => c + 1);

        if (TERMINAL_STATUSES.includes(result.status)) {
          stopPolling();
        }
      } catch {
        // Network error — keep polling, the next tick may recover.
      }
    };

    // Poll immediately, then every 3s.
    void poll();
    pollIntervalRef.current = setInterval(poll, 3000);

    // Hard timeout: 2 minutes. If the webhook hasn't fired by then,
    // stop polling + the UI will show the "still processing" state.
    const hardTimeout = setTimeout(() => {
      if (mounted) stopPolling();
    }, 2 * 60 * 1000);

    return () => {
      mounted = false;
      stopPolling();
      clearTimeout(hardTimeout);
    };
  }, [transactionId, stopPolling]);

  // ─── No transaction ID in URL ───
  if (!transactionId) {
    return (
      <div className="min-h-screen bg-[#071A2E] flex items-center justify-center p-4">
        <div className="w-full max-w-sm bg-[#0E1628] border border-white/10 rounded-2xl p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center">
            <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-lg font-bold text-white mb-2">
            Missing Transaction ID
          </h1>
          <p className="text-sm text-white/40 mb-6">
            No transaction ID found in the URL. Please return to the dashboard and try again.
          </p>
          <button
            onClick={() => router.push("/dashboard")}
            className="w-full py-3 rounded-xl bg-[#1A5FB4] hover:bg-[#164A8F] text-white text-sm font-bold transition-all shadow-lg shadow-[#1A5FB4]/30"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // ─── Loading / processing state ───
  if (!status || status === "pending" || status === "processing") {
    return (
      <div className="min-h-screen bg-[#071A2E] flex items-center justify-center p-4">
        <div className="w-full max-w-sm bg-[#0E1628] border border-white/10 rounded-2xl p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full border-4 border-[#1A5FB4] border-t-transparent animate-spin" />
          <h1 className="text-lg font-bold text-white mb-2">
            Processing your GCash payment
          </h1>
          <p className="text-sm text-white/40 mb-4">
            We&apos;re confirming your payment with GCash. This usually takes a few seconds.
          </p>
          {transactionId && (
            <p className="text-[10px] text-white/20 font-mono mb-4">
              Ref: {transactionId}
            </p>
          )}
          {pollCount > 5 && (
            <p className="text-xs text-amber-400/60">
              Still waiting… ({pollCount} attempts). If this takes too long, check your payment history later.
            </p>
          )}
          <button
            onClick={() => router.push("/dashboard")}
            className="w-full mt-4 py-2.5 rounded-xl border border-white/10 text-white/60 text-sm font-semibold hover:bg-white/5 transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // ─── Success state ───
  if (status === "paid") {
    return (
      <div className="min-h-screen bg-[#071A2E] flex items-center justify-center p-4">
        <div className="w-full max-w-sm bg-[#0E1628] border border-white/10 rounded-2xl p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center">
            <svg className="w-8 h-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
            </svg>
          </div>
          <h1 className="text-lg font-bold text-white mb-2">
            Payment Successful!
          </h1>
          <p className="text-sm text-white/40 mb-6">
            Your GCash payment has been confirmed. Have a safe trip!
          </p>
          {transactionId && (
            <p className="text-[10px] text-white/20 font-mono mb-6">
              Ref: {transactionId}
            </p>
          )}
          <button
            onClick={() => router.push("/dashboard")}
            className="w-full py-3 rounded-xl bg-[#1A5FB4] hover:bg-[#164A8F] text-white text-sm font-bold transition-all shadow-lg shadow-[#1A5FB4]/30"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // ─── Failure states ───
  const failureMessages: Record<string, string> = {
    failed: "Your GCash payment failed. Please try again or pay with cash.",
    cancelled: "The payment was cancelled. Please try again or pay with cash.",
    expired: "The payment session expired. Please ask the conductor to generate a new QR.",
    refunded: "This payment was refunded.",
  };

  return (
    <div className="min-h-screen bg-[#071A2E] flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-[#0E1628] border border-white/10 rounded-2xl p-8 text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center">
          <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
          </svg>
        </div>
        <h1 className="text-lg font-bold text-white mb-2">
          Payment {status.charAt(0).toUpperCase() + status.slice(1)}
        </h1>
        <p className="text-sm text-white/40 mb-6">
          {failureMessages[status] ?? "Something went wrong with your payment."}
        </p>
        {transactionId && (
          <p className="text-[10px] text-white/20 font-mono mb-6">
            Ref: {transactionId}
          </p>
        )}
        <button
          onClick={() => router.push("/dashboard")}
          className="w-full py-3 rounded-xl bg-[#1A5FB4] hover:bg-[#164A8F] text-white text-sm font-bold transition-all shadow-lg shadow-[#1A5FB4]/30"
        >
          Back to Dashboard
        </button>
      </div>
    </div>
  );
}
