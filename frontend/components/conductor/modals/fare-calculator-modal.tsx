"use client";

import { useState, useMemo, useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";
import {
  FARE_MATRIX,
  getFareBetween,
  getBarangaysTraversed,
  FARE_CONFIG,
  type PointArea,
} from "@/lib/shared/fare/fare-matrix-data";
import {
  formatCurrency,
  getCommuterTypeLabel,
  type CommuterType,
} from "@/lib/shared/fare/fare-calculator";
import {
  createPaymentIntent,
  verifyPayment,
  type PaymentStatus,
  type GCashPaymentIntent,
} from "@/lib/shared/payment/gcash-payment";
import { createTransaction } from "@/lib/conductor-transactions";
import type { PaymentMethodType } from "@/types";
import {
  encodeQRTransaction,
  type QRTransactionPayload,
} from "@/lib/shared/payment/qr-transaction";

interface FareCalcModalProps {
  isOpen: boolean;
  onClose: () => void;
  shiftId?: string;
  conductorName?: string;
  unitNumber?: string;
  driverName?: string;
}

type Step = "method" | "select" | "confirm" | "processing" | "qr_code" | "success" | "failed";
type SelectedPaymentMethod = "GCash" | "Cash";

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
  const [paymentIntent, setPaymentIntent] =
    useState<GCashPaymentIntent | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus | null>(
    null
  );

  // ─── Fare Calculation using FARE_MATRIX (correct data source) ───
  const fareInfo = useMemo(() => {
    if (!pickupPoint || !dropoffPoint) return null;

    const isDiscounted = commuterType !== "REGULAR";
    const barangaysTraveled = getBarangaysTraversed(
      pickupPoint.pointNumber,
      dropoffPoint.pointNumber
    );
    const regularFare = getFareBetween(
      pickupPoint.pointNumber,
      dropoffPoint.pointNumber,
      false
    );
    const discountedFare = getFareBetween(
      pickupPoint.pointNumber,
      dropoffPoint.pointNumber,
      true
    );
    const finalFare = isDiscounted ? discountedFare : regularFare;
    const discountAmount = regularFare - discountedFare;
    const succeedingCount = Math.max(
      0,
      barangaysTraveled - FARE_CONFIG.BASE_BARANGAY_COUNT
    );

    return {
      barangaysTraveled,
      regularFare,
      discountedFare,
      finalFare,
      hasDiscount: isDiscounted,
      discountAmount,
      succeedingCount,
      baseBarangayCount: FARE_CONFIG.BASE_BARANGAY_COUNT,
    };
  }, [pickupPoint, dropoffPoint, commuterType]);

  const filteredPoints = searchQuery
    ? FARE_MATRIX.filter(
        (p) =>
          p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.landmarks.some((l) =>
            l.toLowerCase().includes(searchQuery.toLowerCase())
          )
      )
    : FARE_MATRIX;

  // ─── Save transaction to shift tracking (backend-proof) ───
  const recordTransaction = async (method: SelectedPaymentMethod) => {
    if (!fareInfo || !pickupPoint || !dropoffPoint || !shiftId) return;

    const paymentMethodType: PaymentMethodType = method === "GCash" ? "GCash_Scanned" : "Cash";

    await createTransaction(shiftId, {
      paymentMethod: paymentMethodType,
      finalAmount: fareInfo.finalFare,
      passengerName: "Commuter",
      passengerId: "c_001",
      passengerRole: commuterType,
      from: pickupPoint.name,
      to: dropoffPoint.name,
      distance: fareInfo.barangaysTraveled,
      baseFare: fareInfo.regularFare,
      succeedingKm: fareInfo.succeedingCount,
      discountAmount: fareInfo.discountAmount,
      conductorName: conductorName || "—",
      unitNumber: unitNumber || "—",
      driverName: driverName || "—",
    });
  };

  const handlePayWithGCash = async () => {
    if (!fareInfo || !pickupPoint || !dropoffPoint) return;

    setStep("processing");

    try {
      const intent = await createPaymentIntent({
        amount: fareInfo.finalFare,
        commuterId: "c_001",
        commuterName: "Arone Dela Cruz",
        pickupPoint: pickupPoint.pointNumber,
        dropoffPoint: dropoffPoint.pointNumber,
        shiftId,
        conductorId: conductorName,
      });

      setPaymentIntent(intent);

      // In sandbox mode, simulate GCash payment flow
      const status = await verifyPayment(intent.id);
      setPaymentStatus(status);

      if (status === "paid") {
        await recordTransaction("GCash");
        setStep("qr_code");
      } else {
        setStep("failed");
      }
    } catch {
      setStep("failed");
    }
  };

  const handlePayWithCash = async () => {
    if (!fareInfo || !pickupPoint || !dropoffPoint) return;

    setStep("processing");

    // Cash payment: brief processing (just recording), then success
    await new Promise((r) => setTimeout(r, 800));

    await recordTransaction("Cash");
    setStep("success");
  };

  const handleConfirmPayment = () => {
    if (selectedMethod === "GCash") {
      handlePayWithGCash();
    } else {
      handlePayWithCash();
    }
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
    setPaymentIntent(null);
    setPaymentStatus(null);
    onClose();
  };

  // ─── Auto-advance from QR code to success after 1s ──────────
  useEffect(() => {
    if (step !== "qr_code") return;
    const timer = setTimeout(() => setStep("success"), 1000);
    return () => clearTimeout(timer);
  }, [step]);

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
                  <p className="text-[11px] text-white/40 mt-0.5 leading-relaxed">Digital payment via GCash — no wallet balance needed, pay directly</p>
                </div>
                <svg className="w-5 h-5 text-white/20 group-hover:text-blue-400 transition-colors flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
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
    return (
      <div className="fixed inset-0 z-[100] flex flex-col bg-[#050F1A] safe-area-inset">
        <div className="flex flex-col h-full w-full max-w-lg mx-auto">
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

              {/* Commuter Type */}
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
          <div className="flex-1 overflow-y-auto px-4 pb-3 overscroll-contain">
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
                        // AUTO-LANDMARK FLOW: Do NOT auto-advance selectingField
                        // to "dropoff" here. Instead, auto-expand the landmark
                        // list so the user is guided to pick a landmark first.
                        // The selectingField will advance AFTER the user selects
                        // a landmark or clicks "Skip landmark".
                        // Exception: if the barangay has NO landmarks, advance
                        // immediately since there is nothing to select.
                        if (point.landmarks.length > 0) {
                          setExpandedBarangay(point.pointNumber);
                        } else {
                          setSelectingField("dropoff");
                        }
                      } else {
                        setDropoffPoint(point);
                        setDropoffLandmark(null);
                        // AUTO-LANDMARK FLOW: Same for dropoff — auto-expand
                        // landmarks and wait for user to pick one. No further
                        // field to advance to, but we still expand for UX.
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
                        : "hover:bg-white/5 border-transparent"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold transition-colors duration-200 ${
                            isPickup && isDropoff
                              ? "bg-violet-500 text-white"
                              : isPickup
                                ? itemPickupTag
                                : isDropoff
                                  ? itemDropoffTag
                                  : "bg-white/5 text-white/40"
                          }`}
                        >
                          {point.pointNumber}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-white truncate">
                            {point.name}
                          </p>
                          <div className="flex items-center gap-2">
                            <p className="text-[10px] text-white/30">
                              {point.landmarks.length} landmark{point.landmarks.length !== 1 ? "s" : ""}
                            </p>
                            {isPickup && (
                              <span className={`text-[9px] font-semibold ${itemPickupLabel} px-1.5 py-0.5 rounded bg-white/5`}>
                                PICKUP
                              </span>
                            )}
                            {isDropoff && (
                              <span className={`text-[9px] font-semibold ${itemDropoffLabel} px-1.5 py-0.5 rounded bg-white/5`}>
                                DROP-OFF
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <div className="text-right hidden xs:block">
                          <p className="text-xs font-semibold text-white/60">
                            {formatCurrency(point.regularFare)}
                          </p>
                          <p className="text-[10px] text-white/30">
                            Disc: {formatCurrency(point.discountedFare)}
                          </p>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandedBarangay(
                              isExpanded ? null : point.pointNumber
                            );
                          }}
                          className="w-7 h-7 rounded-md bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors"
                        >
                          <svg
                            className={`w-3 h-3 text-white/40 transition-transform ${isExpanded ? "rotate-180" : ""}`}
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
                      {/* Skip landmark button — allows user to confirm barangay
                          without selecting a specific landmark, then advances
                          to the next selection step. */}
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
                        const lmPickupColor = isSameBarangay ? "violet" : "emerald";
                        const lmDropoffColor = isSameBarangay ? "violet" : "emerald";
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
                                // AUTO-ADVANCE: After selecting a pickup landmark,
                                // advance to dropoff selection. This is the correct
                                // point to advance — the user has completed the
                                // pickup selection flow (barangay + landmark).
                                setSelectingField("dropoff");
                              } else {
                                if (dropoffPoint?.pointNumber !== point.pointNumber) {
                                  setDropoffPoint(point);
                                }
                                setDropoffLandmark(landmark);
                              }
                              // AUTO-COLLAPSE: After selecting a landmark,
                              // collapse the expanded section to keep the UI clean
                              // and prepare for the next selection step.
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

          {/* ── Fare Summary & Pay Button (sticky bottom) ── */}
          {fareInfo && (
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
                className={`w-full py-3.5 rounded-xl font-bold text-sm transition-colors shadow-lg active:scale-[0.98] ${
                  selectedMethod === "GCash"
                    ? "bg-[#1A5FB4] hover:bg-[#164A8F] text-white shadow-[#1A5FB4]/30"
                    : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/30"
                }`}
              >
                Pay {formatCurrency(fareInfo.finalFare)} with {selectedMethod}
              </button>
            </div>
          )}

          {/* No fare info yet — show hint */}
          {!fareInfo && (
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

  // ─── STEP: Confirm Payment ──────────────────────────────────────

  if (step === "confirm" && fareInfo) {
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
                  {fareInfo.barangaysTraveled}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-white/50">Fare Basis</span>
                <span className="text-white/70 text-xs">
                  {fareInfo.succeedingCount > 0
                    ? `Base fare covers first ${fareInfo.baseBarangayCount} + ${fareInfo.succeedingCount} succeeding`
                    : "Base fare (within first 4 barangays)"}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-white/50">Commuter Type</span>
                <span className="text-white">
                  {getCommuterTypeLabel(commuterType)}
                </span>
              </div>
              {fareInfo.hasDiscount && (
                <div className="flex justify-between text-sm">
                  <span className="text-white/50">Regular Fare</span>
                  <span className="text-white/30 line-through">
                    {formatCurrency(fareInfo.regularFare)}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-white/50">Discount</span>
                <span className="text-green-400">
                  -{formatCurrency(fareInfo.discountAmount)}
                </span>
              </div>
              <div className="border-t border-white/10 pt-3 flex justify-between">
                <span className="text-white font-semibold">Total</span>
                <span className="text-xl font-extrabold text-white">
                  {formatCurrency(fareInfo.finalFare)}
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
                  You will be redirected to GCash to confirm payment. No wallet
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

            <div className="flex gap-3">
              <button
                onClick={() => setStep("select")}
                className="flex-1 py-3 rounded-xl border border-white/10 text-white/60 text-sm font-semibold hover:bg-white/5 transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleConfirmPayment}
                className={`flex-1 py-3 rounded-xl text-white text-sm font-bold transition-colors shadow-lg ${
                  selectedMethod === "GCash"
                    ? "bg-[#1A5FB4] hover:bg-[#164A8F] shadow-[#1A5FB4]/30"
                    : "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/30"
                }`}
              >
                Pay {formatCurrency(fareInfo.finalFare)}
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
              ? "Confirming your GCash payment..."
              : "Recording cash payment..."}
          </p>
        </div>
      </div>
    );
  }

  // ─── STEP: QR Code (GCash only — commuter scans this) ────────────

  if (step === "qr_code" && fareInfo) {
    // Build the QR payload with real transaction data for commuter scanning
    const qrPayload: QRTransactionPayload = {
      version: 1,
      transactionId: paymentIntent?.id || `TXN-${Date.now()}`,
      amount: fareInfo.finalFare,
      from: pickupPoint?.name || "",
      to: dropoffPoint?.name || "",
      barangaysTraveled: fareInfo.barangaysTraveled,
      commuterType,
      paymentMethod: "GCash",
      conductorId: conductorName || "—",
      shiftId: shiftId || "",
      unitNumber: unitNumber || "—",
      createdAt: new Date().toISOString(),
      regularFare: fareInfo.regularFare,
      discountAmount: fareInfo.discountAmount,
    };
    const qrData = encodeQRTransaction(qrPayload);

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
            <p className="text-[11px] text-white/40 mt-1 leading-relaxed">Commuter, scan this QR code with your Chatco app to confirm payment</p>
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
            <p className="text-2xl font-extrabold text-white">{formatCurrency(fareInfo.finalFare)}</p>
            <p className="text-xs text-white/40">
              {pickupPoint?.name} → {dropoffPoint?.name}
            </p>
            <div className="flex items-center justify-center gap-2">
              <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
              <p className="text-xs text-blue-400/70 font-medium">Waiting for commuter scan…</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── STEP: Success ──────────────────────────────────────────────

  if (step === "success" && fareInfo) {
    return (
      <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4">
        <div className="w-full sm:max-w-sm bg-[#071A2E] rounded-2xl border border-white/10 shadow-2xl">
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
                ? "Your fare has been paid via GCash"
                : "Cash payment has been recorded"}
            </p>

            <div className="bg-white/5 rounded-xl p-4 text-left space-y-2 mb-6">
              <div className="flex justify-between text-sm">
                <span className="text-white/40">Amount Paid</span>
                <span className="text-white font-bold">
                  {formatCurrency(fareInfo.finalFare)}
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
                  {fareInfo.barangaysTraveled} traveled
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-white/40">Method</span>
                <span className={selectedMethod === "GCash" ? "text-[#62A0EA]" : "text-emerald-400"}>
                  {selectedMethod}
                </span>
              </div>
              {paymentIntent && selectedMethod === "GCash" && (
                <div className="flex justify-between text-sm">
                  <span className="text-white/40">Ref ID</span>
                  <span className="text-white/50 text-xs font-mono">
                    {paymentIntent.id}
                  </span>
                </div>
              )}
            </div>

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
              {selectedMethod === "GCash"
                ? "Could not process your GCash payment. Please try again or pay cash to the conductor."
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