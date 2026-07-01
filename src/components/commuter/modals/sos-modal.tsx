"use client";

// src/components/commuter/modals/sos-modal.tsx
//
// Commuter Emergency SOS modal — wired to the real backend.
//
// Flow:
//   confirming  -> user taps "Send SOS"
//   locating    -> navigator.geolocation.getCurrentPosition (high accuracy, 10s)
//   sending     -> POST /api/commuter/sos { lat, lng }
//   active      -> polling GET /api/commuter/sos/{id} every 3s, waiting for admin
//   responded   -> admin acknowledged/resolved -> success screen
//   error       -> geolocation denied/failed OR network/API error
//
// State transitions are one-way except for a "Try again" button on the error
// screen which returns to `confirming`. The screen is locked (no backdrop
// click-to-close) while locating/sending/active so the commuter cannot
// accidentally dismiss an active emergency.

import { useState, useEffect, useRef, useCallback } from "react";

interface SosModalProps {
  commuterId: string;
  commuterName: string;
  onClose: () => void;
}

type SosStatus =
  | "confirming"
  | "locating"
  | "sending"
  | "active"
  | "responded"
  | "error";

interface AlertPayload {
  id: string;
  status: "ACTIVE" | "ACKNOWLEDGED" | "RESOLVED";
  createdAt: string;
  acknowledgedAt: string | null;
  resolvedAt: string | null;
}

const POLL_INTERVAL_MS = 3000;

