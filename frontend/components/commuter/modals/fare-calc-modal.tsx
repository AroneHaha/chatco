"use client";

import { useState, useEffect } from "react";
import {
  FARE_MATRIX,
  findNearestPoint,
  getPointByNumber,
  type PointArea,
} from "@/lib/fare-matrix-data";
import {
  calculateFare,
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

interface FareCalcModalProps {
  onClose: () => void;
}

type Step = "select" | "confirm" | "processing" | "success" | "failed";

export default function FareCalcModal({ onClose }: FareCalcModalProps) {
  const [step, setStep] = useState<Step>("select");
  const [pickupPoint, setPickupPoint] = useState<PointArea | null>(null);
  const [dropoffPoint, setDropoffPoint] = useState<PointArea | null>(null);
  const [commuterType, setCommuterType] = useState<CommuterType>("REGULAR");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectingField, setSelectingField] = useState<
    "pickup" | "dropoff" | null
  >("dropoff");
  const [detectingLocation, setDetectingLocation] = useState(false);
  const [expandedBarangay, setExpandedBarangay] = useState<number | null>(null);
  const [paymentIntent, setPaymentIntent] =
    useState<GCashPaymentIntent | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus | null>(
    null
  );

  // Auto-detect nearest pickup point on mount
  useEffect(() => {
    detectPickupLocation();
  }, []);

  const detectPickupLocation = async () => {
    setDetectingLocation(true);
    try {
      if ("geolocation" in navigator) {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            timeout: 5000,
          })
        );
        const nearest = findNearestPoint(
          pos.coords.latitude,
          pos.coords.longitude
        );
        setPickupPoint(nearest);
      }
    } catch {
      // Fallback: default to first barangay
      setPickupPoint(FARE_MATRIX[0]);
    } finally {
      setDetectingLocation(false);
    }
  };

  const fareBreakdown =
    pickupPoint && dropoffPoint
      ? calculateFare(pickupPoint.pointNumber, dropoffPoint.pointNumber, commuterType)
      : null;

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

  const handlePayWithGCash = async () => {
    if (!fareBreakdown) return;

    setStep("processing");

    try {
      const intent = await createPaymentIntent({
        amount: fareBreakdown.fare,
        commuterId: "c_001",
        commuterName: "Arone Dela Cruz",
        pickupPoint: fareBreakdown.pickupPoint.pointNumber,
        dropoffPoint: fareBreakdown.dropoffPoint.pointNumber,
      });

      setPaymentIntent(intent);

      // In sandbox mode, simulate GCash payment flow
      const status = await verifyPayment(intent.id);
      setPaymentStatus(status);

      if (status === "paid") {
        setStep("success");
      } else {
        setStep("failed");
      }
    } catch {
      setStep("failed");
    }
  };

  // ─── STEP: Point Area Selection ─────────────────────────────────

  if (step === "select") {
    return (
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4">
        <div className="w-full sm:max-w-md bg-[#071A2E] sm:rounded-2xl rounded-t-2xl border border-white/10 shadow-2xl max-h-[90vh] flex flex-col">
          {/* Header */}
          <div className="p-5 border-b border-white/10">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white">Calculate Fare</h2>
              <button
                onClick={onClose}
                className="text-white/40 hover:text-white transition-colors"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18 18 6M6 6l12 12"
                  />
                </svg>
              </button>
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
                      ? pickupPoint.name
                      : detectingLocation
                        ? "Detecting location..."
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
                      setPickupPoint(dropoffPoint);
                      setDropoffPoint(pickupPoint);
                    }
                  }}
                  className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors"
                >
                  <svg
                    className="w-4 h-4 text-white/40"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M7.5 21 3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5"
                    />
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
                      ? dropoffPoint.name
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
                const isSelected =
                  (selectingField === "pickup" &&
                    pickupPoint?.pointNumber === point.pointNumber) ||
                  (selectingField === "dropoff" &&
                    dropoffPoint?.pointNumber === point.pointNumber);

                const isExpanded = expandedBarangay === point.pointNumber;

                return (
                  <div key={point.pointNumber} className="mb-1">
                    <button
                      onClick={() => {
                        if (selectingField === "pickup") {
                          setPickupPoint(point);
                          setSelectingField("dropoff");
                        } else {
                          setDropoffPoint(point);
                        }
                        setSearchQuery("");
                      }}
                      className={`w-full text-left p-3 rounded-xl transition-colors ${
                        isSelected
                          ? "bg-[#1A5FB4]/20 border border-[#1A5FB4]/40"
                          : "hover:bg-white/5 border border-transparent"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${
                              isSelected
                                ? "bg-[#1A5FB4] text-white"
                                : "bg-white/5 text-white/40"
                            }`}
                          >
                            {point.pointNumber}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-white">
                              {point.name}
                            </p>
                            <p className="text-[10px] text-white/30">
                              {point.landmarks.length} landmark{point.landmarks.length !== 1 ? "s" : ""}
                            </p>
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
                          {/* Expand/collapse landmarks */}
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
                    </button>

                    {/* Expanded landmarks */}
                    {isExpanded && (
                      <div className="ml-11 mt-1 mb-2 space-y-1">
                        <p className="text-[10px] text-white/20 uppercase tracking-wider font-medium mb-1.5">
                          Landmarks in {point.name}
                        </p>
                        {point.landmarks.map((landmark, idx) => (
                          <div
                            key={idx}
                            className="flex items-center gap-2 px-2 py-1 rounded-md bg-white/[0.02]"
                          >
                            <div className="w-1.5 h-1.5 rounded-full bg-white/20" />
                            <span className="text-[11px] text-white/40">
                              {landmark}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Fare Summary & Pay Button */}
          {fareBreakdown && (
            <div className="p-5 border-t border-white/10 bg-[#050F1A]">
              {/* Fare Explanation */}
              <div className="mb-3 px-3 py-2 rounded-lg bg-white/[0.03] border border-white/5">
                <p className="text-[10px] text-white/30 leading-relaxed">
                  {fareBreakdown.barangaysTraversed} barangay{fareBreakdown.barangaysTraversed !== 1 ? "s" : ""} traversed
                  {" "}&middot; {fareBreakdown.fareExplanation}
                </p>
              </div>

              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-[10px] text-white/40 uppercase tracking-wider">
                    {fareBreakdown.pickupPoint.name} →{" "}
                    {fareBreakdown.dropoffPoint.name}
                  </p>
                </div>
                <div className="text-right">
                  {fareBreakdown.isDiscounted && (
                    <p className="text-xs text-white/30 line-through">
                      {formatCurrency(fareBreakdown.regularFare)}
                    </p>
                  )}
                  <p className="text-2xl font-extrabold text-white">
                    {formatCurrency(fareBreakdown.fare)}
                  </p>
                  {fareBreakdown.isDiscounted && (
                    <p className="text-[10px] text-green-400">
                      You save {formatCurrency(fareBreakdown.discountAmount)}
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={() => setStep("confirm")}
                className="w-full py-3.5 rounded-xl bg-[#1A5FB4] hover:bg-[#164A8F] text-white font-bold text-sm transition-colors shadow-lg shadow-[#1A5FB4]/30"
              >
                Pay with GCash
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ─── STEP: Confirm Payment ──────────────────────────────────────

  if (step === "confirm" && fareBreakdown) {
    return (
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4">
        <div className="w-full sm:max-w-sm bg-[#071A2E] rounded-2xl border border-white/10 shadow-2xl">
          <div className="p-6">
            <h2 className="text-lg font-bold text-white mb-4">
              Confirm Payment
            </h2>

            <div className="space-y-3 mb-6">
              <div className="flex justify-between text-sm">
                <span className="text-white/50">Route</span>
                <span className="text-white">
                  {fareBreakdown.pickupPoint.name} →{" "}
                  {fareBreakdown.dropoffPoint.name}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-white/50">Barangays Traversed</span>
                <span className="text-white">
                  {fareBreakdown.barangaysTraversed}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-white/50">Fare Basis</span>
                <span className="text-white/70 text-xs">
                  {fareBreakdown.fareExplanation}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-white/50">Commuter Type</span>
                <span className="text-white">
                  {getCommuterTypeLabel(commuterType)}
                </span>
              </div>
              {fareBreakdown.isDiscounted && (
                <div className="flex justify-between text-sm">
                  <span className="text-white/50">Regular Fare</span>
                  <span className="text-white/30 line-through">
                    {formatCurrency(fareBreakdown.regularFare)}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-white/50">Discount</span>
                <span className="text-green-400">
                  -{formatCurrency(fareBreakdown.discountAmount)}
                </span>
              </div>
              <div className="border-t border-white/10 pt-3 flex justify-between">
                <span className="text-white font-semibold">Total</span>
                <span className="text-xl font-extrabold text-white">
                  {formatCurrency(fareBreakdown.fare)}
                </span>
              </div>
            </div>

            {/* GCash Payment Notice */}
            <div className="bg-[#1A5FB4]/10 border border-[#1A5FB4]/20 rounded-xl p-3 mb-6">
              <div className="flex items-center gap-2 mb-1">
                <svg
                  className="w-4 h-4 text-[#62A0EA]"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z"
                  />
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

            <div className="flex gap-3">
              <button
                onClick={() => setStep("select")}
                className="flex-1 py-3 rounded-xl border border-white/10 text-white/60 text-sm font-semibold hover:bg-white/5 transition-colors"
              >
                Back
              </button>
              <button
                onClick={handlePayWithGCash}
                className="flex-1 py-3 rounded-xl bg-[#1A5FB4] hover:bg-[#164A8F] text-white text-sm font-bold transition-colors shadow-lg shadow-[#1A5FB4]/30"
              >
                Pay {formatCurrency(fareBreakdown.fare)}
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
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
        <div className="w-full max-w-xs bg-[#071A2E] rounded-2xl border border-white/10 shadow-2xl p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full border-4 border-[#1A5FB4] border-t-transparent animate-spin" />
          <h2 className="text-lg font-bold text-white mb-2">
            Processing Payment
          </h2>
          <p className="text-sm text-white/40">
            Confirming your GCash payment...
          </p>
        </div>
      </div>
    );
  }

  // ─── STEP: Success ──────────────────────────────────────────────

  if (step === "success" && fareBreakdown) {
    return (
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4">
        <div className="w-full sm:max-w-sm bg-[#071A2E] rounded-2xl border border-white/10 shadow-2xl">
          <div className="p-6 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center">
              <svg
                className="w-8 h-8 text-green-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="m4.5 12.75 6 6 9-13.5"
                />
              </svg>
            </div>
            <h2 className="text-lg font-bold text-white mb-1">
              Payment Successful!
            </h2>
            <p className="text-sm text-white/40 mb-4">
              Your fare has been paid via GCash
            </p>

            <div className="bg-white/5 rounded-xl p-4 text-left space-y-2 mb-6">
              <div className="flex justify-between text-sm">
                <span className="text-white/40">Amount Paid</span>
                <span className="text-white font-bold">
                  {formatCurrency(fareBreakdown.fare)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-white/40">Route</span>
                <span className="text-white/70">
                  {fareBreakdown.pickupPoint.name} →{" "}
                  {fareBreakdown.dropoffPoint.name}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-white/40">Barangays</span>
                <span className="text-white/70">
                  {fareBreakdown.barangaysTraversed} traversed
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-white/40">Method</span>
                <span className="text-[#62A0EA]">GCash</span>
              </div>
              {paymentIntent && (
                <div className="flex justify-between text-sm">
                  <span className="text-white/40">Ref ID</span>
                  <span className="text-white/50 text-xs font-mono">
                    {paymentIntent.id}
                  </span>
                </div>
              )}
            </div>

            <button
              onClick={onClose}
              className="w-full py-3 rounded-xl bg-[#1A5FB4] hover:bg-[#164A8F] text-white text-sm font-bold transition-colors"
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
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4">
        <div className="w-full sm:max-w-sm bg-[#071A2E] rounded-2xl border border-white/10 shadow-2xl">
          <div className="p-6 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center">
              <svg
                className="w-8 h-8 text-red-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18 18 6M6 6l12 12"
                />
              </svg>
            </div>
            <h2 className="text-lg font-bold text-white mb-1">
              Payment Failed
            </h2>
            <p className="text-sm text-white/40 mb-6">
              Could not process your GCash payment. Please try again or pay
              cash to the conductor.
            </p>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 py-3 rounded-xl border border-white/10 text-white/60 text-sm font-semibold hover:bg-white/5 transition-colors"
              >
                Close
              </button>
              <button
                onClick={() => setStep("confirm")}
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
