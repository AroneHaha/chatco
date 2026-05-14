"use client";

import { useState, useMemo, useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";
import {
  FARE_MATRIX,
  getFareBetween,
  getBarangaysTraversed,
  FARE_CONFIG,
  type PointArea,
} from "@/lib/fare-matrix-data";
import {
  formatCurrency,
  getCommuterTypeLabel,
  type CommuterType,
} from "@/lib/fare-calculator";
import {
  createPaymentIntent,
  verifyPayment,
  type PaymentStatus,
  type GCashPaymentIntent,
} from "@/lib/gcash-payment";
import { saveTransaction, type PaymentMethodType } from "@/lib/conductor-transactions";
import {
  encodeQRTransaction,
  type QRTransactionPayload,
} from "@/lib/qr-transaction";

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
  const recordTransaction = (method: SelectedPaymentMethod) => {
    if (!fareInfo || !pickupPoint || !dropoffPoint || !shiftId) return;

    const paymentMethodType: PaymentMethodType = method === "GCash" ? "GCash" : "Cash";

    saveTransaction(shiftId, {
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
        recordTransaction("GCash");
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

    recordTransaction("Cash");
    setStep("success");
  };

  const handleConfirmPayment = () => {
    if (selectedMethod === "GCash") {
      handlePayWithGCash();
    } else {
      handlePayWithCash();
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

  // ─── STEP: Point Area Selection ─────────────────────────────────

  if (step === "select") {
    return (
      <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4">
        <div className="w-full sm:max-w-md bg-[#071A2E] sm:rounded-2xl rounded-t-2xl border border-white/10 shadow-2xl max-h-[90vh] flex flex-col">
          {/* Header */}
          <div className="p-5 border-b border-white/10">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setStep("method")}
                  className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
                  </svg>
                </button>
                <h2 className="text-lg font-bold text-white">Calculate Fare</h2>
              </div>
              <div className="flex items-center gap-2">
                {/* Method badge */}
                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full ${
                  selectedMethod === "GCash"
                    ? "bg-blue-500/15 text-blue-400 border border-blue-500/25"
                    : "bg-emerald-500/15 text-emerald-400 border border-emerald-500/25"
                }`}>
                  {selectedMethod}
                </span>
                <button
                  onClick={handleClose}
                  className="text-white/40 hover:text-white transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Pickup & Dropoff Selection */}
            <div className="space-y-3">
              {/* Pickup */}
              <button
                onClick={() => setSelectingField("pickup")}
                className={`w-full text-left p-3 rounded-xl border transition-colors ${
                  selectingField === "pickup"
                    ? "border-[#62A0EA] bg-[#62A0EA]/10"
                    : "border-white/10 bg-white/5"
                }`}
              >
                <span className="text-[10px] font-semibold text-white/40 uppercase tracking-wider">
                  Pickup Barangay
                </span>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-sm text-white font-medium">
                    {pickupPoint
                      ? pickupLandmark
                        ? `${pickupPoint.name} · ${pickupLandmark}`
                        : pickupPoint.name
                      : "Select pickup"}
                  </span>
                  {pickupPoint && (
                    <span className="text-[10px] text-[#62A0EA] bg-[#62A0EA]/10 px-2 py-0.5 rounded-full">
                      Brgy {pickupPoint.pointNumber}
                    </span>
                  )}
                </div>
              </button>

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
                  className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors"
                >
                  <svg className="w-4 h-4 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21 3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
                  </svg>
                </button>
              </div>

              {/* Dropoff */}
              <button
                onClick={() => setSelectingField("dropoff")}
                className={`w-full text-left p-3 rounded-xl border transition-colors ${
                  selectingField === "dropoff"
                    ? "border-[#FF6D3A] bg-[#FF6D3A]/10"
                    : "border-white/10 bg-white/5"
                }`}
              >
                <span className="text-[10px] font-semibold text-white/40 uppercase tracking-wider">
                  Drop-off Barangay
                </span>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-sm text-white font-medium">
                    {dropoffPoint
                      ? dropoffLandmark
                        ? `${dropoffPoint.name} · ${dropoffLandmark}`
                        : dropoffPoint.name
                      : "Select destination"}
                  </span>
                  {dropoffPoint && (
                    <span className="text-[10px] text-[#FF6D3A] bg-[#FF6D3A]/10 px-2 py-0.5 rounded-full">
                      Brgy {dropoffPoint.pointNumber}
                    </span>
                  )}
                </div>
              </button>
            </div>

            {/* Commuter Type */}
            <div className="mt-3">
              <span className="text-[10px] font-semibold text-white/40 uppercase tracking-wider">
                Commuter Type
              </span>
              <div className="flex gap-2 mt-2">
                {(
                  ["REGULAR", "STUDENT", "SENIOR_CITIZEN", "PWD"] as CommuterType[]
                ).map((type) => (
                  <button
                    key={type}
                    onClick={() => setCommuterType(type)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
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

          {/* Barangay List */}
          <div className="flex-1 overflow-hidden flex flex-col">
            <div className="px-5 pt-3 pb-2">
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
                  className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[#62A0EA]"
                />
              </div>
              <p className="text-[10px] text-white/30 mt-2">
                {selectingField === "pickup"
                  ? "Select your boarding barangay"
                  : "Select your drop-off barangay"}
                {" "}&middot; Landmarks are reference points within each zone
              </p>
            </div>
            <div className="flex-1 overflow-y-auto px-5 pb-3">
              {filteredPoints.map((point) => {
                const isPickup = pickupPoint?.pointNumber === point.pointNumber;
                const isDropoff = dropoffPoint?.pointNumber === point.pointNumber;
                const isSelected = isPickup || isDropoff;
                const isExpanded = expandedBarangay === point.pointNumber;

                return (
                  <div key={point.pointNumber} className="mb-1">
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => {
                        if (selectingField === "pickup") {
                          setPickupPoint(point);
                          setPickupLandmark(null);
                          setSelectingField("dropoff");
                        } else {
                          setDropoffPoint(point);
                          setDropoffLandmark(null);
                        }
                        setSearchQuery("");
                      }}
                      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); (e.target as HTMLElement).click(); } }}
                      className={`w-full text-left p-3 rounded-xl transition-colors cursor-pointer ${
                        isSelected
                          ? isPickup && isDropoff
                            ? "bg-purple-500/20 border border-purple-500/40"
                            : isPickup
                              ? "bg-[#62A0EA]/15 border border-[#62A0EA]/40"
                              : "bg-[#FF6D3A]/15 border border-[#FF6D3A]/40"
                          : "hover:bg-white/5 border border-transparent"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${
                              isPickup && isDropoff
                                ? "bg-purple-500 text-white"
                                : isPickup
                                  ? "bg-[#62A0EA] text-white"
                                  : isDropoff
                                    ? "bg-[#FF6D3A] text-white"
                                    : "bg-white/5 text-white/40"
                            }`}
                          >
                            {point.pointNumber}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-white">
                              {point.name}
                            </p>
                            <div className="flex items-center gap-2">
                              <p className="text-[10px] text-white/30">
                                {point.landmarks.length} landmark{point.landmarks.length !== 1 ? "s" : ""}
                              </p>
                              {isPickup && (
                                <span className="text-[9px] font-semibold text-[#62A0EA] bg-[#62A0EA]/10 px-1.5 py-0.5 rounded">
                                  PICKUP
                                </span>
                              )}
                              {isDropoff && (
                                <span className="text-[9px] font-semibold text-[#FF6D3A] bg-[#FF6D3A]/10 px-1.5 py-0.5 rounded">
                                  DROP-OFF
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="text-right">
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
                            className="w-6 h-6 rounded-md bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors"
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
                        {point.landmarks.map((landmark, idx) => {
                          const isLandmarkPickup = pickupPoint?.pointNumber === point.pointNumber && pickupLandmark === landmark;
                          const isLandmarkDropoff = dropoffPoint?.pointNumber === point.pointNumber && dropoffLandmark === landmark;
                          const isLandmarkSelected = isLandmarkPickup || isLandmarkDropoff;
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
                              }}
                              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); (e.target as HTMLElement).click(); } }}
                              className={`flex items-center gap-2 px-2 py-1.5 rounded-md w-full text-left transition-colors border cursor-pointer ${
                                isLandmarkSelected
                                  ? isLandmarkPickup && isLandmarkDropoff
                                    ? "bg-purple-500/15 border-purple-500/30"
                                    : isLandmarkPickup
                                      ? "bg-[#62A0EA]/10 border-[#62A0EA]/30"
                                      : "bg-[#FF6D3A]/10 border-[#FF6D3A]/30"
                                  : "bg-white/[0.02] border-transparent hover:bg-white/5"
                              }`}
                            >
                              <div className={`w-1.5 h-1.5 rounded-full ${
                                isLandmarkSelected
                                  ? isLandmarkPickup ? "bg-[#62A0EA]" : "bg-[#FF6D3A]"
                                  : "bg-white/20"
                              }`} />
                              <span className={`text-[11px] ${
                                isLandmarkSelected
                                  ? isLandmarkPickup ? "text-[#62A0EA]" : "text-[#FF6D3A]"
                                  : "text-white/40"
                              }`}>
                                {landmark}
                              </span>
                              {isLandmarkPickup && !isLandmarkDropoff && (
                                <span className="text-[8px] font-bold text-[#62A0EA] bg-[#62A0EA]/10 px-1 py-0.5 rounded ml-auto">PICKUP</span>
                              )}
                              {isLandmarkDropoff && !isLandmarkPickup && (
                                <span className="text-[8px] font-bold text-[#FF6D3A] bg-[#FF6D3A]/10 px-1 py-0.5 rounded ml-auto">DROP-OFF</span>
                              )}
                              {isLandmarkPickup && isLandmarkDropoff && (
                                <span className="text-[8px] font-bold text-purple-400 bg-purple-500/10 px-1 py-0.5 rounded ml-auto">BOTH</span>
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
          </div>

          {/* Fare Summary & Pay Button */}
          {fareInfo && (
            <div className="p-5 border-t border-white/10 bg-[#050F1A]">
              {/* Route confirmation with colored indicators */}
              <div className="mb-2 flex items-center gap-2">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#62A0EA]" />
                  <span className="text-xs text-white/70 font-medium">{pickupPoint?.name}{pickupLandmark ? ` · ${pickupLandmark}` : ""}</span>
                </div>
                <svg className="w-3 h-3 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                </svg>
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#FF6D3A]" />
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
                <div>
                  <p className="text-[10px] text-white/40 uppercase tracking-wider">
                    {pickupPoint?.name}{pickupLandmark ? ` · ${pickupLandmark}` : ""} →{" "}
                    {dropoffPoint?.name}{dropoffLandmark ? ` · ${dropoffLandmark}` : ""}
                  </p>
                </div>
                <div className="text-right">
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
                className={`w-full py-3.5 rounded-xl font-bold text-sm transition-colors shadow-lg ${
                  selectedMethod === "GCash"
                    ? "bg-[#1A5FB4] hover:bg-[#164A8F] text-white shadow-[#1A5FB4]/30"
                    : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/30"
                }`}
              >
                Pay with {selectedMethod}
              </button>
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
                  <span className="text-[#62A0EA]">{pickupLandmark}</span>
                </div>
              )}
              {dropoffLandmark && (
                <div className="flex justify-between text-sm">
                  <span className="text-white/50">Drop-off Landmark</span>
                  <span className="text-[#FF6D3A]">{dropoffLandmark}</span>
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
                  <span className="text-[#62A0EA]">{pickupLandmark}</span>
                </div>
              )}
              {dropoffLandmark && (
                <div className="flex justify-between text-sm">
                  <span className="text-white/40">Drop-off Landmark</span>
                  <span className="text-[#FF6D3A]">{dropoffLandmark}</span>
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
