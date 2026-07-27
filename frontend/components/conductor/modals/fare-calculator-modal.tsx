"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { QRCodeSVG } from "qrcode.react";
import {
  loadFareMatrix,
  getPointAreas,
  getFareBetween as apiGetFareBetween,
  getBarangaysTraversed as apiGetBarangaysTraversed,
  getFareConfig,
  type PointArea,
} from "@/lib/shared/fare/fare-matrix.service";
import {
  formatCurrency,
  getCommuterTypeLabel,
  type CommuterType,
} from "@/lib/shared/fare/fare-calculator";
import { createTransaction } from "@/lib/conductor/services/transactions.service";
import {
  initiateGcash,
  fetchPendingGcash,
  fetchStatus,
  simulate as simulatePayment,
  cancelPayment,
  type GcashInitiation,
  type PaymentStatus as GcashPaymentStatus,
} from "@/lib/conductor/services/payment.service";
import type { PaymentMethodType } from "@/types";

interface FareCalcModalProps {
  isOpen: boolean;
  onClose: () => void;
  shiftId?: string;
  conductorName?: string;
  unitNumber?: string;
  driverName?: string;
}

/**
 * Step flow:
 * - Cash:  method → select (with commuter type + fare overview) → confirm → processing → success/failed
 * - GCash: method → select (locations only, NO fare) → qr_code → scan_result (fare breakdown after scan) → confirm → processing → success/failed
 */
type Step = "method" | "select" | "confirm" | "processing" | "qr_code" | "scan_result" | "success" | "failed";
type SelectedPaymentMethod = "GCash" | "Cash" | "Voucher";

