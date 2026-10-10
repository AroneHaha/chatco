"use client";

// components/conductor/modals/sos-confirm-modal.tsx
//
// Conductor Emergency SOS modal — wired to the real Laravel backend.
//
// Flow (mirrors the commuter SOS modal):
//   confirming  → conductor taps "Send SOS"
//   locating    → navigator.geolocation.getCurrentPosition (high accuracy, 6s)
//   sending     → POST /api/conductor/sos { lat, lng, note? }
//   active      → polling GET /api/conductor/sos/{id} every 3s, waiting for admin
//   responded   → admin resolved → success screen on any conductor module
//   error       → network/API error (GPS failure falls back to a default coord)
//
// GPS FALLBACK: if geolocation is unavailable/denied/times out (common on
// desktop/cloud previews), the SOS is still sent using a default route-centre
// coordinate so the alert always reaches the admin and a marker always appears
// on the monitoring map.

import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { Check, Clock3, Info, LoaderCircle, Phone, ShieldAlert } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { clearSosSession, readSosSession, saveSosSession } from "@/lib/shared/sos-session";
import SosActions from "@/components/shared/sos-actions";

interface SosConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onResolved: () => void;
}

type SosStatus =
  | "confirming"
  | "locating"
  | "sending"
  | "active"
  | "acknowledged"
  | "stopped"
  | "responded"
  | "error";

interface AlertPayload {
  id: string;
  status: "ACTIVE" | "ACKNOWLEDGED" | "RESOLVED";
  /** Admin-configured emergency hotline, returned when the SOS is sent. */
  emergency_hotline?: string | null;
}

const POLL_INTERVAL_MS = 3000;

// Default fallback coordinate — Meycauayan area, central on the CHATCO route.
// Used only when the device GPS is unavailable so the SOS still goes through.
const DEFAULT_LOCATION: { lat: number; lng: number } = { lat: 14.8434, lng: 120.875 };

