"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import type { NearbyVehicle, GpsStatus } from "@/lib/shared/geo/nearby-detector";
import { useAuth } from "@/contexts/auth-context";
import { createHail, cancelHail, isOutsideRadiusError } from "@/lib/commuter/services/hail.service";
import { ApiError, NetworkError } from "@/lib/api/client";

import PaymentHistoryModal from "@/components/commuter/modals/payment-history-modal";
import ShareRideModal from "@/components/commuter/modals/share-ride-modal";
import SosModal from "@/components/commuter/modals/sos-modal";

const CommuterMap = dynamic(
  () => import("@/components/commuter/commuter-map/commuter-map"),
  { ssr: false, loading: () => <div className="absolute inset-0 bg-[#050F1A]" /> }
);

const ScanModal = dynamic(
  () => import("@/components/commuter/modals/scan-modal"),
  { ssr: false }
);

// How long a hail stays active before auto-turning-off. Matches the backend
// hails TTL (hails:expire) so the commuter's indicator and the conductor's pin
// clear at the same time.
const HAIL_DURATION_MS = 3 * 60 * 1000;
// Cadence of the vibrate + beep reminder while a hail is active.
const REMINDER_INTERVAL_MS = 4000;

export default function CommuterHome() {
  const { user, commuterProfile, isLoading: authLoading } = useAuth();

  const [showScan, setShowScan] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showShareRide, setShowShareRide] = useState(false);
  const [showSOS, setShowSOS] = useState(false);

  const [isHailing, setIsHailing] = useState(false);
  const [showSheet, setShowSheet] = useState(true);

  // ─── HAIL REQUEST STATE ─────────────────────────────────────────────
  // The active hail's id (so we can cancel it), an in-flight flag, and the
  // last error to surface in the UI.
  const [activeHailId, setActiveHailId] = useState<string | null>(null);
  const [hailPending, setHailPending] = useState(false);
  const [hailError, setHailError] = useState<string | null>(null);

  // ─── CONDUCTOR RADIUS + GPS TRACKING ────────────────────────────────
  const [nearbyVehicles, setNearbyVehicles] = useState<NearbyVehicle[]>([]);
  const [gpsStatus, setGpsStatus] = useState<GpsStatus>("loading");
  const [commuterLocation, setCommuterLocation] = useState<[number, number] | null>(null);

  // canHail requires BOTH: GPS available AND commuter within conductor radius
  const canHail = gpsStatus === "available" && nearbyVehicles.length > 0;
  const nearestVehicle = canHail ? nearbyVehicles[0] : null;

  const handleNearbyVehiclesChange = useCallback(
    (vehicles: NearbyVehicle[], status: GpsStatus, location: [number, number] | null) => {
      setNearbyVehicles(vehicles);
      setGpsStatus(status);
      setCommuterLocation(location);
    },
    []
  );

  // ─── Vibrate + sound reminder helpers ───────────────────────────────
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Soft beep via Web Audio. The AudioContext is created on the hail tap
  // (a user gesture), which satisfies browser autoplay policies.
  const playBeep = useCallback(() => {
    try {
      if (!audioCtxRef.current) {
        const Ctx =
          window.AudioContext ??
          (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!Ctx) return;
        audioCtxRef.current = new Ctx();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === "suspended") void ctx.resume();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.15, ctx.currentTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.25);
      osc.connect(gain).connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.26);
    } catch {
      /* audio unavailable — ignore */
    }
  }, []);

  const vibrate = useCallback(() => {
    // navigator.vibrate is Android/Chrome only; iOS Safari ignores it (sound
    // is the fallback there).
    if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
      navigator.vibrate([200, 100, 200]);
    }
  }, []);

  // Turn the hail off: best-effort cancel on the backend (it may already have
  // auto-expired, so errors are swallowed) then clear local state.
  const stopHail = useCallback(async () => {
    const id = activeHailId;
    setIsHailing(false);
    setActiveHailId(null);
    if (id) {
      try {
        await cancelHail(id);
      } catch {
        /* already expired / offline — backend TTL reconciles the record */
      }
    }
  }, [activeHailId]);

  const startHail = useCallback(async () => {
    if (!canHail || !nearestVehicle || !commuterLocation) return;
    setHailPending(true);
    setHailError(null);
    try {
      const hail = await createHail(
        nearestVehicle.id,
        commuterLocation[0],
        commuterLocation[1]
      );
      setActiveHailId(hail.id);
      setIsHailing(true);
      // Immediate confirmation buzz + beep (also unlocks the AudioContext).
      vibrate();
      playBeep();
    } catch (err) {
      if (err instanceof ApiError && isOutsideRadiusError(err.body)) {
        setHailError(
          `You're too far — about ${Math.round(err.body.distance_m)}m away. Move within 1km to hail.`
        );
      } else if (err instanceof ApiError && err.status === 409) {
        setHailError("You already have a pending hail.");
      } else if (err instanceof ApiError || err instanceof NetworkError) {
        setHailError("Unable to send the hail. Please try again.");
      } else {
        setHailError("Something went wrong sending the hail.");
      }
    } finally {
      setHailPending(false);
    }
  }, [canHail, nearestVehicle, commuterLocation, vibrate, playBeep]);

  const handleHailToggle = useCallback(() => {
    if (hailPending) return;
    if (isHailing) {
      void stopHail();
    } else {
      void startHail();
    }
  }, [hailPending, isHailing, stopHail, startHail]);

  // While a hail is active: repeat the vibrate + beep reminder so the commuter
  // doesn't forget it's on, and auto-turn-off after the TTL.
  useEffect(() => {
    if (!isHailing) return;

    const reminderId = window.setInterval(() => {
      vibrate();
      playBeep();
    }, REMINDER_INTERVAL_MS);

    const autoOffId = window.setTimeout(() => {
      void stopHail();
    }, HAIL_DURATION_MS);

    return () => {
      window.clearInterval(reminderId);
      window.clearTimeout(autoOffId);
      if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
        navigator.vibrate(0); // stop any ongoing vibration
      }
    };
  }, [isHailing, vibrate, playBeep, stopHail]);

  // ─── Derive display values from auth context ────────────────────────
  const displayName = commuterProfile?.firstName ?? user?.email?.split("@")[0] ?? "Commuter";
  const commuterType = commuterProfile?.commuterType ?? "REGULAR";
  const commuterId = commuterProfile?.id ?? user?.id ?? "unknown";

  const quickActions = [
    {
      label: "Share Ride",
      iconPath:
        "M7.217 10.907a2.25 2.25 0 1 0 0 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186 9.566-5.314m-9.566 7.5 9.566 5.314m0 0a2.25 2.25 0 1 0 3.935 2.186 2.25 2.25 0 0 0-3.935-2.186Zm0-12.814a2.25 2.25 0 1 0 3.933-2.185 2.25 2.25 0 0 0-3.933 2.185Z",
      action: () => setShowShareRide(true),
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
            disabled={hailPending || (!isHailing && !canHail)}
            className={`w-16 h-16 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 border-4 disabled:cursor-not-allowed ${
              isHailing
                ? "bg-red-500 border-red-300 shadow-red-500/50 animate-bounce"
                : canHail
                  ? "bg-[#FF6D3A] border-[#FF9A76] hover:bg-[#e55a2b] shadow-[#FF6D3A]/50"
                  : "bg-gray-600 border-gray-500 shadow-gray-600/30 opacity-50 cursor-not-allowed"
            } ${hailPending ? "opacity-70" : ""}`}
          >
            {hailPending ? (
              <span className="w-7 h-7 rounded-full border-[3px] border-white/40 border-t-white animate-spin" />
            ) : isHailing ? (
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
            {hailPending ? (isHailing ? "Cancelling…" : "Sending…") : isHailing ? "Cancel" : canHail ? "Hail Me" : gpsStatus === "loading" ? "Locating..." : gpsStatus === "denied" ? "No GPS" : "Too Far"}
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
          {/* --- ETA / STATUS SECTION (Mobile) --- */}
          {gpsStatus === "loading" && (
            <div className="bg-white/5 border border-white/10 rounded-xl p-3 mb-3 flex items-center gap-2.5">
              <div className="w-4 h-4 rounded-full border-2 border-[#62A0EA] border-t-transparent animate-spin flex-shrink-0" />
              <span className="text-xs text-white/50">Locating you...</span>
            </div>
          )}

          {gpsStatus === "denied" && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 mb-3">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-red-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
                </svg>
                <span className="text-xs font-semibold text-red-400">Location access denied</span>
              </div>
              <p className="text-[10px] text-white/40 mt-1">Enable location to see ETA and hail vehicles.</p>
            </div>
          )}

          {gpsStatus === "unavailable" && (
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-3 mb-3">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-yellow-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
                </svg>
                <span className="text-xs font-semibold text-yellow-400">Location unavailable</span>
              </div>
              <p className="text-[10px] text-white/40 mt-1">GPS is not available on this device.</p>
            </div>
          )}

          {gpsStatus === "available" && canHail && nearestVehicle && (
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 mb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Live</span>
                </div>
                <span className="text-lg font-extrabold text-white">~{nearestVehicle.estimatedArrivalMinutes} min</span>
              </div>
              <div className="flex items-center justify-between mt-1.5">
                <span className="text-[10px] text-white/40">{nearestVehicle.plateNumber}</span>
                <span className="text-[10px] text-white/50">{(nearestVehicle.distanceInMeters / 1000).toFixed(1)} km away</span>
              </div>
            </div>
          )}

          {gpsStatus === "available" && !canHail && (
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-3 mb-3">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-yellow-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
                </svg>
                <span className="text-xs font-semibold text-yellow-400">Outside service radius</span>
              </div>
              <p className="text-[10px] text-white/40 mt-1">Move within 1km of a conductor unit to hail.</p>
            </div>
          )}

          {hailError && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 mb-3">
              <p className="text-xs font-semibold text-red-400">{hailError}</p>
            </div>
          )}

          {/* GCash Pay Card — commuter SCANS conductor's QR */}
          <div
            onClick={() => setShowScan(true)}
            className="relative rounded-2xl border border-white/10 bg-gradient-to-br from-[#1A5FB4] to-[#123B6E] overflow-hidden cursor-pointer hover:from-[#1E6BC6] hover:to-[#154782] active:scale-[0.98] transition-all shadow-lg shadow-[#1A5FB4]/20"
          >
            {/* Subtle decorative circle */}
            <div className="absolute top-0 right-0 w-40 h-40 bg-white/[0.04] rounded-full -translate-y-1/2 translate-x-1/3" />
            <div className="relative p-5 flex items-center gap-4">
              {/* QR Scan visual */}
              <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-sm flex items-center justify-center flex-shrink-0 border border-white/10">
                <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0 1 3.75 9.375v-4.5ZM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 0 1-1.125-1.125v-4.5ZM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0 1 13.5 9.375v-4.5Z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 6.75h.75v.75h-.75v-.75ZM6.75 16.5h.75v.75h-.75v-.75ZM16.5 6.75h.75v.75h-.75v-.75ZM13.5 13.5h.75v.75h-.75v-.75ZM13.5 19.5h.75v.75h-.75v-.75ZM19.5 13.5h.75v.75h-.75v-.75ZM19.5 19.5h.75v.75h-.75v-.75ZM16.5 16.5h.75v.75h-.75v-.75Z" />
                </svg>
              </div>
              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="text-white text-lg font-bold leading-tight">Pay with GCash</p>
                  <button
                    onClick={(e) => { e.stopPropagation(); setShowHistory(true); }}
                    className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors border border-white/10"
                    title="Payment History"
                  >
                    <svg className="w-4 h-4 text-white/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                    </svg>
                  </button>
                </div>
                <p className="text-white/50 text-[11px] mt-1 leading-snug">
                  Tap to scan conductor&apos;s QR code
                </p>
                <div className="flex items-center gap-1.5 mt-2.5">
                  <span className="inline-flex items-center gap-1 bg-white/15 backdrop-blur-sm text-white text-[10px] font-semibold py-1 px-2.5 rounded-full">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 3.75H6A2.25 2.25 0 0 0 3.75 6v1.5M16.5 3.75H18A2.25 2.25 0 0 1 20.25 6v1.5m0 9V18A2.25 2.25 0 0 1 18 20.25h-1.5m-9 0H6A2.25 2.25 0 0 1 3.75 18v-1.5" />
                    </svg>
                    Scan to Pay
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions Grid */}
          <div className="grid grid-cols-2 gap-3 mt-4">
            {quickActions.map((action) => (
              <button key={action.label} onClick={action.action} className={`flex items-center justify-center gap-2 py-2.5 rounded-xl transition-colors ${action.isSos ? "bg-red-500/10 hover:bg-red-500/20 border border-red-500/20" : "bg-white/5 hover:bg-white/10 border border-white/10"}`}>
                <svg className={`w-4 h-4 ${action.isSos ? "text-red-400" : "text-blue-300"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d={action.iconPath} />
                </svg>
                <span className={`text-xs font-semibold ${action.isSos ? "text-red-400" : "text-white/70"}`}>{action.label}</span>
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
          <div
            onClick={() => setShowScan(true)}
            className="relative rounded-2xl border border-white/10 bg-gradient-to-br from-[#1A5FB4] to-[#123B6E] overflow-hidden cursor-pointer hover:from-[#1E6BC6] hover:to-[#154782] active:scale-[0.98] transition-all shadow-lg shadow-[#1A5FB4]/20"
          >
            {/* Subtle decorative circle */}
            <div className="absolute top-0 right-0 w-40 h-40 bg-white/[0.04] rounded-full -translate-y-1/2 translate-x-1/3" />
            <div className="relative p-5 flex items-center gap-5">
              {/* QR Scan visual */}
              <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-sm flex items-center justify-center flex-shrink-0 border border-white/10">
                <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0 1 3.75 9.375v-4.5ZM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 0 1-1.125-1.125v-4.5ZM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0 1 13.5 9.375v-4.5Z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 6.75h.75v.75h-.75v-.75ZM6.75 16.5h.75v.75h-.75v-.75ZM16.5 6.75h.75v.75h-.75v-.75ZM13.5 13.5h.75v.75h-.75v-.75ZM13.5 19.5h.75v.75h-.75v-.75ZM19.5 13.5h.75v.75h-.75v-.75ZM19.5 19.5h.75v.75h-.75v-.75ZM16.5 16.5h.75v.75h-.75v-.75Z" />
                </svg>
              </div>
              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="text-white text-lg font-bold leading-tight">Pay with GCash</p>
                  <button
                    onClick={(e) => { e.stopPropagation(); setShowHistory(true); }}
                    className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors border border-white/10"
                    title="Payment History"
                  >
                    <svg className="w-4 h-4 text-white/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                    </svg>
                  </button>
                </div>
                <p className="text-white/50 text-xs mt-1 leading-snug">
                  Tap to scan conductor&apos;s QR code
                </p>
                <div className="flex items-center gap-1.5 mt-3">
                  <span className="inline-flex items-center gap-1.5 bg-white/15 backdrop-blur-sm text-white text-xs font-semibold py-1.5 px-3 rounded-full">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 3.75H6A2.25 2.25 0 0 0 3.75 6v1.5M16.5 3.75H18A2.25 2.25 0 0 1 20.25 6v1.5m0 9V18A2.25 2.25 0 0 1 18 20.25h-1.5m-9 0H6A2.25 2.25 0 0 1 3.75 18v-1.5" />
                    </svg>
                    Scan to Pay
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* --- ETA / STATUS SECTION (Desktop) --- */}
          {gpsStatus === "loading" && (
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center gap-3">
              <div className="w-5 h-5 rounded-full border-2 border-[#62A0EA] border-t-transparent animate-spin flex-shrink-0" />
              <div>
                <span className="text-sm text-white/60">Locating you...</span>
                <p className="text-[10px] text-white/30 mt-0.5">Waiting for GPS signal</p>
              </div>
            </div>
          )}

          {gpsStatus === "denied" && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-red-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
                </svg>
                <span className="text-sm font-semibold text-red-400">Location access denied</span>
              </div>
              <p className="text-xs text-white/40 mt-1.5">Enable location permission to see ETA and hail vehicles.</p>
            </div>
          )}

          {gpsStatus === "unavailable" && (
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-yellow-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
                </svg>
                <span className="text-sm font-semibold text-yellow-400">Location unavailable</span>
              </div>
              <p className="text-xs text-white/40 mt-1.5">GPS is not available on this device.</p>
            </div>
          )}

          {gpsStatus === "available" && canHail && nearestVehicle && (
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Live Tracking</span>
                </div>
                <span className="text-2xl font-extrabold text-white">~{nearestVehicle.estimatedArrivalMinutes} min</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-white/40">{nearestVehicle.plateNumber}</span>
                <span className="text-xs text-white/50">{(nearestVehicle.distanceInMeters / 1000).toFixed(1)} km away</span>
              </div>
              {nearbyVehicles.length > 1 && (
                <p className="text-[10px] text-emerald-400/60 mt-2">+{nearbyVehicles.length - 1} more vehicle{nearbyVehicles.length > 2 ? "s" : ""} in range</p>
              )}
            </div>
          )}

          {gpsStatus === "available" && !canHail && (
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-yellow-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
                </svg>
                <span className="text-sm font-semibold text-yellow-400">You are outside the conductor service radius</span>
              </div>
              <p className="text-xs text-white/40 mt-1.5">Move within 1km of a conductor unit to see ETA and hail. Vehicle locations are still visible on the map.</p>
            </div>
          )}

          {/* Quick Actions */}
          <div>
            <h3 className="text-xs font-semibold text-white/30 uppercase tracking-wider mb-2">Quick Actions</h3>
            <div className="grid grid-cols-2 gap-3">
              {quickActions.map((action) => (
                <button key={action.label} onClick={action.action} className={`flex items-center justify-center gap-2 py-2.5 rounded-xl transition-colors ${action.isSos ? "bg-red-500/10 hover:bg-red-500/20 border border-red-500/20" : "bg-white/5 hover:bg-white/10 border border-white/10"}`}>
                  <svg className={`w-4 h-4 ${action.isSos ? "text-red-400" : "text-blue-300"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d={action.iconPath} />
                  </svg>
                  <span className={`text-xs font-semibold ${action.isSos ? "text-red-400" : "text-white/70"}`}>{action.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="p-6 border-t border-white/10">
          {hailError && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 mb-3">
              <p className="text-xs font-semibold text-red-400">{hailError}</p>
            </div>
          )}
          <button
            onClick={handleHailToggle}
            disabled={hailPending || (!isHailing && !canHail)}
            className={`w-full flex items-center justify-center gap-3 py-4 rounded-xl text-base font-bold transition-all duration-300 disabled:cursor-not-allowed ${
              isHailing
                ? "bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/40"
                : canHail
                  ? "bg-[#FF6D3A] hover:bg-[#e55a2b] shadow-lg shadow-[#FF6D3A]/40 text-white"
                  : "bg-gray-600 text-gray-300 cursor-not-allowed shadow-none"
            } ${hailPending ? "opacity-70" : ""}`}
          >
            {hailPending ? (
              <>
                <span className="w-6 h-6 rounded-full border-[3px] border-white/40 border-t-white animate-spin" />{" "}
                {isHailing ? "Cancelling…" : "Sending…"}
              </>
            ) : isHailing ? (
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
                {gpsStatus === "loading" ? "Locating..." : gpsStatus === "denied" || gpsStatus === "unavailable" ? "No GPS Access" : canHail ? "Hail Me" : "Outside Service Radius"}
              </>
            )}
          </button>
        </div>
      </div>

      {/* --- MODALS --- */}
      {showScan && (
        <ScanModal
          commuterId={commuterId}
          commuterName={displayName}
          onClose={() => setShowScan(false)}
        />
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