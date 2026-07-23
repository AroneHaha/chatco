"use client";

import { useState, useEffect, useRef, useCallback, Suspense } from "react";
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
 * reaches a hard-terminal state (paid/failed/cancelled/refunded) or the
 * late-settlement grace window elapses after EXPIRED. The backend's PayMongo
 * webhook usually flips the status to PAID within seconds of the commuter
 * authorizing — this polling picks that up.
 *
 * LATE-SETTLEMENT HANDLING:
 * EXPIRED is NOT treated as immediately terminal. After the row flips to
 * EXPIRED, the page keeps polling for a grace window (default 60s) because
 * the commuter may have completed PayMongo checkout seconds before the
 * local TTL lapsed — PayMongo's webhook then arrives late and the state
 * machine's EXPIRED→PAID transition fires.
 *
 * In DEV mode (FakeGateway), the conductor's [DEV] Simulate Payment button
 * drives the status to PAID through the same webhook path.
 */
function GcashReturnContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const transactionId = searchParams.get("transaction_id");

  const [status, setStatus] = useState<PaymentStatus | null>(null);
  const [pollCount, setPollCount] = useState(0);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  /** Timestamp (ms) when EXPIRED was first observed, or null if not yet seen. */
  const expiredAtRef = useRef<number | null>(null);

  const stopPolling = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
    expiredAtRef.current = null;
  }, []);

  useEffect(() => {
    if (!transactionId) return;

    // Hard-terminal statuses end polling immediately. EXPIRED is handled
    // through the grace-window logic to allow for late PayMongo webhooks.
    const HARD_TERMINAL: PaymentStatus[] = ["paid", "failed", "cancelled", "refunded"];
    // Grace window after EXPIRED is first observed (matches server-side default).
    const LATE_SETTLEMENT_GRACE_MS = 60 * 1000;

    let mounted = true;

    const poll = async () => {
      try {
        const result = await fetchPaymentStatus(transactionId);
        if (!mounted) return;

        setStatus(result.status);
        setPollCount((c) => c + 1);

        // PAID is always terminal — success regardless of prior EXPIRED state.
        if (result.status === "paid") {
          stopPolling();
          return;
        }

        // Hard-terminal failure statuses end immediately.
        if (HARD_TERMINAL.includes(result.status)) {
          stopPolling();
          return;
        }

        // EXPIRED — record when we first saw it, and keep polling through
        // the grace window. If we've already been in EXPIRED for longer
        // than the grace, give up.
        if (result.status === "expired") {
          if (expiredAtRef.current === null) {
            expiredAtRef.current = Date.now();
          }
          const elapsed = Date.now() - expiredAtRef.current;
          if (elapsed >= LATE_SETTLEMENT_GRACE_MS) {
            stopPolling();
          }
          // else: keep polling — the late webhook may still fire.
        }
      } catch {
        // Network error — keep polling, the next tick may recover.
      }
    };

    // Poll immediately, then every 3s.
    void poll();
    pollIntervalRef.current = setInterval(poll, 3000);

    // Hard fallback timeout: 10 minutes (matches the QR claim TTL). If the
    // webhook hasn't fired by then, stop polling + the UI shows the
    // "still processing" state with a "check your history later" hint.
    // This is the offline upper bound — under normal conditions, polling
    // resolves within seconds of the commuter authorizing on PayMongo.
    const hardTimeout = setTimeout(() => {
      if (mounted) stopPolling();
    }, 10 * 60 * 1000);

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
            We&apos;re confirming your payment with PayMongo. This usually takes a few seconds.
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

  // ─── Expired but still waiting for late settlement ───
  // The QR's claim TTL lapsed, but the commuter may have completed PayMongo
  // checkout seconds before — PayMongo's webhook can still arrive and flip
  // the row EXPIRED→PAID. We keep polling for the grace window and show a
  // distinct amber state so the commuter understands what's happening.
  if (status === "expired") {
    return (
      <div className="min-h-screen bg-[#071A2E] flex items-center justify-center p-4">
        <div className="w-full max-w-sm bg-[#0E1628] border border-amber-500/20 rounded-2xl p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full border-4 border-amber-400 border-t-transparent animate-spin" />
          <h1 className="text-lg font-bold text-white mb-2">
            Waiting for PayMongo confirmation
          </h1>
          <p className="text-sm text-white/40 mb-4">
            The payment session timed out, but if you already authorized on PayMongo, your payment may still be confirmed shortly.
          </p>
          {transactionId && (
            <p className="text-[10px] text-white/20 font-mono mb-4">
              Ref: {transactionId}
            </p>
          )}
          {pollCount > 5 && (
            <p className="text-xs text-amber-400/60">
              Still listening for the late webhook… ({pollCount} attempts). Check your payment history if this continues.
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

/**
 * useSearchParams() opts a route into client-side rendering, which Next
 * requires to sit behind a Suspense boundary — without one the production
 * build fails to prerender this page. The fallback mirrors the page's own
 * loading state so the redirect back from GCash never flashes a blank screen.
 */
export default function GcashReturnPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#050F1A] flex flex-col items-center justify-center p-6">
          <div className="w-12 h-12 rounded-full border-2 border-white/15 border-t-[#62A0EA] animate-spin" />
          <p className="mt-4 text-sm text-white/50">Confirming your payment…</p>
        </div>
      }
    >
      <GcashReturnContent />
    </Suspense>
  );
}