export default function SosConfirmModal({
  isOpen,
  onClose,
  onResolved,
}: SosConfirmModalProps) {
  const { user } = useAuth();
  const userId = user?.id;
  const [savedSession] = useState(() => readSosSession("conductor", userId));
  const [status, setStatus] = useState<SosStatus>(savedSession ? "active" : "confirming");
  const [activeSeconds, setActiveSeconds] = useState(() => savedSession ? Math.max(0, Math.floor((Date.now() - savedSession.startedAt) / 1000)) : 0);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [alertId, setAlertId] = useState<string | null>(savedSession?.id ?? null);
  const settledAlertRef = useRef<string | null>(null);
  const isAlertActive = status === "active" || status === "acknowledged";
  const [hotline, setHotline] = useState<string | null>(savedSession?.hotline ?? null);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const handleClose = () => {
    if (!isAlertActive) {
      setStatus("confirming");
      setActiveSeconds(0);
      setErrorMessage("");
      setAlertId(null);
      setHotline(null);
    }
    onClose();
  };

  // Active-state elapsed timer.
  useEffect(() => {
    if (isAlertActive) {
      timerRef.current = setInterval(() => setActiveSeconds((p) => p + 1), 1000);
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isAlertActive]);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const pollAlert = useCallback(
    async (id: string) => {
      try {
        const res = await fetch(`/api/conductor/sos/${id}`, { credentials: "include" });
        if (!res.ok) return; // keep polling on transient errors
        const data = await res.json();
        const alert: AlertPayload | undefined = data.data;
        if (!alert || settledAlertRef.current === id) return;
        if (alert.status === "ACKNOWLEDGED") setStatus("acknowledged");
        if (alert.status === "RESOLVED") {
          settledAlertRef.current = id;
          clearSosSession("conductor", userId);
          stopPolling();
          setAlertId(null);
          setStatus("responded");
          onResolved();
        }
      } catch {
        // Network blip — keep polling, the admin may still respond.
      }
    },
    [stopPolling, userId, onResolved]
  );

  useEffect(() => {
    let initialPoll: ReturnType<typeof setTimeout> | undefined;
    if (isAlertActive && alertId) {
      initialPoll = setTimeout(() => void pollAlert(alertId), 0);
      pollRef.current = setInterval(() => void pollAlert(alertId), POLL_INTERVAL_MS);
    }
    return () => {
      clearTimeout(initialPoll);
      stopPolling();
    };
  }, [isAlertActive, alertId, pollAlert, stopPolling]);

  // Clean up polling on unmount.
  useEffect(() => stopPolling, [stopPolling]);

  const handleStop = async () => {
    if (!alertId) throw new Error("No active SOS to stop.");
    const res = await fetch(`/api/conductor/sos/${encodeURIComponent(alertId)}/stop`, { method: "PATCH", credentials: "include" });
    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error(data?.message ?? "Unable to stop SOS. Please try again.");
    if (data?.data?.status !== "RESOLVED") throw new Error("SOS is still active. Please try again.");
    settledAlertRef.current = alertId;
    stopPolling();
    clearSosSession("conductor", userId);
    setAlertId(null);
    setStatus("stopped");
  };

  // POST the SOS to the backend.
  const sendSos = useCallback(async (lat: number, lng: number) => {
    setStatus("sending");
    try {
      const res = await fetch("/api/conductor/sos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ lat, lng }),
      });

      if (res.status === 401) {
        setStatus("error");
        setErrorMessage("Your session has expired. Please log in again to send an SOS.");
        return;
      }
      if (res.status === 429) {
        setStatus("error");
        setErrorMessage("You've already sent an SOS recently. Please wait before trying again.");
        return;
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setStatus("error");
        setErrorMessage(data.message ?? "Unable to send the SOS signal. Please try again.");
        return;
      }

      const data = await res.json();
      const alert: AlertPayload | undefined = data.data;
      if (!alert) {
        setStatus("error");
        setErrorMessage("The server did not return an alert. Please try again.");
        return;
      }

      if (alert.status === "RESOLVED") {
        clearSosSession("conductor", userId);
        setStatus("responded");
        onResolved();
        return;
      }

      saveSosSession("conductor", userId, { id: alert.id, startedAt: Date.now(), hotline: alert.emergency_hotline ?? null });
      setAlertId(alert.id);
      setHotline(alert.emergency_hotline ?? null);
      setStatus(alert.status === "ACKNOWLEDGED" ? "acknowledged" : "active");
    } catch {
      setStatus("error");
      setErrorMessage("Network error. Please check your connection and try again.");
    }
  }, [userId, onResolved]);

  // Trigger: capture GPS (falling back to a default coord), then POST.
  const handleActivate = useCallback(() => {
    setStatus("locating");
    setErrorMessage("");

    if (typeof navigator === "undefined" || !navigator.geolocation) {
      void sendSos(DEFAULT_LOCATION.lat, DEFAULT_LOCATION.lng);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        void sendSos(latitude, longitude);
      },
      () => {
        // GPS denied / unavailable / timed out → fall back to default.
        void sendSos(DEFAULT_LOCATION.lat, DEFAULT_LOCATION.lng);
      },
      { enableHighAccuracy: true, timeout: 6000, maximumAge: 0 }
    );
  }, [sendSos]);

  const handleRetry = () => {
    setErrorMessage("");
    setAlertId(null);
    setActiveSeconds(0);
    setStatus("confirming");
  };

  const formatTimer = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  if (!isOpen || typeof document === "undefined") return null;

  // Keep the overlay outside the transformed, scrolling Settings popover.
  return createPortal(
    <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center p-0 sm:p-4">
      {/* Cannot click to close while an SOS is in flight. */}
      <div
        className={`absolute inset-0 backdrop-blur-sm animate-modal-backdrop-in transition-colors duration-500 ${
          isAlertActive || status === "stopped" ? "bg-[#020812]/80" : "bg-black/60"
        }`}
        onClick={status === "confirming" ? handleClose : undefined}
      />

      {/* Modal Card */}
      <div key={isAlertActive ? "active" : "inactive"} role="dialog" aria-modal="true" aria-label="Emergency SOS" className={`relative sm:rounded-3xl rounded-t-3xl shadow-2xl w-full sm:max-w-md animate-modal-panel-in pb-safe transition-colors duration-300 ${
        isAlertActive || status === "stopped" ? "max-h-[90dvh] overflow-y-auto modal-scroll border border-white/10 bg-[#071A2E] shadow-black/40" : status === "locating" || status === "sending" ? "overflow-hidden border-2 bg-white border-red-500" : "overflow-hidden border-2 bg-[#1A2540] border-[#2A3A55]"
      }`}>

        {status === "confirming" && (
          /* --- CONFIRMATION STATE --- */
          <div className="p-6 text-center">
            <div className="w-20 h-20 rounded-full bg-red-500/15 border-2 border-red-500/25 flex items-center justify-center mx-auto mb-5">
              <svg className="w-10 h-10 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
              </svg>
            </div>

            <h2 className="text-xl font-extrabold text-white mb-2">Send Emergency SOS?</h2>
            <p className="text-sm text-white/40 leading-relaxed mb-8">
              This will immediately share your <span className="font-bold text-white">real-time live location</span> with the CHATCO Admin dispatch team.
              <br /><br />
              <span className="text-red-400 font-semibold">Only use this in actual emergencies.</span>
            </p>

            <div className="flex gap-3">
              <button onClick={handleClose} className="flex-1 px-4 py-3.5 rounded-xl text-sm font-semibold border border-white/10 text-white/70 hover:bg-white/10 transition-colors">
                Cancel
              </button>
              <button onClick={handleActivate} className="flex-1 px-4 py-3.5 rounded-xl text-sm font-bold bg-red-500 text-white hover:bg-red-600 transition-colors shadow-lg shadow-red-500/30 flex items-center justify-center gap-2">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" /></svg>
                Send SOS
              </button>
            </div>
          </div>
        )}

        {status === "locating" && (
          /* --- LOCATING (getting GPS) --- */
          <div className="p-6 text-center">
            <div className="relative w-28 h-28 mx-auto mb-6 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full bg-red-500/10 animate-ping" />
              <div className="relative w-20 h-20 rounded-full bg-red-100 flex items-center justify-center">
                <svg className="w-9 h-9 text-red-500 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
                </svg>
              </div>
            </div>
            <h2 className="text-xl font-extrabold text-[#071A2E] mb-1">Getting your location…</h2>
            <p className="text-sm text-gray-500 leading-relaxed">
              Please allow location access. We need your GPS coordinates to direct respondents to you.
            </p>
            <div className="mt-6 w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-red-500 animate-pulse" style={{ width: "65%" }} />
            </div>
          </div>
        )}

        {status === "sending" && (
          /* --- SENDING (POSTing to backend) --- */
          <div className="p-6 text-center">
            <div className="w-20 h-20 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-5 border-2 border-red-100">
              <div className="w-8 h-8 border-2 border-red-200 border-t-red-600 rounded-full animate-spin" />
            </div>
            <h2 className="text-xl font-extrabold text-[#071A2E] mb-1">Sending distress signal…</h2>
            <p className="text-sm text-gray-500">Transmitting your location to the CHATCO Admin team.</p>
          </div>
        )}

        {isAlertActive && (
          /* --- ACTIVE/TRACKING STATE (LOCKED SCREEN) --- */
          <div>
            <div aria-hidden="true" className="h-1 bg-red-500/80" />
            <div className="p-5 sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-red-400/20 bg-red-500/10 text-red-300">
                  <ShieldAlert size={23} aria-hidden="true" />
                </span>
              </div>

              <h2 className="mt-5 text-2xl font-bold tracking-tight text-white">SOS is active</h2>
              <p className="mt-2 text-sm leading-relaxed text-white/55">Your emergency alert has been sent to CHATCO dispatch.</p>

              <div className="mt-6 rounded-2xl border border-white/10 bg-[#050F1A]/60 px-5 py-5">
                <p className="flex items-center gap-2 text-xs font-medium text-white/45"><Clock3 size={14} aria-hidden="true" />Time elapsed</p>
                <p role="timer" aria-label="Time since SOS was sent" className="mt-3 text-4xl font-semibold leading-none tracking-tight text-white tabular-nums">{formatTimer(activeSeconds)}</p>
                <div role="status" className="mt-5 border-t border-white/10 pt-4">
                  <div className="flex items-center gap-2 text-xs text-white/60"><Check size={15} aria-hidden="true" className="shrink-0 text-emerald-400" />Alert sent</div>
                  <div className="mt-3 flex items-center gap-2 text-sm font-medium text-[#B6D3F6]">{status === "acknowledged" ? <Check size={15} aria-hidden="true" className="shrink-0 text-emerald-400" /> : <LoaderCircle size={15} aria-hidden="true" className="shrink-0 animate-spin motion-reduce:animate-none" />}{status === "acknowledged" ? "Dispatch has received your alert" : "Waiting for dispatch to respond"}</div>
                </div>
              </div>

              {hotline && (
                <a
                  href={`tel:${hotline.replace(/[^\d+]/g, "")}`}
                  className="mt-5 flex min-h-14 items-center justify-center gap-3 rounded-xl bg-red-500 px-4 py-3 text-white transition-colors hover:bg-red-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#071A2E]"
                >
                  <Phone size={19} aria-hidden="true" className="shrink-0" />
                  <span className="min-w-0 text-center"><span className="block text-sm font-semibold">Call emergency hotline</span><span className="mt-0.5 block break-words text-xs text-white/75">{hotline}</span></span>
                </a>
              )}

              <div className="mt-5 flex items-start gap-2.5 text-xs leading-relaxed text-white/45">
                <Info size={15} aria-hidden="true" className="mt-0.5 shrink-0 text-white/35" />
                <p>You can close this screen. Your SOS stays active and dispatch can still respond.</p>
              </div>
              <SosActions onClose={handleClose} onStop={handleStop} />
            </div>
          </div>
        )}

        {status === "stopped" && (
          <div className="p-6 text-center">
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-emerald-400/20 bg-emerald-500/10 text-emerald-300"><Check size={26} aria-hidden="true" /></div>
            <h2 className="text-2xl font-bold tracking-tight text-white">SOS stopped</h2>
            <p className="mt-2 text-sm leading-relaxed text-white/55">Your alert is closed. Dispatch has been notified.</p>
            <button type="button" onClick={handleClose} className="mt-6 min-h-11 w-full rounded-xl bg-[#1A5FB4] px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#164A8F]">Done</button>
          </div>
        )}

        {status === "responded" && (
          /* --- RESPONDED STATE --- */
          <div className="p-6 text-center animate-in fade-in duration-300">
            <div className="w-20 h-20 rounded-full bg-[#F0FDF4] flex items-center justify-center mx-auto mb-5 border-2 border-green-100">
              <svg className="w-10 h-10 text-[#22C55E]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
              </svg>
            </div>

            <h2 className="text-xl font-extrabold text-white mb-2">SOS closed</h2>
            <p className="text-sm text-gray-500 leading-relaxed mb-8">
              Dispatch has closed your emergency alert.
            </p>

            <button
              onClick={handleClose}
              className="w-full px-4 py-3.5 rounded-xl text-sm font-bold bg-[#1A5FB4] text-white hover:bg-[#164A8F] transition-colors shadow-md shadow-[#1A5FB4]/20 mb-2"
            >
              Understood
            </button>
          </div>
        )}

        {status === "error" && (
          /* --- ERROR STATE --- */
          <div className="p-6 text-center">
            <div className="w-20 h-20 rounded-full bg-red-500/15 border-2 border-red-500/25 flex items-center justify-center mx-auto mb-5">
              <svg className="w-10 h-10 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
              </svg>
            </div>

            <h2 className="text-xl font-extrabold text-white mb-2">SOS Could Not Be Sent</h2>
            <p className="text-sm text-white/40 leading-relaxed mb-8">{errorMessage}</p>

            <div className="flex gap-3">
              <button onClick={handleClose} className="flex-1 px-4 py-3.5 rounded-xl text-sm font-semibold border border-white/10 text-white/70 hover:bg-white/10 transition-colors">
                Close
              </button>
              <button onClick={handleRetry} className="flex-1 px-4 py-3.5 rounded-xl text-sm font-bold bg-red-500 text-white hover:bg-red-600 transition-colors shadow-lg shadow-red-500/30">
                Try Again
              </button>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