export default function SosModal({
  commuterId: _commuterId,
  commuterName: _commuterName,
  onClose,
}: SosModalProps) {
  const [status, setStatus] = useState<SosStatus>("confirming");
  const [activeSeconds, setActiveSeconds] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [alertId, setAlertId] = useState<string | null>(null);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Active-state elapsed timer ──
  useEffect(() => {
    if (status === "active") {
      timerRef.current = setInterval(() => {
        setActiveSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [status]);

  // ── Poll the alert status while active ──
  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const pollAlert = useCallback(
    async (id: string) => {
      try {
        const res = await fetch(`/api/commuter/sos/${id}`, {
          credentials: "include",
        });
        if (!res.ok) return; // keep polling on transient errors
        const data = await res.json();
        const alert: AlertPayload | undefined = data.alert;
        if (!alert) return;
        if (alert.status === "ACKNOWLEDGED" || alert.status === "RESOLVED") {
          stopPolling();
          setStatus("responded");
        }
      } catch {
        // Network blip — keep polling, the admin may still respond.
      }
    },
    [stopPolling]
  );

  useEffect(() => {
    if (status === "active" && alertId) {
      // The interval handles all polls (first tick at 3s). We avoid calling
      // pollAlert synchronously here because it contains setState (via the
      // async fetch resolution) and the react-hooks/set-state-in-effect rule
      // flags synchronous setState in effect bodies. The 3s first-tick delay
      // is fine: the admin needs time to see the alert appear in their feed.
      pollRef.current = setInterval(() => void pollAlert(alertId), POLL_INTERVAL_MS);
    }
    return stopPolling;
  }, [status, alertId, pollAlert, stopPolling]);

  // Clean up everything on unmount.
  useEffect(() => stopPolling, [stopPolling]);

  // ── Trigger: capture GPS, POST, go active ──
  const handleActivate = useCallback(() => {
    setStatus("locating");
    setErrorMessage("");

    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setStatus("error");
      setErrorMessage(
        "Geolocation is not supported by your browser. Please use a different device or call the emergency hotline directly."
      );
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setStatus("sending");
        try {
          const res = await fetch("/api/commuter/sos", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ lat: latitude, lng: longitude }),
          });

          if (res.status === 401) {
            setStatus("error");
            setErrorMessage("Your session has expired. Please log in again to send an SOS.");
            return;
          }
          if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            setStatus("error");
            setErrorMessage(data.message ?? "Unable to send the SOS signal. Please try again.");
            return;
          }

          const data = await res.json();
          const alert: AlertPayload | undefined = data.alert;
          if (!alert) {
            setStatus("error");
            setErrorMessage("The server did not return an alert. Please try again.");
            return;
          }

          // If the admin already responded to a resumed alert, skip straight to responded.
          if (alert.status === "ACKNOWLEDGED" || alert.status === "RESOLVED") {
            setStatus("responded");
            return;
          }

          setAlertId(alert.id);
          setStatus("active");
        } catch {
          setStatus("error");
          setErrorMessage("Network error. Please check your connection and try again.");
        }
      },
      (err) => {
        setStatus("error");
        if (err.code === err.PERMISSION_DENIED) {
          setErrorMessage(
            "Location access was denied. Please enable location services in your browser settings to send an SOS."
          );
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          setErrorMessage("Your current location is unavailable. Please try again from an open area.");
        } else if (err.code === err.TIMEOUT) {
          setErrorMessage("Location request timed out. Please try again.");
        } else {
          setErrorMessage("Unable to determine your location. Please try again.");
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }, []);

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

  // Backdrop click-to-close is only allowed in non-active states.
  const canCloseViaBackdrop =
    status === "confirming" || status === "responded" || status === "error";

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
      {/* Backdrop */}
      <div
        className={`absolute inset-0 backdrop-blur-sm transition-colors duration-500 ${
          status === "active" || status === "sending"
            ? "bg-red-900/60"
            : status === "locating"
            ? "bg-red-900/40"
            : "bg-black/60"
        }`}
        onClick={canCloseViaBackdrop ? onClose : undefined}
      />

      {/* Modal Card */}
      <div
        className={`relative sm:rounded-3xl rounded-t-3xl shadow-2xl w-full sm:max-w-md overflow-hidden animate-slide-in-from-bottom duration-300 pb-safe border-2 transition-colors duration-300 ${
          status === "active" || status === "locating" || status === "sending"
            ? "bg-white border-red-500"
            : "bg-white border-transparent"
        }`}
      >
        {/* ── CONFIRMING ── */}
        {status === "confirming" && (
          <div className="p-6 text-center">
            <div className="w-20 h-20 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-5 border-2 border-red-100">
              <svg className="w-10 h-10 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
              </svg>
            </div>

            <h2 className="text-xl font-extrabold text-[#071A2E] mb-2">Send Emergency SOS?</h2>
            <p className="text-sm text-gray-500 leading-relaxed mb-8">
              This will immediately share your <span className="font-bold text-[#071A2E]">real-time live location</span> with the CHATCO Admin team.
              <br /><br />
              <span className="text-red-500 font-semibold">Only use this in actual emergencies.</span>
            </p>

            <div className="flex gap-3">
              <button onClick={onClose} className="flex-1 px-4 py-3.5 rounded-xl text-sm font-semibold border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors">
                Cancel
              </button>
              <button
                onClick={handleActivate}
                className="flex-1 px-4 py-3.5 rounded-xl text-sm font-bold bg-red-600 text-white hover:bg-red-700 transition-colors shadow-lg shadow-red-600/30 flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                </svg>
                Send SOS
              </button>
            </div>
          </div>
        )}

        {/* ── LOCATING (getting GPS) ── */}
        {status === "locating" && (
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

        {/* ── SENDING (POSTing to backend) ── */}
        {status === "sending" && (
          <div className="p-6 text-center">
            <div className="w-20 h-20 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-5 border-2 border-red-100">
              <div className="w-8 h-8 border-2 border-red-200 border-t-red-600 rounded-full animate-spin" />
            </div>
            <h2 className="text-xl font-extrabold text-[#071A2E] mb-1">Sending distress signal…</h2>
            <p className="text-sm text-gray-500">Transmitting your location to the CHATCO Admin team.</p>
          </div>
        )}

        {/* ── ACTIVE / TRACKING (locked screen, polling) ── */}
        {status === "active" && (
          <div className="p-6 text-center">
            <div className="relative w-32 h-32 mx-auto mb-6 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full bg-red-500/20 animate-ping" />
              <div className="absolute inset-4 rounded-full bg-red-500/30 animate-ping [animation-delay:0.5s]" />
              <div className="relative w-20 h-20 rounded-full bg-red-600 flex items-center justify-center shadow-2xl shadow-red-600/50 z-10">
                <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                </svg>
              </div>
            </div>

            <h2 className="text-xl font-extrabold text-red-600 mb-1">SOS IS ACTIVE</h2>
            <p className="text-sm text-gray-500 mb-4">Admin is tracking your live location</p>

            <div className="inline-flex items-center gap-2 bg-red-50 text-red-700 font-mono text-2xl font-extrabold px-6 py-2 rounded-lg border border-red-200 mb-6">
              <svg className="w-5 h-5 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0 1 12 21 8.25 8.25 0 0 1 6.038 7.047 8.287 8.287 0 0 0 9 9.601a8.983 8.983 0 0 1 3.361-6.867 8.21 8.21 0 0 0 3 2.48Z" />
              </svg>
              {formatTimer(activeSeconds)}
            </div>

            <p className="text-xs text-gray-400 leading-relaxed max-w-[250px] mx-auto">
              Please keep the app open. This screen will automatically update once the admin responds.
            </p>
          </div>
        )}

        {/* ── RESPONDED ── */}
        {status === "responded" && (
          <div className="p-6 text-center animate-in fade-in duration-300">
            <div className="w-20 h-20 rounded-full bg-[#F0FDF4] flex items-center justify-center mx-auto mb-5 border-2 border-green-100">
              <svg className="w-10 h-10 text-[#22C55E]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
              </svg>
            </div>

            <h2 className="text-xl font-extrabold text-[#071A2E] mb-2">Signal Received</h2>
            <p className="text-sm text-gray-500 leading-relaxed mb-8">
              The CHATCO Admin team has successfully received your distress signal.
              <br /><br />
              <span className="font-semibold text-[#071A2E]">Respondents are being dispatched to your location. Please stay calm and keep your location services turned on.</span>
            </p>

            <button
              onClick={onClose}
              className="w-full px-4 py-3.5 rounded-xl text-sm font-bold bg-[#1A5FB4] text-white hover:bg-[#164A8F] transition-colors shadow-md shadow-[#1A5FB4]/20 mb-2"
            >
              Understood
            </button>
          </div>
        )}

        {/* ── ERROR ── */}
        {status === "error" && (
          <div className="p-6 text-center">
            <div className="w-20 h-20 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-5 border-2 border-red-100">
              <svg className="w-10 h-10 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
              </svg>
            </div>

            <h2 className="text-xl font-extrabold text-[#071A2E] mb-2">SOS Could Not Be Sent</h2>
            <p className="text-sm text-gray-500 leading-relaxed mb-8">{errorMessage}</p>

            <div className="flex gap-3">
              <button onClick={onClose} className="flex-1 px-4 py-3.5 rounded-xl text-sm font-semibold border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors">
                Close
              </button>
              <button onClick={handleRetry} className="flex-1 px-4 py-3.5 rounded-xl text-sm font-bold bg-red-600 text-white hover:bg-red-700 transition-colors shadow-lg shadow-red-600/30">
                Try Again
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