export default function FareCalcModal({ isOpen, onClose, shiftId, conductorName, unitNumber, driverName }: FareCalcModalProps) {
  const [step, setStep] = useState<Step>("method");
  const [selectedMethod, setSelectedMethod] = useState<SelectedPaymentMethod | null>(null);
  const [pickupPoint, setPickupPoint] = useState<PointArea | null>(null);
  const [dropoffPoint, setDropoffPoint] = useState<PointArea | null>(null);
  const [commuterType, setCommuterType] = useState<CommuterType>("REGULAR");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectingField, setSelectingField] = useState<
    "pickup" | "dropoff" | null
  >("pickup");
  const [expandedBarangay, setExpandedBarangay] = useState<number | null>(null);
  const [pickupLandmark, setPickupLandmark] = useState<string | null>(null);
  const [dropoffLandmark, setDropoffLandmark] = useState<string | null>(null);

  // ── GCash real-API state ──
  // When the conductor initiates a GCash payment, we call the backend's
  // /conductor/payments/gcash/initiate endpoint which creates a PENDING
  // transaction + a qr_token + a PayMongo checkout URL. The qr_token is
  // rendered as a QR for the commuter to scan. We then poll the payment
  // status until it reaches a terminal state (PAID/FAILED/CANCELLED/EXPIRED)
  // or the QR's expires_at (claim TTL) passes.
  //
  // LATE-SETTLEMENT HANDLING:
  // EXPIRED is NOT immediately treated as terminal. After the row flips to
  // EXPIRED (lazy TTL expiry server-side), we keep polling for a grace
  // window (default 60s) because the commuter may have completed PayMongo
  // checkout seconds before the local expiry — PayMongo's webhook then
  // arrives late and the state machine's EXPIRED→PAID transition fires.
  // Only HARD-TERMINAL statuses (failed/cancelled/refunded) end polling
  // immediately. PAID always ends polling immediately. EXPIRED ends polling
  // only after the grace window elapses without a resolution.
  const [gcashInitiation, setGcashInitiation] = useState<GcashInitiation | null>(null);
  const [gcashStatus, setGcashStatus] = useState<GcashPaymentStatus | null>(null);
  const [gcashError, setGcashError] = useState<string | null>(null);
  const [isInitiatingGcash, setIsInitiatingGcash] = useState(false);
  /** Seconds until the displayed QR expires (drives the countdown badge). */
  const [qrSecondsLeft, setQrSecondsLeft] = useState<number | null>(null);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Timestamp (ms) when EXPIRED was first observed, or null if not yet seen. */
  const expiredAtRef = useRef<number | null>(null);
  /** One pending-resume check per modal open. */
  const checkedPendingRef = useRef(false);

  // ── Voucher state ──
  // When the conductor selects Voucher, they enter the voucher code shown
  // by the commuter. The backend validates it + creates a PAID/VOUCHER
  // transaction with final_amount=0 (free ride).
  const [voucherCode, setVoucherCode] = useState("");
  const [cashReceiptToken, setCashReceiptToken] = useState<string | null>(null);

  // GCash scan result state — kept for backwards compat with the existing
  // scan_result step UI. The commuter type is now detected by the backend
  // when the commuter claims the QR (passenger_name is bound server-side),
  // so the conductor UI no longer needs to simulate a scan.
  const [scannedCommuterType, setScannedCommuterType] = useState<CommuterType>("REGULAR");
  const [scannedCommuterName, setScannedCommuterName] = useState("Commuter");

  // ─── Fare Calculation (from the backend fare_points table via API) ───
  const fareInfo = useMemo(() => {
    if (!pickupPoint || !dropoffPoint) return null;

    const isDiscounted = commuterType !== "REGULAR";
    const barangaysTraveled = apiGetBarangaysTraversed(
      pickupPoint.pointNumber,
      dropoffPoint.pointNumber
    );
    const regularFare = apiGetFareBetween(
      pickupPoint.pointNumber,
      dropoffPoint.pointNumber,
      false
    );
    const discountedFare = apiGetFareBetween(
      pickupPoint.pointNumber,
      dropoffPoint.pointNumber,
      true
    );
    const finalFare = isDiscounted ? discountedFare : regularFare;
    const discountAmount = regularFare - discountedFare;
    const config = getFareConfig();
    const succeedingCount = Math.max(
      0,
      barangaysTraveled - config.baseBarangayCount
    );

    return {
      barangaysTraveled,
      regularFare,
      discountedFare,
      finalFare,
      hasDiscount: isDiscounted,
      discountAmount,
      succeedingCount,
      baseBarangayCount: config.baseBarangayCount,
    };
  }, [pickupPoint, dropoffPoint, commuterType]);

  // ─── Fare calculation for GCash after scan (uses scanned commuter type) ───
  const gcashFareInfo = useMemo(() => {
    if (!pickupPoint || !dropoffPoint) return null;

    const isDiscounted = scannedCommuterType !== "REGULAR";
    const barangaysTraveled = apiGetBarangaysTraversed(
      pickupPoint.pointNumber,
      dropoffPoint.pointNumber
    );
    const regularFare = apiGetFareBetween(
      pickupPoint.pointNumber,
      dropoffPoint.pointNumber,
      false
    );
    const discountedFare = apiGetFareBetween(
      pickupPoint.pointNumber,
      dropoffPoint.pointNumber,
      true
    );
    const finalFare = isDiscounted ? discountedFare : regularFare;
    const discountAmount = regularFare - discountedFare;
    const config = getFareConfig();
    const succeedingCount = Math.max(
      0,
      barangaysTraveled - config.baseBarangayCount
    );

    return {
      barangaysTraveled,
      regularFare,
      discountedFare,
      finalFare,
      hasDiscount: isDiscounted,
      discountAmount,
      succeedingCount,
      baseBarangayCount: config.baseBarangayCount,
    };
  }, [pickupPoint, dropoffPoint, scannedCommuterType]);

  const filteredPoints = searchQuery
    ? getPointAreas().filter(
        (p) =>
          p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.landmarks.some((l) =>
            l.toLowerCase().includes(searchQuery.toLowerCase())
          )
      )
    : getPointAreas();

  // ─── Save CASH/VOUCHER transaction to backend ───
  // Used for Cash + Voucher payments. GCash payments are created server-side
  // by initiateGcash() and finalized by the webhook.
  const recordTransaction = async (method: SelectedPaymentMethod, overrideFare?: { finalFare: number; regularFare: number; discountAmount: number; barangaysTraveled: number; succeedingCount: number }, overrideCommuterType?: CommuterType) => {
    if (!pickupPoint || !dropoffPoint || !shiftId) return;

    const fareData = overrideFare || fareInfo;
    if (!fareData) return;

    // GCash is handled by initiateGcash + the webhook flow — bail here.
    if (method === "GCash") return;

    const paymentMethodType: PaymentMethodType = method === "Voucher" ? "Voucher" : "Cash";
    const effectiveCommuterType = overrideCommuterType || commuterType;

    return createTransaction(shiftId, {
      paymentMethod: paymentMethodType,
      finalAmount: method === "Voucher" ? 0 : fareData.finalFare,
      passengerName: "Commuter",
      passengerId: "",
      passengerRole: effectiveCommuterType,
      from: pickupPoint.name,
      to: dropoffPoint.name,
      distance: fareData.barangaysTraveled,
      baseFare: fareData.regularFare,
      succeedingKm: fareData.succeedingCount,
      discountAmount: fareData.discountAmount,
      conductorName: conductorName || "—",
      unitNumber: unitNumber || "—",
      driverName: driverName || "—",
      voucherCode: method === "Voucher" ? voucherCode.trim() : undefined,
    });
  };

  // ─── Stop polling helper ───
  const stopPolling = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
    if (pollTimeoutRef.current) {
      clearTimeout(pollTimeoutRef.current);
      pollTimeoutRef.current = null;
    }
    expiredAtRef.current = null;
  }, []);

  // ─── Poll GCash payment status until terminal ───
  // Polls GET /api/payments/{id}/status every 3s. Stops when the status
  // reaches a hard-terminal state (paid/failed/cancelled/refunded) or when
  // the QR's expires_at passes AND the late-settlement grace window elapses
  // without resolution. The status endpoint lazily flips stale PENDING rows
  // to EXPIRED; EXPIRED itself is NOT treated as terminal because the
  // commuter may have completed PayMongo checkout seconds before the local
  // expiry, and the late webhook can still flip EXPIRED→PAID. We keep
  // polling for a 60s grace window after EXPIRED first appears.
  //
  // The backend also broadcasts a PaymentStatusUpdated event on the
  // payments.{transactionId} channel — a Pusher listener could replace this
  // polling, but polling is the reliable fallback without Pusher configured.
  const pollGcashStatus = useCallback((transactionId: string, expiresAt?: string) => {
    stopPolling();

    // HARD-TERMINAL statuses end polling immediately. EXPIRED is deliberately
    // excluded — it goes through the grace-window logic below.
    const HARD_TERMINAL: GcashPaymentStatus[] = ["paid", "failed", "cancelled", "refunded"];

    // Grace window after EXPIRED is first observed (server-side default: 60s).
    // The commuter may have authorized on PayMongo just before the local TTL
    // lapsed — the webhook arrives late and flips EXPIRED→PAID. We keep
    // polling through this window to surface that resolution.
    const LATE_SETTLEMENT_GRACE_MS = 60 * 1000;

    pollIntervalRef.current = setInterval(async () => {
      try {
        const status = await fetchStatus(transactionId);
        setGcashStatus(status);

        // PAID is always terminal — success regardless of prior EXPIRED state.
        if (status === "paid") {
          stopPolling();
          setStep("success");
          return;
        }

        // Hard-terminal failure statuses end immediately.
        if (HARD_TERMINAL.includes(status)) {
          stopPolling();
          setGcashError(`Payment ${status}.`);
          setStep("failed");
          return;
        }

        // EXPIRED — record when we first saw it, and keep polling through
        // the grace window. If we've already been in EXPIRED for longer
        // than the grace, give up.
        if (status === "expired") {
          if (expiredAtRef.current === null) {
            expiredAtRef.current = Date.now();
          }
          const elapsed = Date.now() - expiredAtRef.current;
          if (elapsed >= LATE_SETTLEMENT_GRACE_MS) {
            stopPolling();
            setGcashError(
              "This QR code has expired. If the commuter already paid on PayMongo, the late webhook may still settle the transaction — check your transaction history in a minute."
            );
            setStep("failed");
          }
          // else: keep polling — the late webhook may still fire.
        }
      } catch {
        // Network error — keep polling, the next tick may recover.
        // The hard fallback timeout below will eventually bail out.
      }
    }, 3000);

    // Hard fallback timeout derived from the QR's expires_at (+ grace window
    // + 30s buffer so the server-side lazy expiry via polling normally wins,
    // AND the late-settlement grace runs to completion, AND a delayed
    // PayMongo webhook has time to land). If expires_at is unavailable,
    // fall back to the 10-minute TTL.
    const msUntilExpiry = expiresAt
      ? new Date(expiresAt).getTime() - Date.now()
      : 10 * 60 * 1000;
    pollTimeoutRef.current = setTimeout(() => {
      stopPolling();
      setGcashError(
        "This QR code has expired. If the commuter already paid on PayMongo, the late webhook may still settle the transaction — check your transaction history in a minute."
      );
      setGcashStatus("expired");
      setStep("failed");
    }, Math.max(10_000, msUntilExpiry + LATE_SETTLEMENT_GRACE_MS + 30_000));
  }, [stopPolling]);

  // ─── Initiate GCash payment (real API) ───
  // Called when the conductor confirms the GCash fare. Calls the backend's
  // /conductor/payments/gcash/initiate endpoint, which creates a PENDING
  // transaction + qr_token + PayMongo checkout URL. We then move to the
  // qr_code step to display the qr_token for the commuter to scan.
  const handleInitiateGcash = async () => {
    if (!pickupPoint || !dropoffPoint) return;

    setIsInitiatingGcash(true);
    setGcashError(null);
    setGcashStatus(null);
    setGcashInitiation(null);

    try {
      // Compute the regular fare (no discount yet — the commuter's type is
      // detected server-side when they claim the QR). The backend stores
      // this as the initial final_amount; if the commuter is discounted,
      // the webhook path could adjust it (currently it doesn't — the fare
      // is fixed at initiation time).
      const regularFare = apiGetFareBetween(pickupPoint.pointNumber, dropoffPoint.pointNumber, false);
      const barangaysTraveled = apiGetBarangaysTraversed(pickupPoint.pointNumber, dropoffPoint.pointNumber);

      const initiation = await initiateGcash({
        finalAmount: regularFare,
        from: pickupPoint.name,
        to: dropoffPoint.name,
        baseFare: regularFare,
        distance: barangaysTraveled,
        discountAmount: 0,
      });

      setGcashInitiation(initiation);
      setStep("qr_code");

      // Start polling for the payment status. The commuter will scan the QR,
      // claim the transaction, redirect to PayMongo, authorize, and the
      // webhook will flip the status to PAID — which we detect via polling.
      // Note: if a fresh PENDING payment already exists for this shift, the
      // backend returns THAT one (same QR) instead of minting a duplicate.
      pollGcashStatus(initiation.transactionId, initiation.expiresAt);
    } catch (err) {
      setGcashError(err instanceof Error ? err.message : "Failed to start GCash payment. Please try again.");
      setStep("failed");
    } finally {
      setIsInitiatingGcash(false);
    }
  };

  // ─── DEV ONLY: Simulate the commuter paying (for testing without PayMongo) ───
  // Calls POST /api/payments/{id}/simulate { status: "PAID" } which feeds
  // through the same webhook/state-machine path as a real PayMongo webhook.
  // Disabled server-side when payments.allow_simulation is false.
  const handleSimulatePayment = async () => {
    if (!gcashInitiation) return;
    try {
      await simulatePayment(gcashInitiation.transactionId, "PAID");
      // The poll loop will pick up the PAID status on the next tick (≤3s).
      // No need to manually flip the step here.
    } catch (err) {
      setGcashError(err instanceof Error ? err.message : "Simulation failed.");
    }
  };

  // ─── Cancel the GCash payment ───
  // Called when the conductor clicks "Cancel Payment" on the QR step.
  // Transitions the PENDING transaction to CANCELLED through the backend
  // state machine, stops polling, and returns to the method selection step.
  const handleCancelGcash = async () => {
    if (!gcashInitiation) return;
    stopPolling();
    try {
      await cancelPayment(gcashInitiation.transactionId);
    } catch {
      // Even if the cancel API fails (e.g. already expired), we still
      // reset the UI — the 5-minute TTL will eventually clean it up.
    }
    setGcashInitiation(null);
    setGcashStatus(null);
    setGcashError(null);
    setStep("method");
    setSelectedMethod(null);
  };

  const handlePayWithCash = async () => {
    if (!fareInfo || !pickupPoint || !dropoffPoint) return;

    setStep("processing");

    // Cash payment: brief processing (just recording), then success
    await new Promise((r) => setTimeout(r, 800));

    const transaction = await recordTransaction("Cash");
    setCashReceiptToken(transaction?.receiptQrToken ?? null);
    setStep("success");
  };

  // ─── Voucher payment ───
  // The conductor enters the voucher code shown by the commuter. The backend
  // validates it + creates a PAID/VOUCHER transaction with final_amount=0.
  const handlePayWithVoucher = async () => {
    if (!fareInfo || !pickupPoint || !dropoffPoint) return;
    if (!voucherCode.trim()) {
      setGcashError("Please enter the voucher code.");
      setStep("failed");
      return;
    }

    setStep("processing");

    try {
      await recordTransaction("Voucher");
      setStep("success");
    } catch (err) {
      setGcashError(err instanceof Error ? err.message : "Voucher validation failed.");
      setStep("failed");
    }
  };

  const handleConfirmPayment = () => {
    if (selectedMethod === "GCash") {
      // GCash: initiate the real backend flow (creates PENDING txn + qr_token).
      handleInitiateGcash();
    } else if (selectedMethod === "Voucher") {
      handlePayWithVoucher();
    } else {
      handlePayWithCash();
    }
  };

  // ─── Handle locations selected in GCash mode ────────────────────
  // After selecting pickup & dropoff for GCash, go to the confirm step.
  // The conductor confirms the fare, then handleInitiateGcash() calls the
  // backend to create the PENDING transaction + qr_token, and we move to
  // the qr_code step to display the QR for the commuter to scan.
  const handleGCashLocationsSelected = () => {
    setStep("confirm");
  };

  // ─── Color state logic ──────────────────────────────────────────
  // Default: GREEN for pickup & dropoff
  // Special: VIOLET/PURPLE when pickup == dropoff (same barangay)
  const isSameBarangay = !!(pickupPoint && dropoffPoint && pickupPoint.pointNumber === dropoffPoint.pointNumber);

  const pickupColor = isSameBarangay ? "violet" : "green";
  const dropoffColor = isSameBarangay ? "violet" : "green";

  // Color utility classes for pickup/dropoff indicators
  const pickupDotClass = isSameBarangay ? "bg-violet-500" : "bg-emerald-500";
  const dropoffDotClass = isSameBarangay ? "bg-violet-500" : "bg-emerald-500";
  const pickupBorderClass = isSameBarangay ? "border-violet-500/50 bg-violet-500/10" : "border-emerald-500/50 bg-emerald-500/10";
  const dropoffBorderClass = isSameBarangay ? "border-violet-500/50 bg-violet-500/10" : "border-emerald-500/50 bg-emerald-500/10";
  const pickupBadgeClass = isSameBarangay ? "text-violet-400 bg-violet-500/10" : "text-emerald-400 bg-emerald-500/10";
  const dropoffBadgeClass = isSameBarangay ? "text-violet-400 bg-violet-500/10" : "text-emerald-400 bg-emerald-500/10";
  const pickupTagClass = isSameBarangay ? "bg-violet-500 text-white" : "bg-emerald-500 text-white";
  const dropoffTagClass = isSameBarangay ? "bg-violet-500 text-white" : "bg-emerald-500 text-white";
  const pickupLabelClass = isSameBarangay ? "text-violet-400" : "text-emerald-400";
  const dropoffLabelClass = isSameBarangay ? "text-violet-400" : "text-emerald-400";

  // ─── Clear location handlers (only reset location, NOT payment) ──
  const clearPickup = () => {
    setPickupPoint(null);
    setPickupLandmark(null);
    setSelectingField("pickup");
    // Collapse expanded barangay if it belonged to the cleared pickup
    if (expandedBarangay === pickupPoint?.pointNumber) {
      setExpandedBarangay(null);
    }
  };

  const clearDropoff = () => {
    setDropoffPoint(null);
    setDropoffLandmark(null);
    setSelectingField("dropoff");
    // Collapse expanded barangay if it belonged to the cleared dropoff
    if (expandedBarangay === dropoffPoint?.pointNumber) {
      setExpandedBarangay(null);
    }
  };

  // ─── RESET STATE & CLOSE ──────────────────────────────────────
  const handleClose = () => {
    // Stop any in-flight GCash status polling before closing.
    stopPolling();

    setStep("method");
    setSelectedMethod(null);
    setPickupPoint(null);
    setDropoffPoint(null);
    setPickupLandmark(null);
    setDropoffLandmark(null);
    setCommuterType("REGULAR");
    setSearchQuery("");
    setSelectingField("pickup");
    setExpandedBarangay(null);
    setGcashInitiation(null);
    setGcashStatus(null);
    setGcashError(null);
    setIsInitiatingGcash(false);
    setScannedCommuterType("REGULAR");
    setScannedCommuterName("Commuter");
    setVoucherCode("");
    setCashReceiptToken(null);
    onClose();
  };

  // ─── Stop polling when the modal unmounts (e.g. user navigates away) ───
  useEffect(() => {
    return () => {
      stopPolling();
    };
  }, [stopPolling]);

  // ─── Resume an interrupted GCash payment when the modal opens ───
  // If the conductor left the payment screen (navigation, refresh) while a
  // GCash transaction was still PENDING, re-display the SAME QR + details
  // instead of letting them mint a duplicate. The backend lazily expires
  // stale rows, so a resumable result is always still claimable.
  useEffect(() => {
    if (!isOpen) {
      checkedPendingRef.current = false;
      return;
    }
    if (checkedPendingRef.current) return;
    checkedPendingRef.current = true;

    void (async () => {
      try {
        const pending = await fetchPendingGcash();
        if (!pending) return;

        setSelectedMethod("GCash");
        setGcashInitiation(pending);
        setGcashStatus(null);
        setGcashError(null);
        setStep("qr_code");
        pollGcashStatus(pending.transactionId, pending.expiresAt);
      } catch {
        // Couldn't check (offline, etc.) — proceed with the normal flow;
        // initiate() still reuses the pending transaction server-side.
      }
    })();
  }, [isOpen, pollGcashStatus]);

  // ─── Countdown until the displayed QR expires ───
  useEffect(() => {
    if (step !== "qr_code" || !gcashInitiation) {
      setQrSecondsLeft(null);
      return;
    }
    const expiryMs = new Date(gcashInitiation.expiresAt).getTime();
    const tick = () => {
      setQrSecondsLeft(Math.max(0, Math.floor((expiryMs - Date.now()) / 1000)));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [step, gcashInitiation]);

  // ─── Auto-expand landmark when switching selectingField ────────
  // When the user clicks the pickup/dropoff card to re-select,
  // automatically expand the corresponding barangay's landmarks
  // so they can directly pick a landmark without the extra click.
  useEffect(() => {
    if (step !== "select") return;
    if (selectingField === "pickup" && pickupPoint && pickupPoint.landmarks.length > 0) {
      setExpandedBarangay(pickupPoint.pointNumber);
    } else if (selectingField === "dropoff" && dropoffPoint && dropoffPoint.landmarks.length > 0) {
      setExpandedBarangay(dropoffPoint.pointNumber);
    }
  }, [selectingField, step, pickupPoint, dropoffPoint]);

  // ─── Load the fare matrix from the backend on first open ───
  // The fare points + config come from GET /api/fare-matrix (the backend's
  // fare_points table — the single source of truth). Falls back to the
  // hardcoded data if the API is unreachable. Cached for the session.
  useEffect(() => {
    if (isOpen) {
      void loadFareMatrix();
    }
  }, [isOpen]);

  // ─── HIDDEN UNTIL CLICKED ──────────────────────────────────────
  if (!isOpen) return null;

  // ─── STEP: Payment Method Selection ────────────────────────────

  if (step === "method") {
    return (
      <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4">
        <div className="w-full sm:max-w-md bg-[#071A2E] sm:rounded-2xl rounded-t-2xl border border-white/10 shadow-2xl">
          {/* Header */}
          <div className="p-5 border-b border-white/10">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">Collect Payment</h2>
              <button
                onClick={handleClose}
                className="text-white/40 hover:text-white transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <p className="text-sm text-white/40 mt-1">Choose how the commuter is paying</p>
          </div>

          {/* Method Options */}
          <div className="p-5 space-y-3">
            {/* Cash Option */}
            <button
              onClick={() => {
                setSelectedMethod("Cash");
                setStep("select");
              }}
              className="w-full text-left p-4 rounded-xl border border-white/10 bg-white/5 hover:bg-emerald-500/10 hover:border-emerald-500/30 transition-all duration-200 group"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center flex-shrink-0 group-hover:bg-emerald-500/25 transition-colors">
                  <svg className="w-6 h-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-white font-bold text-sm group-hover:text-emerald-300 transition-colors">Cash Payment</h3>
                  <p className="text-[11px] text-white/40 mt-0.5 leading-relaxed">Collect physical cash from the commuter and record the transaction</p>
                </div>
                <svg className="w-5 h-5 text-white/20 group-hover:text-emerald-400 transition-colors flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                </svg>
              </div>
            </button>

            {/* GCash Option */}
            <button
              onClick={() => {
                setSelectedMethod("GCash");
                setStep("select");
              }}
              className="w-full text-left p-4 rounded-xl border border-white/10 bg-white/5 hover:bg-blue-500/10 hover:border-blue-500/30 transition-all duration-200 group"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-blue-500/15 border border-blue-500/20 flex items-center justify-center flex-shrink-0 group-hover:bg-blue-500/25 transition-colors">
                  <svg className="w-6 h-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 0 0 6 3.75v16.5a2.25 2.25 0 0 0 2.25 2.25h7.5A2.25 2.25 0 0 0 18 20.25V3.75a2.25 2.25 0 0 0-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-white font-bold text-sm group-hover:text-blue-300 transition-colors">GCash Payment</h3>
                  <p className="text-[11px] text-white/40 mt-0.5 leading-relaxed">Digital payment via GCash — commuter scans QR to pay from their account</p>
                </div>
                <svg className="w-5 h-5 text-white/20 group-hover:text-blue-400 transition-colors flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                </svg>
              </div>
            </button>

            {/* Voucher Option */}
            <button
              onClick={() => {
                setSelectedMethod("Voucher");
                setStep("select");
              }}
              className="w-full text-left p-4 rounded-xl border border-white/10 bg-white/5 hover:bg-violet-500/10 hover:border-violet-500/30 transition-all duration-200 group"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-violet-500/15 border border-violet-500/20 flex items-center justify-center flex-shrink-0 group-hover:bg-violet-500/25 transition-colors">
                  <svg className="w-6 h-6 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 11.25v8.25a1.5 1.5 0 0 1-1.5 1.5H5.25a1.5 1.5 0 0 1-1.5-1.5v-8.25M12 4.875A2.625 2.625 0 1 0 9.375 7.5H12m0-2.625V7.5m0-2.625A2.625 2.625 0 1 1 14.625 7.5H12m0 0V21m-8.625-9.75h18c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125h-18c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-white font-bold text-sm group-hover:text-violet-300 transition-colors">Voucher / Free Ride</h3>
                  <p className="text-[11px] text-white/40 mt-0.5 leading-relaxed">Commuter shows their reward voucher code — enter it to apply a free ride</p>
                </div>
                <svg className="w-5 h-5 text-white/20 group-hover:text-violet-400 transition-colors flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                </svg>
              </div>
            </button>
          </div>

          {/* Footer info */}
          <div className="px-5 pb-5">
            <p className="text-[10px] text-white/20 leading-relaxed text-center">
              Both methods will be recorded in the shift transaction log for end-of-day remittance.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ─── STEP: Point Area Selection (FULLSCREEN LOCATION PICKER) ──────

  if (step === "select") {
    // For GCash: no fare display, no commuter type selector
    // For Cash: full existing flow with commuter type + fare overview
    const isGCash = selectedMethod === "GCash";
    const bothLocationsSelected = !!(pickupPoint && dropoffPoint);

    return (
      <div className="fixed inset-0 z-[100] flex flex-col bg-[#050F1A] safe-area-inset sm:items-center sm:justify-center sm:bg-black/60 sm:backdrop-blur-sm sm:p-4">
        <div className="flex flex-col h-full w-full max-w-lg mx-auto sm:h-auto sm:max-h-[85vh] sm:rounded-2xl sm:border sm:border-white/10 sm:bg-[#050F1A] sm:shadow-2xl sm:overflow-hidden">
          {/* ── Fullscreen Header ── */}
          <div className="flex-shrink-0 bg-[#071A2E] border-b border-white/10 pt-safe">
            {/* Top bar: back + title + method badge + close */}
            <div className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-2 min-w-0">
                <button
                  onClick={() => setStep("method")}
                  className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-colors flex-shrink-0"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
                  </svg>
                </button>
                <h2 className="text-base sm:text-lg font-bold text-white truncate">Select Location</h2>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {/* Method badge — preserves payment state visibility */}
                <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${
                  selectedMethod === "GCash"
                    ? "bg-blue-500/15 text-blue-400 border border-blue-500/25"
                    : "bg-emerald-500/15 text-emerald-400 border border-emerald-500/25"
                }`}>
                  {selectedMethod}
                </span>
                <button
                  onClick={handleClose}
                  className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* ── Pickup & Dropoff Cards with Clear Buttons ── */}
            <div className="px-4 pb-3 space-y-2.5">
              {/* Pickup Card */}
              <div className="relative">
                <button
                  onClick={() => setSelectingField("pickup")}
                  className={`w-full text-left p-3 rounded-xl border transition-all duration-200 pr-9 ${
                    selectingField === "pickup"
                      ? pickupBorderClass + " border"
                      : pickupPoint
                        ? "border-white/10 bg-white/5"
                        : "border-white/10 bg-white/5"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${pickupPoint ? pickupDotClass + ' shadow-sm' : 'bg-white/20'}`} />
                    <span className="text-[10px] font-semibold text-white/40 uppercase tracking-wider">
                      Pickup
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-1 ml-[18px]">
                    <span className={`text-sm font-medium ${pickupPoint ? 'text-white' : 'text-white/30'}`}>
                      {pickupPoint
                        ? pickupLandmark
                          ? `${pickupPoint.name} · ${pickupLandmark}`
                          : pickupPoint.name
                        : "Select pickup location"}
                    </span>
                    {pickupPoint && (
                      <span className={`text-[10px] ${pickupBadgeClass} px-2 py-0.5 rounded-full ml-2 flex-shrink-0`}>
                        Brgy {pickupPoint.pointNumber}
                      </span>
                    )}
                  </div>
                </button>
                {/* Clear Pickup Button (X) */}
                {pickupPoint && (
                  <button
                    onClick={(e) => { e.stopPropagation(); clearPickup(); }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/30 hover:text-white hover:bg-red-500/20 hover:border-red-500/30 transition-colors"
                    title="Clear pickup"
                  >
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>

              {/* Swap icon */}
              <div className="flex justify-center">
                <button
                  onClick={() => {
                    if (pickupPoint && dropoffPoint) {
                      const tmpPoint = pickupPoint;
                      const tmpLandmark = pickupLandmark;
                      setPickupPoint(dropoffPoint);
                      setPickupLandmark(dropoffLandmark);
                      setDropoffPoint(tmpPoint);
                      setDropoffLandmark(tmpLandmark);
                    }
                  }}
                  className="w-7 h-7 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors"
                >
                  <svg className="w-3.5 h-3.5 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21 3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
                  </svg>
                </button>
              </div>

              {/* Dropoff Card */}
              <div className="relative">
                <button
                  onClick={() => setSelectingField("dropoff")}
                  className={`w-full text-left p-3 rounded-xl border transition-all duration-200 pr-9 ${
                    selectingField === "dropoff"
                      ? dropoffBorderClass + " border"
                      : dropoffPoint
                        ? "border-white/10 bg-white/5"
                        : "border-white/10 bg-white/5"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${dropoffDotClass} ${dropoffPoint ? 'shadow-sm' : 'bg-white/20'}`} />
                    <span className="text-[10px] font-semibold text-white/40 uppercase tracking-wider">
                      Drop-off
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-1 ml-[18px]">
                    <span className={`text-sm font-medium ${dropoffPoint ? 'text-white' : 'text-white/30'}`}>
                      {dropoffPoint
                        ? dropoffLandmark
                          ? `${dropoffPoint.name} · ${dropoffLandmark}`
                          : dropoffPoint.name
                        : "Select drop-off location"}
                    </span>
                    {dropoffPoint && (
                      <span className={`text-[10px] ${dropoffBadgeClass} px-2 py-0.5 rounded-full ml-2 flex-shrink-0`}>
                        Brgy {dropoffPoint.pointNumber}
                      </span>
                    )}
                  </div>
                </button>
                {/* Clear Dropoff Button (X) */}
                {dropoffPoint && (
                  <button
                    onClick={(e) => { e.stopPropagation(); clearDropoff(); }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/30 hover:text-white hover:bg-red-500/20 hover:border-red-500/30 transition-colors"
                    title="Clear drop-off"
                  >
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>

              {/* Same barangay warning */}
              {isSameBarangay && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-violet-500/10 border border-violet-500/20">
                  <div className="w-2 h-2 rounded-full bg-violet-400 animate-pulse flex-shrink-0" />
                  <span className="text-[10px] text-violet-300 font-medium">Same pickup & drop-off — both locations shown in violet</span>
                </div>
              )}

              {/* Commuter Type — ONLY shown for Cash payments */}
              {!isGCash && (
                <div className="mt-1">
                  <span className="text-[10px] font-semibold text-white/40 uppercase tracking-wider">
                    Commuter Type
                  </span>
                  <div className="flex gap-1.5 mt-1.5 overflow-x-auto pb-1 -mx-1 px-1">
                    {(
                      ["REGULAR", "STUDENT", "SENIOR_CITIZEN", "PWD"] as CommuterType[]
                    ).map((type) => (
                      <button
                        key={type}
                        onClick={() => setCommuterType(type)}
                        className={`px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-colors whitespace-nowrap flex-shrink-0 ${
                          commuterType === type
                            ? "bg-[#1A5FB4] text-white"
                            : "bg-white/5 text-white/50 hover:bg-white/10"
                        }`}
                      >
                        {getCommuterTypeLabel(type)}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── Search Bar ── */}
          <div className="flex-shrink-0 px-4 pt-3 pb-2 bg-[#050F1A]">
            <div className="relative">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
                />
              </svg>
              <input
                type="text"
                placeholder="Search barangay or landmark..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-emerald-500/50 transition-colors"
              />
            </div>
            <p className="text-[10px] text-white/30 mt-2">
              {selectingField === "pickup"
                ? "Tap your boarding barangay — then select a landmark"
                : "Tap your drop-off barangay — then select a landmark"}
              {" "}&middot; Auto-opens after selection
            </p>
          </div>

          {/* ── Barangay List (fills remaining space) ── */}
          <div className="flex-1 min-h-0 overflow-y-auto px-4 pb-3 overscroll-contain">
            {filteredPoints.map((point) => {
              const isPickup = pickupPoint?.pointNumber === point.pointNumber;
              const isDropoff = dropoffPoint?.pointNumber === point.pointNumber;
              const isSelected = isPickup || isDropoff;
              const isExpanded = expandedBarangay === point.pointNumber;

              // Color classes for barangay list items (green default, violet when same)
              const itemPickupBg = isSameBarangay ? "bg-violet-500/15 border-violet-500/40" : "bg-emerald-500/15 border-emerald-500/40";
              const itemDropoffBg = isSameBarangay ? "bg-violet-500/15 border-violet-500/40" : "bg-emerald-500/15 border-emerald-500/40";
              const itemBothBg = "bg-violet-500/20 border-violet-500/40";
              const itemPickupTag = isSameBarangay ? pickupTagClass : pickupTagClass;
              const itemDropoffTag = isSameBarangay ? dropoffTagClass : dropoffTagClass;
              const itemPickupLabel = isSameBarangay ? pickupLabelClass : pickupLabelClass;
              const itemDropoffLabel = isSameBarangay ? dropoffLabelClass : dropoffLabelClass;

              return (
                <div key={point.pointNumber} className="mb-1">
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => {
                      if (selectingField === "pickup") {
                        setPickupPoint(point);
                        setPickupLandmark(null);
                        if (point.landmarks.length > 0) {
                          setExpandedBarangay(point.pointNumber);
                        } else {
                          setSelectingField("dropoff");
                        }
                      } else {
                        setDropoffPoint(point);
                        setDropoffLandmark(null);
                        if (point.landmarks.length > 0) {
                          setExpandedBarangay(point.pointNumber);
                        }
                      }
                      setSearchQuery("");
                    }}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); (e.target as HTMLElement).click(); } }}
                    className={`w-full text-left p-3 rounded-xl transition-colors cursor-pointer border ${
                      isSelected
                        ? isPickup && isDropoff
                          ? itemBothBg
                          : isPickup
                            ? itemPickupBg
                            : itemDropoffBg
                        : "border-white/[0.04] hover:bg-white/[0.04]"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="flex flex-col items-center flex-shrink-0">
                          <span className="text-[9px] font-bold text-white/25 leading-none">PT</span>
                          <span className="text-sm font-bold text-white/60 leading-none mt-0.5">{point.pointNumber}</span>
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-semibold text-white truncate">{point.name}</span>
                            <span className="text-[9px] font-semibold text-white/20 flex-shrink-0">Brgy {point.pointNumber}</span>
                          </div>
                          {point.landmarks.length > 0 && (
                            <p className="text-[10px] text-white/30 mt-0.5 truncate">
                              {point.landmarks.join(" · ")}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
                        {isPickup && (
                          <span className={`text-[8px] font-bold ${itemPickupLabel} ${pickupTagClass} px-1.5 py-0.5 rounded`}>PICKUP</span>
                        )}
                        {isDropoff && (
                          <span className={`text-[8px] font-bold ${itemDropoffLabel} ${dropoffTagClass} px-1.5 py-0.5 rounded`}>DROP-OFF</span>
                        )}

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandedBarangay(isExpanded ? null : point.pointNumber);
                          }}
                          className="w-7 h-7 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors"
                        >
                          <svg
                            className={`w-3.5 h-3.5 text-white/40 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="m19.5 8.25-7.5 7.5-7.5-7.5"
                            />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Expanded landmarks */}
                  {isExpanded && (
                    <div className="ml-11 mt-1 mb-2 space-y-1">
                      <p className="text-[10px] text-white/20 uppercase tracking-wider font-medium mb-1.5">
                        Landmarks in {point.name} <span className="text-white/10">· tap to select</span>
                      </p>
                      {/* Skip landmark button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (selectingField === "pickup") {
                            setSelectingField("dropoff");
                          }
                          setExpandedBarangay(null);
                        }}
                        className="flex items-center gap-2 px-2 py-1.5 rounded-md w-full text-left transition-colors border cursor-pointer bg-white/[0.02] border-transparent hover:bg-amber-500/5 hover:border-amber-500/20"
                      >
                        <div className="w-1.5 h-1.5 rounded-full bg-amber-400/50" />
                        <span className="text-[11px] text-amber-400/70">
                          Skip landmark (use barangay only)
                        </span>
                      </button>
                      {point.landmarks.map((landmark, idx) => {
                        const isLandmarkPickup = pickupPoint?.pointNumber === point.pointNumber && pickupLandmark === landmark;
                        const isLandmarkDropoff = dropoffPoint?.pointNumber === point.pointNumber && dropoffLandmark === landmark;
                        const isLandmarkSelected = isLandmarkPickup || isLandmarkDropoff;

                        // Landmark color classes with green/violet logic
                        const lmPickupBgCls = isSameBarangay ? "bg-violet-500/10 border-violet-500/30" : "bg-emerald-500/10 border-emerald-500/30";
                        const lmDropoffBgCls = isSameBarangay ? "bg-violet-500/10 border-violet-500/30" : "bg-emerald-500/10 border-emerald-500/30";
                        const lmPickupDotCls = isSameBarangay ? "bg-violet-400" : "bg-emerald-400";
                        const lmDropoffDotCls = isSameBarangay ? "bg-violet-400" : "bg-emerald-400";
                        const lmPickupTextCls = isSameBarangay ? "text-violet-400" : "text-emerald-400";
                        const lmDropoffTextCls = isSameBarangay ? "text-violet-400" : "text-emerald-400";

                        return (
                          <div
                            role="button"
                            tabIndex={0}
                            key={idx}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (selectingField === "pickup") {
                                if (pickupPoint?.pointNumber !== point.pointNumber) {
                                  setPickupPoint(point);
                                }
                                setPickupLandmark(landmark);
                                setSelectingField("dropoff");
                              } else {
                                if (dropoffPoint?.pointNumber !== point.pointNumber) {
                                  setDropoffPoint(point);
                                }
                                setDropoffLandmark(landmark);
                              }
                              setExpandedBarangay(null);
                            }}
                            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); (e.target as HTMLElement).click(); } }}
                            className={`flex items-center gap-2 px-2 py-1.5 rounded-md w-full text-left transition-colors border cursor-pointer ${
                              isLandmarkSelected
                                ? isLandmarkPickup && isLandmarkDropoff
                                  ? "bg-violet-500/15 border-violet-500/30"
                                  : isLandmarkPickup
                                    ? lmPickupBgCls
                                    : lmDropoffBgCls
                                : "bg-white/[0.02] border-transparent hover:bg-white/5"
                            }`}
                          >
                            <div className={`w-1.5 h-1.5 rounded-full ${
                              isLandmarkSelected
                                ? isLandmarkPickup ? lmPickupDotCls : lmDropoffDotCls
                                : "bg-white/20"
                            }`} />
                            <span className={`text-[11px] ${
                              isLandmarkSelected
                                ? isLandmarkPickup ? lmPickupTextCls : lmDropoffTextCls
                                : "text-white/40"
                            }`}>
                              {landmark}
                            </span>
                            {isLandmarkPickup && !isLandmarkDropoff && (
                              <span className={`text-[8px] font-bold ${lmPickupTextCls} bg-white/5 px-1 py-0.5 rounded ml-auto`}>PICKUP</span>
                            )}
                            {isLandmarkDropoff && !isLandmarkPickup && (
                              <span className={`text-[8px] font-bold ${lmDropoffTextCls} bg-white/5 px-1 py-0.5 rounded ml-auto`}>DROP-OFF</span>
                            )}
                            {isLandmarkPickup && isLandmarkDropoff && (
                              <span className="text-[8px] font-bold text-violet-400 bg-violet-500/10 px-1 py-0.5 rounded ml-auto">BOTH</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* ── Bottom Action Area ── */}
          {/* GCash mode: Show "Generate QR Code" button when both locations selected, NO fare display */}
          {isGCash && bothLocationsSelected && (
            <div className="flex-shrink-0 p-4 border-t border-white/10 bg-[#050F1A] pb-safe">
              {/* Route confirmation only, NO fare */}
              <div className="mb-3 flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-1.5">
                  <div className={`w-2.5 h-2.5 rounded-full ${pickupDotClass}`} />
                  <span className="text-xs text-white/70 font-medium">{pickupPoint?.name}{pickupLandmark ? ` · ${pickupLandmark}` : ""}</span>
                </div>
                <svg className="w-3 h-3 text-white/20 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                </svg>
                <div className="flex items-center gap-1.5">
                  <div className={`w-2.5 h-2.5 rounded-full ${dropoffDotClass}`} />
                  <span className="text-xs text-white/70 font-medium">{dropoffPoint?.name}{dropoffLandmark ? ` · ${dropoffLandmark}` : ""}</span>
                </div>
              </div>

              <button
                onClick={handleGCashLocationsSelected}
                className="w-full py-3.5 rounded-xl font-bold text-sm transition-colors shadow-lg active:scale-[0.98] bg-[#1A5FB4] hover:bg-[#164A8F] text-white shadow-[#1A5FB4]/30"
              >
                Generate QR Code
              </button>
              <p className="text-[10px] text-white/25 text-center mt-2">
                Fare will be calculated after the commuter scans the QR code
              </p>
            </div>
          )}

          {/* Cash mode: Show fare summary & pay button (existing behavior) */}
          {!isGCash && fareInfo && (
            <div className="flex-shrink-0 p-4 border-t border-white/10 bg-[#050F1A] pb-safe">
              {/* Route confirmation with dynamic color indicators */}
              <div className="mb-2 flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-1.5">
                  <div className={`w-2.5 h-2.5 rounded-full ${pickupDotClass}`} />
                  <span className="text-xs text-white/70 font-medium">{pickupPoint?.name}{pickupLandmark ? ` · ${pickupLandmark}` : ""}</span>
                </div>
                <svg className="w-3 h-3 text-white/20 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                </svg>
                <div className="flex items-center gap-1.5">
                  <div className={`w-2.5 h-2.5 rounded-full ${dropoffDotClass}`} />
                  <span className="text-xs text-white/70 font-medium">{dropoffPoint?.name}{dropoffLandmark ? ` · ${dropoffLandmark}` : ""}</span>
                </div>
              </div>

              {/* Fare Explanation */}
              <div className="mb-3 px-3 py-2 rounded-lg bg-white/[0.03] border border-white/5">
                <p className="text-[10px] text-white/30 leading-relaxed">
                  {fareInfo.barangaysTraveled} barangay{fareInfo.barangaysTraveled !== 1 ? "s" : ""} traversed
                  {fareInfo.succeedingCount > 0 &&
                    ` · Base fare covers first ${fareInfo.baseBarangayCount} + ${fareInfo.succeedingCount} succeeding`}
                </p>
              </div>

              <div className="flex items-center justify-between mb-3">
                <div className="min-w-0">
                  <p className="text-[10px] text-white/40 uppercase tracking-wider truncate">
                    {pickupPoint?.name}{pickupLandmark ? ` · ${pickupLandmark}` : ""} →{" "}
                    {dropoffPoint?.name}{dropoffLandmark ? ` · ${dropoffLandmark}` : ""}
                  </p>
                </div>
                <div className="text-right flex-shrink-0 ml-2">
                  {fareInfo.hasDiscount && (
                    <p className="text-xs text-white/30 line-through">
                      {formatCurrency(fareInfo.regularFare)}
                    </p>
                  )}
                  <p className="text-2xl font-extrabold text-white">
                    {formatCurrency(fareInfo.finalFare)}
                  </p>
                  {fareInfo.hasDiscount && (
                    <p className="text-[10px] text-green-400">
                      You save {formatCurrency(fareInfo.discountAmount)}
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={() => setStep("confirm")}
                className="w-full py-3.5 rounded-xl font-bold text-sm transition-colors shadow-lg active:scale-[0.98] bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/30"
              >
                Pay {formatCurrency(fareInfo.finalFare)} with Cash
              </button>
            </div>
          )}

          {/* No locations selected yet — show hint */}
          {isGCash && !bothLocationsSelected && (
            <div className="flex-shrink-0 p-4 border-t border-white/10 bg-[#050F1A] pb-safe">
              <div className="text-center py-2">
                <p className="text-[11px] text-white/30">Select both pickup and drop-off locations to generate QR code</p>
              </div>
            </div>
          )}

          {!isGCash && !fareInfo && (
            <div className="flex-shrink-0 p-4 border-t border-white/10 bg-[#050F1A] pb-safe">
              <div className="text-center py-2">
                <p className="text-[11px] text-white/30">Select both pickup and drop-off to calculate fare</p>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ─── STEP: QR Code (GCash only — commuter scans this) ────────────
  // Displays the server-issued qr_token as a QR code. The commuter scans
  // this QR with their app, which calls POST /api/commuter/payments/claim
  // { qr_token } — the backend binds the commuter's passenger_id to the
  // transaction and returns the PayMongo checkout_url. The commuter then
  // redirects to PayMongo to authorize. The webhook flips status to PAID,
  // which we detect via the polling loop started in handleInitiateGcash.
  // NOTE: pickupPoint/dropoffPoint are NOT required here — a resumed payment
  // (after navigation/refresh) has no location-picker state, so the route is
  // read from the transaction row (gcashInitiation.from/to) as a fallback.
  if (step === "qr_code" && gcashInitiation) {
    // The QR encodes JUST the qr_token (a 32-char opaque string). The
    // commuter's app extracts it and POSTs it to /commuter/payments/claim.
    // We do NOT encode JSON or transaction details in the QR — the backend
    // is the source of truth and the qr_token is the lookup key.
    const qrData = gcashInitiation.qrToken;
    const routeFrom = pickupPoint?.name ?? gcashInitiation.from ?? null;
    const routeTo = dropoffPoint?.name ?? gcashInitiation.to ?? null;
    const countdownLabel =
      qrSecondsLeft !== null
        ? `${Math.floor(qrSecondsLeft / 60)}:${String(qrSecondsLeft % 60).padStart(2, "0")}`
        : null;

    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-md p-4">
        <div className="w-full max-w-xs bg-[#071A2E] border border-blue-500/20 rounded-3xl p-6 text-center shadow-2xl space-y-4 animate-in zoom-in-95 fade-in duration-200">
          <div className="flex justify-center">
            <div className="w-14 h-14 rounded-full bg-blue-500/15 border-2 border-blue-500/30 flex items-center justify-center">
              <svg className="w-7 h-7 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0 1 3.75 9.375v-4.5ZM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 0 1-1.125-1.125v-4.5ZM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0 1 13.5 9.375v-4.5Z" />
              </svg>
            </div>
          </div>
          <div>
            <h2 className="text-white font-bold text-lg">Scan to Pay</h2>
            <p className="text-[11px] text-white/40 mt-1 leading-relaxed">Commuter, scan this QR code with your e-Chatco app to confirm payment</p>
          </div>
          <div className="bg-white rounded-2xl p-4 flex justify-center">
            <QRCodeSVG
              value={qrData}
              size={180}
              bgColor="#ffffff"
              fgColor="#071A2E"
              level="H"
              includeMargin={false}
            />
          </div>
          <div className="space-y-2">
            {routeFrom && routeTo && (
              <p className="text-xs text-white/40">
                {routeFrom} → {routeTo}
              </p>
            )}
            <p className="text-xs text-white/50">
              Amount: <span className="text-white font-semibold">{formatCurrency(gcashInitiation.amount)}</span>
            </p>
            <div className="flex items-center justify-center gap-2">
              <div className={`w-2 h-2 rounded-full animate-pulse ${gcashStatus === "expired" ? "bg-amber-400" : "bg-blue-400"}`} />
              <p className={`text-xs font-medium ${gcashStatus === "expired" ? "text-amber-400/90" : "text-blue-400/70"}`}>
                {gcashStatus === "processing" ? "Payment processing…" :
                 gcashStatus === "paid" ? "Payment successful!" :
                 gcashStatus === "expired" ? "QR expired — still waiting for PayMongo confirmation…" :
                 gcashStatus ? `Status: ${gcashStatus}` :
                 "Waiting for commuter scan…"}
              </p>
            </div>
            {countdownLabel && (
              <p className={`text-[11px] font-semibold ${qrSecondsLeft !== null && qrSecondsLeft <= 30 ? "text-red-400" : "text-white/40"}`}>
                QR expires in <span className="tabular-nums">{countdownLabel}</span>
              </p>
            )}
          </div>

          {/* DEV ONLY: Simulate payment button — only shows when the backend
              has payments.allow_simulation=true (FakeGateway or sandbox). */}
          {process.env.NODE_ENV === "development" && (
            <button
              onClick={handleSimulatePayment}
              className="w-full py-2 rounded-xl border border-amber-500/20 bg-amber-500/10 text-amber-400 text-xs font-semibold hover:bg-amber-500/20 transition-colors"
            >
              [DEV] Simulate Payment Paid
            </button>
          )}

          {/* Action buttons */}
          <div className="flex gap-2">
            <button
              onClick={handleCancelGcash}
              className="flex-1 py-2.5 rounded-xl border border-red-500/20 text-red-400 text-sm font-semibold hover:bg-red-500/10 transition-colors"
            >
              Cancel Payment
            </button>
            <button
              onClick={() => { stopPolling(); setStep("select"); }}
              className="flex-1 py-2.5 rounded-xl border border-white/10 text-white/50 text-sm font-semibold hover:bg-white/5 transition-colors"
            >
              Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── STEP: Scan Result (GCash only — after commuter scans) ────────
  // Commuter type is auto-detected from their e-chatco account.
  // Fare is now calculated based on the detected type.
  if (step === "scan_result" && gcashFareInfo) {
    return (
      <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4">
        <div className="w-full sm:max-w-sm bg-[#071A2E] rounded-2xl border border-white/10 shadow-2xl">
          <div className="p-6">
            <h2 className="text-lg font-bold text-white mb-4">
              Fare Breakdown
            </h2>

            {/* Commuter info detected from scan */}
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3 mb-4">
              <div className="flex items-center gap-2 mb-1">
                <svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                </svg>
                <span className="text-xs font-semibold text-blue-400">
                  Commuter Detected
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-white/70">{scannedCommuterName}</span>
                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                  scannedCommuterType !== "REGULAR"
                    ? "bg-amber-500/15 text-amber-400 border border-amber-500/25"
                    : "bg-white/5 text-white/40 border border-white/10"
                }`}>
                  {getCommuterTypeLabel(scannedCommuterType)}
                </span>
              </div>
            </div>

            <div className="space-y-3 mb-6">
              <div className="flex justify-between text-sm">
                <span className="text-white/50">Route</span>
                <span className="text-white">
                  {pickupPoint?.name}{pickupLandmark ? ` · ${pickupLandmark}` : ""} →{" "}
                  {dropoffPoint?.name}{dropoffLandmark ? ` · ${dropoffLandmark}` : ""}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-white/50">Barangays Traveled</span>
                <span className="text-white">
                  {gcashFareInfo.barangaysTraveled}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-white/50">Fare Basis</span>
                <span className="text-white/70 text-xs">
                  {gcashFareInfo.succeedingCount > 0
                    ? `Base fare covers first ${gcashFareInfo.baseBarangayCount} + ${gcashFareInfo.succeedingCount} succeeding`
                    : "Base fare (within first 4 barangays)"}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-white/50">Regular Fare</span>
                <span className={gcashFareInfo.hasDiscount ? "text-white/30 line-through" : "text-white"}>
                  {formatCurrency(gcashFareInfo.regularFare)}
                </span>
              </div>
              {gcashFareInfo.hasDiscount && (
                <div className="flex justify-between text-sm">
                  <span className="text-white/50">Discount ({getCommuterTypeLabel(scannedCommuterType)})</span>
                  <span className="text-green-400">
                    -{formatCurrency(gcashFareInfo.discountAmount)}
                  </span>
                </div>
              )}
              <div className="border-t border-white/10 pt-3 flex justify-between">
                <span className="text-white font-semibold">Total</span>
                <span className="text-xl font-extrabold text-white">
                  {formatCurrency(gcashFareInfo.finalFare)}
                </span>
              </div>
            </div>

            {/* GCash Payment Notice */}
            <div className="bg-[#1A5FB4]/10 border border-[#1A5FB4]/20 rounded-xl p-3 mb-6">
              <div className="flex items-center gap-2 mb-1">
                <svg className="w-4 h-4 text-[#62A0EA]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
                </svg>
                <span className="text-xs font-semibold text-[#62A0EA]">
                  GCash Secure Payment
                </span>
              </div>
              <p className="text-[10px] text-white/40">
                Fare will be charged to the commuter&apos;s GCash account. No wallet balance needed — pay directly.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep("qr_code")}
                className="flex-1 py-3 rounded-xl border border-white/10 text-white/60 text-sm font-semibold hover:bg-white/5 transition-colors"
              >
                Back
              </button>
              <button
                onClick={() => setStep("confirm")}
                className="flex-1 py-3 rounded-xl text-white text-sm font-bold transition-colors shadow-lg bg-[#1A5FB4] hover:bg-[#164A8F] shadow-[#1A5FB4]/30"
              >
                Confirm Payment
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── STEP: Confirm Payment ──────────────────────────────────────

  if (step === "confirm") {
    // For GCash: the commuter type is NOT known yet (it's detected server-side
    // when the commuter claims the QR). So we show the REGULAR fare here —
    // if the commuter turns out to be discounted, the backend applies the
    // discount at claim time.
    // For Cash: the conductor selects the commuter type, so the discount is
    // applied immediately.
    // For Voucher: free ride (₱0) — the conductor enters the voucher code.
    const activeFareInfo = selectedMethod === "GCash" ? gcashFareInfo : fareInfo;
    const activeCommuterType = selectedMethod === "GCash" ? "REGULAR" : commuterType;

    if (!activeFareInfo) return null;

    return (
      <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4">
        <div className="w-full sm:max-w-sm bg-[#071A2E] rounded-2xl border border-white/10 shadow-2xl">
          <div className="p-6">
            <h2 className="text-lg font-bold text-white mb-4">
              Confirm Payment
            </h2>

            <div className="space-y-3 mb-6">
              <div className="flex justify-between text-sm">
                <span className="text-white/50">Route</span>
                <span className="text-white">
                  {pickupPoint?.name}{pickupLandmark ? ` · ${pickupLandmark}` : ""} →{" "}
                  {dropoffPoint?.name}{dropoffLandmark ? ` · ${dropoffLandmark}` : ""}
                </span>
              </div>
              {pickupLandmark && (
                <div className="flex justify-between text-sm">
                  <span className="text-white/50">Pickup Landmark</span>
                  <span className={pickupLabelClass}>{pickupLandmark}</span>
                </div>
              )}
              {dropoffLandmark && (
                <div className="flex justify-between text-sm">
                  <span className="text-white/50">Drop-off Landmark</span>
                  <span className={dropoffLabelClass}>{dropoffLandmark}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-white/50">Barangays Traveled</span>
                <span className="text-white">
                  {activeFareInfo.barangaysTraveled}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-white/50">Fare Basis</span>
                <span className="text-white/70 text-xs">
                  {activeFareInfo.succeedingCount > 0
                    ? `Base fare covers first ${activeFareInfo.baseBarangayCount} + ${activeFareInfo.succeedingCount} succeeding`
                    : "Base fare (within first 4 barangays)"}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-white/50">Commuter Type</span>
                <span className="text-white">
                  {getCommuterTypeLabel(activeCommuterType)}
                </span>
              </div>
              {activeFareInfo.hasDiscount && (
                <div className="flex justify-between text-sm">
                  <span className="text-white/50">Regular Fare</span>
                  <span className="text-white/30 line-through">
                    {formatCurrency(activeFareInfo.regularFare)}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-white/50">Discount</span>
                <span className="text-green-400">
                  -{formatCurrency(activeFareInfo.discountAmount)}
                </span>
              </div>
              <div className="border-t border-white/10 pt-3 flex justify-between">
                <span className="text-white font-semibold">Total</span>
                <span className="text-xl font-extrabold text-white">
                  {formatCurrency(activeFareInfo.finalFare)}
                </span>
              </div>
            </div>

            {/* Payment Method Notice */}
            {selectedMethod === "GCash" ? (
              <div className="bg-[#1A5FB4]/10 border border-[#1A5FB4]/20 rounded-xl p-3 mb-6">
                <div className="flex items-center gap-2 mb-1">
                  <svg className="w-4 h-4 text-[#62A0EA]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
                  </svg>
                  <span className="text-xs font-semibold text-[#62A0EA]">
                    GCash Secure Payment
                  </span>
                </div>
                <p className="text-[10px] text-white/40">
                  Fare will be charged to the commuter&apos;s GCash account. No wallet
                  balance needed — pay directly.
                </p>
              </div>
            ) : (
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 mb-6">
                <div className="flex items-center gap-2 mb-1">
                  <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z" />
                  </svg>
                  <span className="text-xs font-semibold text-emerald-400">
                    Cash Payment
                  </span>
                </div>
                <p className="text-[10px] text-white/40">
                  Collect the exact fare amount from the commuter in cash. This
                  transaction will be recorded in your shift log.
                </p>
              </div>
            )}

            {/* Voucher Code Input — only for Voucher payment */}
            {selectedMethod === "Voucher" && (
              <div className="mb-6">
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Voucher Code <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={voucherCode}
                  onChange={(e) => setVoucherCode(e.target.value.toUpperCase().trim())}
                  placeholder="e.g. REWARD-AB12CD34"
                  className="block w-full px-4 py-2.5 bg-[#0E1628] border border-[#1E2D45] rounded-md text-white text-sm font-mono placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-violet-400 transition-colors"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  Enter the code shown by the commuter&apos;s app. The ride will be recorded as a free ride (₱0).
                </p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setStep("select")}
                disabled={isInitiatingGcash}
                className="flex-1 py-3 rounded-xl border border-white/10 text-white/60 text-sm font-semibold hover:bg-white/5 transition-colors disabled:opacity-50"
              >
                Back
              </button>
              <button
                onClick={handleConfirmPayment}
                disabled={isInitiatingGcash || (selectedMethod === "Voucher" && !voucherCode.trim())}
                className={`flex-1 py-3 rounded-xl text-white text-sm font-bold transition-colors shadow-lg disabled:opacity-60 disabled:cursor-not-allowed ${
                  selectedMethod === "GCash"
                    ? "bg-[#1A5FB4] hover:bg-[#164A8F] shadow-[#1A5FB4]/30"
                    : selectedMethod === "Voucher"
                      ? "bg-violet-600 hover:bg-violet-700 shadow-violet-600/30"
                      : "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/30"
                }`}
              >
                {isInitiatingGcash
                  ? "Starting…"
                  : selectedMethod === "GCash"
                    ? `Generate QR · ${formatCurrency(activeFareInfo.finalFare)}`
                    : selectedMethod === "Voucher"
                      ? "Apply Voucher (Free Ride)"
                      : `Pay ${formatCurrency(activeFareInfo.finalFare)}`}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── STEP: Processing ───────────────────────────────────────────

  if (step === "processing") {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
        <div className="w-full max-w-xs bg-[#071A2E] rounded-2xl border border-white/10 shadow-2xl p-8 text-center">
          <div className={`w-16 h-16 mx-auto mb-4 rounded-full border-4 border-t-transparent animate-spin ${
            selectedMethod === "GCash" ? "border-[#1A5FB4]" : "border-emerald-500"
          }`} />
          <h2 className="text-lg font-bold text-white mb-2">
            Processing Payment
          </h2>
          <p className="text-sm text-white/40">
            {selectedMethod === "GCash"
              ? "Charging fare via GCash..."
              : "Recording cash payment..."}
          </p>
        </div>
      </div>
    );
  }

  // ─── STEP: Success ──────────────────────────────────────────────

  if (step === "success") {
    const activeFareInfo = selectedMethod === "GCash" ? gcashFareInfo : fareInfo;
    if (!activeFareInfo) return null;

    return (
      <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4">
        <div className="w-full sm:max-w-sm max-h-[92vh] overflow-y-auto bg-[#071A2E] rounded-2xl border border-white/10 shadow-2xl modal-scroll">
          <div className="p-6 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center">
              <svg className="w-8 h-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
              </svg>
            </div>
            <h2 className="text-lg font-bold text-white mb-1">
              Payment Successful!
            </h2>
            <p className="text-sm text-white/40 mb-4">
              {selectedMethod === "GCash"
                ? "Fare has been charged via GCash"
                : "Cash payment has been recorded"}
            </p>

            <div className="bg-white/5 rounded-xl p-4 text-left space-y-2 mb-6">
              <div className="flex justify-between text-sm">
                <span className="text-white/40">Amount Paid</span>
                <span className="text-white font-bold">
                  {formatCurrency(activeFareInfo.finalFare)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-white/40">Route</span>
                <span className="text-white/70">
                  {pickupPoint?.name}{pickupLandmark ? ` · ${pickupLandmark}` : ""} →{" "}
                  {dropoffPoint?.name}{dropoffLandmark ? ` · ${dropoffLandmark}` : ""}
                </span>
              </div>
              {pickupLandmark && (
                <div className="flex justify-between text-sm">
                  <span className="text-white/40">Pickup Landmark</span>
                  <span className={pickupLabelClass}>{pickupLandmark}</span>
                </div>
              )}
              {dropoffLandmark && (
                <div className="flex justify-between text-sm">
                  <span className="text-white/40">Drop-off Landmark</span>
                  <span className={dropoffLabelClass}>{dropoffLandmark}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-white/40">Barangays</span>
                <span className="text-white/70">
                  {activeFareInfo.barangaysTraveled} traveled
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-white/40">Commuter Type</span>
                <span className="text-white/70">
                  {getCommuterTypeLabel(selectedMethod === "GCash" ? scannedCommuterType : commuterType)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-white/40">Method</span>
                <span className={selectedMethod === "GCash" ? "text-[#62A0EA]" : "text-emerald-400"}>
                  {selectedMethod}
                </span>
              </div>
              {gcashInitiation && selectedMethod === "GCash" && (
                <div className="flex justify-between text-sm">
                  <span className="text-white/40">Ref ID</span>
                  <span className="text-white/50 text-xs font-mono">
                    {gcashInitiation.transactionId}
                  </span>
                </div>
              )}
              {gcashInitiation && selectedMethod === "GCash" && !gcashInitiation.checkoutUrl && (
                <div className="flex justify-between text-sm">
                  <span className="text-white/40">Mode</span>
                  <span className="text-amber-400/60 text-xs font-medium">
                    Simulated (Dev)
                  </span>
                </div>
              )}
            </div>

            {selectedMethod === "Cash" && cashReceiptToken && (
              <div className="mb-6 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
                <p className="text-xs font-bold text-emerald-300">Digital cash receipt QR</p>
                <p className="mt-1 text-[10px] leading-relaxed text-white/40">
                  Let the commuter scan this from Rewards to credit +1 paid ride.
                  Each receipt can only be claimed once.
                </p>
                <div className="mx-auto mt-3 w-fit rounded-xl bg-white p-3">
                  <QRCodeSVG value={cashReceiptToken} size={144} level="M" />
                </div>
                <p className="mt-2 break-all font-mono text-[9px] text-white/25">{cashReceiptToken}</p>
              </div>
            )}

            <button
              onClick={handleClose}
              className={`w-full py-3 rounded-xl text-white text-sm font-bold transition-colors ${
                selectedMethod === "GCash"
                  ? "bg-[#1A5FB4] hover:bg-[#164A8F]"
                  : "bg-emerald-600 hover:bg-emerald-700"
              }`}
            >
              Done
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── STEP: Failed ───────────────────────────────────────────────

  if (step === "failed") {
    return (
      <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4">
        <div className="w-full sm:max-w-sm bg-[#071A2E] rounded-2xl border border-white/10 shadow-2xl">
          <div className="p-6 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center">
              <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-lg font-bold text-white mb-1">
              Payment Failed
            </h2>
            <p className="text-sm text-white/40 mb-6">
              {gcashError
                ? gcashError
                : selectedMethod === "GCash"
                  ? "Could not process the GCash payment. Please try again or pay cash to the conductor."
                  : "Could not record the payment. Please try again."}
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleClose}
                className="flex-1 py-3 rounded-xl border border-white/10 text-white/60 text-sm font-semibold hover:bg-white/5 transition-colors"
              >
                Close
              </button>
              <button
                onClick={() => setStep("confirm")}
                className={`flex-1 py-3 rounded-xl text-white text-sm font-bold transition-colors ${
                  selectedMethod === "GCash"
                    ? "bg-[#1A5FB4] hover:bg-[#164A8F]"
                    : "bg-emerald-600 hover:bg-emerald-700"
                }`}
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
