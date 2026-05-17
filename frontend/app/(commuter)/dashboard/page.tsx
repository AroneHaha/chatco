"use client";

import { useState, useCallback } from "react";
import dynamic from "next/dynamic";
import type { NearbyVehicle } from "@/lib/nearby-detector";
import { useAuth } from "@/contexts/auth-context";

import PaymentHistoryModal from "@/components/commuter/modals/payment-history-modal";
import ShareRideModal from "@/components/commuter/modals/share-ride-modal";
import SosModal from "@/components/commuter/modals/sos-modal";

const CommuterMap = dynamic(
  () => import("@/components/commuter/commuter-map/commuter-map"),
  { ssr: false, loading: () => <div className="absolute inset-0 bg-[#050F1A]" /> }
);

const FareCalcModal = dynamic(
  () => import("@/components/commuter/modals/fare-calc-modal"),
  { ssr: false }
);

export default function CommuterHome() {
  const { user, commuterProfile, isLoading: authLoading } = useAuth();

  const [showFareCalc, setShowFareCalc] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showShareRide, setShowShareRide] = useState(false);
  const [showSOS, setShowSOS] = useState(false);
  const [showRefund, setShowRefund] = useState(false);
  const [isHailing, setIsHailing] = useState(false);
  const [showSheet, setShowSheet] = useState(true);

  // ─── 1KM HAIL RESTRICTION ───────────────────────────────────────────
  const [nearbyVehicles, setNearbyVehicles] = useState<NearbyVehicle[]>([]);
  const canHail = nearbyVehicles.length > 0;

  const handleNearbyVehiclesChange = useCallback((vehicles: NearbyVehicle[]) => {
    setNearbyVehicles(vehicles);
  }, []);

  const handleHailToggle = () => {
    if (!isHailing && !canHail) return;
    setIsHailing(!isHailing);
  };

  // ─── Derive display values from auth context ────────────────────────
  const displayName = commuterProfile?.firstName ?? user?.email?.split("@")[0] ?? "Commuter";
  const commuterType = commuterProfile?.commuterType ?? "REGULAR";
  const commuterId = commuterProfile?.id ?? user?.id ?? "unknown";

  const quickActions = [
    {
      label: "Pay Fare",
      iconPath:
        "M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5Z",
      action: () => setShowFareCalc(true),
      isSos: false,
    },
    {
      label: "Share Ride",
      iconPath:
        "M7.217 10.907a2.25 2.25 0 1 0 0 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186 9.566-5.314m-9.566 7.5 9.566 5.314m0 0a2.25 2.25 0 1 0 3.935 2.186 2.25 2.25 0 0 0-3.935-2.186Zm0-12.814a2.25 2.25 0 1 0 3.933-2.185 2.25 2.25 0 0 0-3.933 2.185Z",
      action: () => setShowShareRide(true),
      isSos: false,
    },
    {
      label: "Refund",
      iconPath:
        "M9 15 3 9m0 0 6-6M3 9h12a6 6 0 0 1 0 12h-3",
      action: () => setShowRefund(true),
      isSos: false,
    },
    {
      label: "SOS",
      iconPath:
        "M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z",
      action: () => setShowSOS(true),
      isSos: true,
    },
  ];

  // ─── Auth loading state ─────────────────────────────────────────────
  if (authLoading) {
    return (
      <div className="h-full w-full bg-[#050F1A] flex items-center justify-center">
        <div className="w-12 h-12 rounded-full border-4 border-[#1A5FB4] border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="relative h-full w-full bg-[#050F1A]">
      {/* --- ACTUAL MAP --- */}
      <div className="absolute inset-0 z-0 lg:right-[336px] xl:right-[400px]">
        <CommuterMap onNearbyVehiclesChange={handleNearbyVehiclesChange} />
      </div>

      {/* ========================================== */}
      {/* --- MOBILE UI (Hidden on Desktop) --- */}
      {/* ========================================== */}
      <div className="lg:hidden absolute top-0 inset-x-0 z-20 p-4 flex items-center justify-between pointer-events-none">
        <div className="pointer-events-auto bg-black/40 backdrop-blur-md rounded-2xl px-4 py-3 border border-white/10">
          <h1 className="text-white font-bold text-base">
            Good morning, {displayName}!
          </h1>
          <span className="text-[10px] font-semibold text-[#62A0EA] bg-[#62A0EA]/10 px-2 py-0.5 rounded-full mt-1 inline-block">
            {commuterType === "REGULAR" ? "Regular" : commuterType === "STUDENT" ? "Student" : commuterType === "SENIOR_CITIZEN" ? "Senior Citizen" : commuterType === "PWD" ? "PWD" : commuterType}
          </span>
        </div>
        <div className="pointer-events-auto w-10 h-10 rounded-full bg-[#1A5FB4] flex items-center justify-center text-white font-bold shadow-lg border-2 border-white/20">
          {displayName[0]}
        </div>
      </div>

      <div
        className={`lg:hidden absolute bottom-0 inset-x-0 z-20 bg-[#071A2E] rounded-t-3xl border-t border-white/10 transition-transform duration-300 ease-in-out ${
          showSheet ? "translate-y-0" : "translate-y-[calc(80%-64px)]"
        }`}
      >
        <div className="absolute -top-23 right-4 z-30">
          <button
            onClick={handleHailToggle}
            disabled={!isHailing && !canHail}
            className={`w-16 h-16 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 border-4 ${
              isHailing
                ? "bg-red-500 border-red-300 shadow-red-500/50 animate-bounce"
                : canHail
                  ? "bg-[#FF6D3A] border-[#FF9A76] hover:bg-[#e55a2b] shadow-[#FF6D3A]/50"
                  : "bg-gray-600 border-gray-500 shadow-gray-600/30 opacity-50 cursor-not-allowed"
            }`}
          >
            {isHailing ? (
              <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
              </svg>
            )}
          </button>
          <span className="block text-center text-[10px] font-extrabold text-white mt-2 drop-shadow-lg uppercase tracking-wider">
            {isHailing ? "Cancel" : canHail ? "Hail Me" : "Too Far"}
          </span>
        </div>
        <div
          className="h-16 flex flex-col items-center justify-center cursor-pointer flex-shrink-0"
          onClick={() => setShowSheet(!showSheet)}
        >
          <div className={`w-10 h-1 rounded-full transition-colors duration-300 ${showSheet ? "bg-white/30" : "bg-white/60"}`} />
          {!showSheet && (
            <div className="flex items-center gap-1.5 mt-2 text-white/50">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
              </svg>
              <span className="text-[10px] font-semibold uppercase tracking-wider">Tools</span>
            </div>
          )}
        </div>
        <div className="px-5 pb-24 overflow-y-auto max-h-[60vh]">
          {/* GCash Pay Card — commuter SCANS conductor's QR */}
          <div className="bg-gradient-to-br from-[#1A5FB4] to-[#164A8F] rounded-2xl p-5 shadow-xl shadow-[#1A5FB4]/20 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-blue-400/20 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5Z" />
                </svg>
              </div>
              <p className="text-white/70 text-xs font-medium">Pay with GCash</p>
            </div>
            <p className="text-white/60 text-xs leading-relaxed">
              Scan the conductor&apos;s QR code to pay directly via GCash — no wallet needed.
            </p>
            <div className="mt-4 flex gap-3">
              <button
                onClick={() => setShowFareCalc(true)}
                className="flex-1 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white text-xs font-semibold py-2.5 rounded-lg transition-colors"
              >
                Pay Fare
              </button>
              <button
                onClick={() => setShowHistory(true)}
                className="flex-1 bg-white text-[#071A2E] text-xs font-semibold py-2.5 rounded-lg hover:bg-gray-100 transition-colors"
              >
                Payment History
              </button>
            </div>
          </div>

          {/* Quick Actions Grid */}
          <div className="grid grid-cols-4 gap-3 mt-5">
            {quickActions.map((action) => (
              <button key={action.label} onClick={action.action} className="flex flex-col items-center gap-1.5 group">
                <div className={`w-12 h-12 rounded-2xl border flex items-center justify-center transition-colors ${action.isSos ? "bg-red-500/10 border-red-500/30 group-hover:bg-red-500/20" : "bg-white/5 border-white/10 group-hover:bg-white/10"}`}>
                  <svg className={`w-6 h-6 transition-colors ${action.isSos ? "text-red-400" : "text-white/60"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d={action.iconPath} />
                  </svg>
                </div>
                <span className={`text-[10px] font-medium ${action.isSos ? "text-red-400" : "text-white/40"}`}>{action.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ========================================== */}
      {/* --- DESKTOP UI (Hidden on Mobile) --- */}
      {/* ========================================== */}
      <div className="hidden lg:flex absolute right-4 top-4 bottom-4 w-80 xl:w-96 z-20 bg-[#071A2E]/95 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl flex-col overflow-hidden">
        <div className="p-6 border-b border-white/10 flex items-center justify-between">
          <div>
            <h1 className="text-white font-bold text-lg">
              Good morning, {displayName}!
            </h1>
            <span className="text-xs font-semibold text-[#62A0EA] bg-[#62A0EA]/10 px-2 py-0.5 rounded-full mt-1 inline-block">
              {commuterType === "REGULAR" ? "Regular" : commuterType === "STUDENT" ? "Student" : commuterType === "SENIOR_CITIZEN" ? "Senior Citizen" : commuterType === "PWD" ? "PWD" : commuterType}
            </span>
          </div>
          <div className="w-11 h-11 rounded-full bg-[#1A5FB4] flex items-center justify-center text-white font-bold shadow-lg border-2 border-white/20 text-base">
            {displayName[0]}
          </div>
        </div>
        <div className="flex-1 p-6 overflow-y-auto space-y-6">
          {/* GCash Pay Card — Desktop */}
          <div className="bg-gradient-to-br from-[#1A5FB4] to-[#164A8F] rounded-2xl p-5 shadow-xl shadow-[#1A5FB4]/20 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-blue-400/20 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5Z" />
                </svg>
              </div>
              <p className="text-white/70 text-sm font-medium">Pay with GCash</p>
            </div>
            <p className="text-white/60 text-xs leading-relaxed">
              Scan the conductor&apos;s QR code to pay directly via GCash — no wallet needed.
            </p>
            <div className="mt-4 flex gap-3">
              <button
                onClick={() => setShowFareCalc(true)}
                className="flex-1 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white text-sm font-semibold py-2.5 rounded-lg transition-colors"
              >
                Pay Fare
              </button>
              <button
                onClick={() => setShowHistory(true)}
                className="flex-1 bg-white text-[#071A2E] text-sm font-semibold py-2.5 rounded-lg hover:bg-gray-100 transition-colors"
              >
                Payment History
              </button>
            </div>
          </div>

          {/* Nearby Vehicles Indicator */}
          {!canHail && (
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-3">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
                </svg>
                <span className="text-xs font-semibold text-yellow-400">No vehicles within 1KM</span>
              </div>
              <p className="text-[10px] text-white/40 mt-1">Hail is disabled until a vehicle is within range.</p>
            </div>
          )}

          {/* Quick Actions */}
          <div>
            <h3 className="text-xs font-semibold text-white/30 uppercase tracking-wider mb-3">Quick Actions</h3>
            <div className="grid grid-cols-2 gap-3">
              {quickActions.map((action) => (
                <button key={action.label} onClick={action.action} className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${action.isSos ? "bg-red-500/10 border-red-500/30 hover:bg-red-500/20" : "bg-white/5 border-white/10 hover:bg-white/10"}`}>
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${action.isSos ? "bg-red-500/20" : "bg-white/5"}`}>
                    <svg className={`w-5 h-5 ${action.isSos ? "text-red-400" : "text-white/60"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d={action.iconPath} />
                    </svg>
                  </div>
                  <span className={`text-sm font-medium ${action.isSos ? "text-red-400" : "text-white/80"}`}>{action.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="p-6 border-t border-white/10">
          <button
            onClick={handleHailToggle}
            disabled={!isHailing && !canHail}
            className={`w-full flex items-center justify-center gap-3 py-4 rounded-xl text-base font-bold transition-all duration-300 ${
              isHailing
                ? "bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/40"
                : canHail
                  ? "bg-[#FF6D3A] hover:bg-[#e55a2b] shadow-lg shadow-[#FF6D3A]/40 text-white"
                  : "bg-gray-600 text-gray-300 cursor-not-allowed shadow-none"
            }`}
          >
            {isHailing ? (
              <>
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>{" "}
                Cancel Hail
              </>
            ) : (
              <>
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
                </svg>{" "}
                {canHail ? "Hail Me" : "No Vehicle in Range"}
              </>
            )}
          </button>
        </div>
      </div>

      {/* --- MODALS --- */}
      {showFareCalc && (
        <FareCalcModal onClose={() => setShowFareCalc(false)} />
      )}
      {showHistory && (
        <PaymentHistoryModal onClose={() => setShowHistory(false)} />
      )}
      {showShareRide && (
        <ShareRideModal
          commuterName={displayName}
          onClose={() => setShowShareRide(false)}
        />
      )}
      {showSOS && (
        <SosModal
          commuterId={commuterId}
          commuterName={displayName}
          onClose={() => setShowSOS(false)}
        />
      )}
    </div>
  );
}
