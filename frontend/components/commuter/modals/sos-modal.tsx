"use client";

// src/components/commuter/modals/sos-modal.tsx
//
// Commuter Emergency SOS modal — wired to the real Laravel backend (S6-T10).
//
// Flow:
//   confirming  → user taps "Send SOS"
//   locating    → navigator.geolocation.getCurrentPosition (high accuracy, 6s)
//   sending     → POST /api/commuter/sos { lat, lng, note? }
//   active      → polling GET /api/commuter/sos/{id} every 3s, waiting for admin
//   responded   → admin acknowledged/resolved → success screen
//   error       → network/API error only (GPS failure falls back to default)
//
// GPS FALLBACK: If geolocation is unavailable/denied/times out (common in
// desktop/cloud-preview environments), the SOS is still sent using a default
// route-centre coordinate so the alert always reaches the admin and a marker
// always appears on the monitoring map.
//
// State transitions are one-way except for a "Try again" button on the error
// screen which returns to `confirming`. The screen is locked (no backdrop
// click-to-close) while locating/sending/active. The explicit Close screen
// action hides the modal while keeping the alert active.

import { useState, useEffect, useRef, useCallback } from "react";
import { AlertTriangle, Check, CheckCircle2, Info, LoaderCircle, ShieldAlert, ShieldCheck } from "lucide-react";
import { APP_DIALOG as D } from "@/components/shared/app-dialog-styles";
import { clearSosSession, readSosSession, saveSosSession } from "@/lib/shared/sos-session";
import SosActions from "@/components/shared/sos-actions";

interface SosModalProps {
  isOpen?: boolean;
  commuterId: string;
  commuterName: string;
  onClose: () => void;
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
  createdAt: string;
  acknowledgedAt: string | null;
  resolvedAt: string | null;
}

const POLL_INTERVAL_MS = 3000;

// Default fallback coordinate — Meycauayan area, central on the CHATCO route.
// Used only when the device GPS is unavailable so the SOS still goes through.
const DEFAULT_LOCATION: { lat: number; lng: number } = { lat: 14.8434, lng: 120.875 };

export default function SosModal({
  isOpen = true,
  commuterId,
  onClose,
}: SosModalProps) {
  const [savedSession] = useState(() => readSosSession("commuter", commuterId));
  const [status, setStatus] = useState<SosStatus>(savedSession ? "active" : "confirming");
  const [activeSeconds, setActiveSeconds] = useState(() => savedSession ? Math.max(0, Math.floor((Date.now() - savedSession.startedAt) / 1000)) : 0);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [alertId, setAlertId] = useState<string | null>(savedSession?.id ?? null);
  const stoppedAlertRef = useRef<string | null>(null);
  const isAlertActive = status === "active" || status === "acknowledged";

  const handleClose = () => {
    if (!isAlertActive) {
      setStatus("confirming");
      setActiveSeconds(0);
      setErrorMessage("");
      setAlertId(null);
    }
    onClose();
  };

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Active-state elapsed timer ──
  useEffect(() => {
    if (isAlertActive) {
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
  }, [isAlertActive]);

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
        const alert: AlertPayload | undefined = data.data;
        if (!alert || stoppedAlertRef.current === id) return;
        if (alert.status === "ACKNOWLEDGED") setStatus("acknowledged");
        if (alert.status === "RESOLVED") {
          clearSosSession("commuter", commuterId);
          stopPolling();
          setStatus("responded");
        }
      } catch {
        // Network blip — keep polling, the admin may still respond.
      }
    },
    [stopPolling, commuterId]
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
  }, [isAlertActive, alertId, pollAlert, stopPolling, isOpen]);

  // Clean up everything on unmount.
  useEffect(() => stopPolling, [stopPolling]);

  const handleStop = async () => {
    if (!alertId) throw new Error("No active SOS to stop.");
    const res = await fetch(`/api/commuter/sos/${encodeURIComponent(alertId)}/stop`, { method: "PATCH", credentials: "include" });
    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error(data?.message ?? "Unable to stop SOS. Please try again.");
    if (data?.data?.status !== "RESOLVED") throw new Error("SOS is still active. Please try again.");
    stoppedAlertRef.current = alertId;
    stopPolling();
    clearSosSession("commuter", commuterId);
    setAlertId(null);
    setStatus("stopped");
  };

  // ── Send the SOS to the backend ──
  const sendSos = useCallback(
    async (lat: number, lng: number) => {
      setStatus("sending");
      try {
        const res = await fetch("/api/commuter/sos", {
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

        // If the admin already responded to a resumed alert, skip straight to responded.
        if (alert.status === "RESOLVED") {
          setStatus("responded");
          return;
        }

        saveSosSession("commuter", commuterId, { id: alert.id, startedAt: Date.now() });
        setAlertId(alert.id);
        setStatus(alert.status === "ACKNOWLEDGED" ? "acknowledged" : "active");
      } catch {
        setStatus("error");
        setErrorMessage("Network error. Please check your connection and try again.");
      }
    },
    [commuterId]
  );

  // ── Trigger: capture GPS, POST, go active ──
  // GPS failure is NOT fatal — we fall back to a default route-centre
  // coordinate so the distress signal always reaches the admin.
  const handleActivate = useCallback(() => {
    setStatus("locating");
    setErrorMessage("");

    // No geolocation API at all → send with the fallback immediately.
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

  // Backdrop click-to-close is only allowed in non-active states.
  const canCloseViaBackdrop =
    status === "confirming" || status === "responded" || status === "error";

  if (!isOpen) return null;

  const body = "mt-2 text-sm leading-relaxed text-white/60 light:text-gray-600";
  const heading = "mt-4 text-xl font-semibold tracking-tight text-white light:text-gray-900";

  return (
    <div className={D.overlay} onClick={canCloseViaBackdrop ? (e) => { if (e.target === e.currentTarget) handleClose(); } : undefined}>
      <div
        key={isAlertActive ? "active" : "inactive"}
        role="dialog"
        aria-modal="true"
        aria-label="Emergency SOS"
        className={`${D.panel} max-w-md animate-modal-panel-in`}
      >
        <div className="p-5 sm:p-6">
          {/* ── CONFIRMING ── */}
          {status === "confirming" && (
            <>
              <ShieldAlert size={40} aria-hidden="true" className={D.redIcon} />
              <h2 className={heading}>Send emergency SOS?</h2>
              <p className={body}>
                This will immediately share your <span className="font-semibold text-white light:text-gray-900">real-time live location</span> with the CHATCO Admin dispatch team.
              </p>
              <p className={`mt-3 text-sm font-semibold ${D.redText}`}>Only use this in actual emergencies.</p>
              <div className="mt-6 flex flex-col-reverse gap-3 min-[360px]:flex-row">
                <button type="button" onClick={handleClose} className={`${D.button} ${D.secondary} flex-1`}>Cancel</button>
                <button type="button" onClick={handleActivate} className={`${D.button} ${D.danger} flex-1`}>
                  <AlertTriangle size={16} aria-hidden="true" />
                  Send SOS
                </button>
              </div>
            </>
          )}

          {/* ── LOCATING / SENDING ── a spinner, not a ping: the screen is busy, not alarming. */}
          {(status === "locating" || status === "sending") && (
            <div role="status">
              <LoaderCircle size={36} aria-hidden="true" className={`animate-spin motion-reduce:animate-none ${D.redIcon}`} />
              <h2 className={heading}>{status === "locating" ? "Getting your location…" : "Sending distress signal…"}</h2>
              <p className={body}>
                {status === "locating"
                  ? "Please allow location access. We need your GPS coordinates to direct respondents to you."
                  : "Transmitting your location to the CHATCO Admin team."}
              </p>
            </div>
          )}

          {/* ── ACTIVE / TRACKING (locked screen, polling) ── */}
          {isAlertActive && (
            <>
              <div className="flex items-center gap-3">
                <ShieldAlert size={32} aria-hidden="true" className={`shrink-0 ${D.redIcon}`} />
                <h2 className="text-xl font-semibold tracking-tight text-white light:text-gray-900">SOS is active</h2>
              </div>
              <p className={body}>Your emergency alert has been sent to CHATCO dispatch.</p>

              <p className={`mt-5 ${D.label}`}>Time elapsed</p>
              <p role="timer" aria-label="Time since SOS was sent" className="mt-1 text-4xl font-semibold leading-none tracking-tight text-white tabular-nums light:text-gray-900">{formatTimer(activeSeconds)}</p>

              <div role="status" className="mt-5 space-y-2.5">
                <p className="flex items-center gap-2 text-sm text-white/80 light:text-gray-700"><Check size={16} aria-hidden="true" className={`shrink-0 ${D.blueIcon}`} />Alert sent</p>
                <p className={`flex items-center gap-2 text-sm font-medium ${status === "acknowledged" ? "text-white/80 light:text-gray-700" : D.muted}`}>
                  {status === "acknowledged"
                    ? <Check size={16} aria-hidden="true" className={`shrink-0 ${D.blueIcon}`} />
                    : <LoaderCircle size={16} aria-hidden="true" className="shrink-0 animate-spin motion-reduce:animate-none" />}
                  {status === "acknowledged" ? "Dispatch has received your alert" : "Waiting for dispatch to respond"}
                </p>
              </div>

              <p className={`mt-5 flex items-start gap-2 border-t pt-4 text-xs leading-relaxed ${D.hairline} ${D.muted}`}>
                <Info size={15} aria-hidden="true" className="mt-px shrink-0" />
                You can close this screen. Your SOS stays active and dispatch can still respond.
              </p>
              <SosActions onClose={handleClose} onStop={handleStop} />
            </>
          )}

          {/* ── STOPPED ── */}
          {status === "stopped" && (
            <>
              <CheckCircle2 size={40} aria-hidden="true" className={D.blueIcon} />
              <h2 className={heading}>SOS stopped</h2>
              <p className={body}>Your alert is closed. Dispatch has been notified.</p>
              <button type="button" onClick={handleClose} className={`${D.button} ${D.primary} mt-6 w-full`}>Done</button>
            </>
          )}

          {/* ── RESPONDED ── */}
          {status === "responded" && (
            <>
              <ShieldCheck size={40} aria-hidden="true" className={D.blueIcon} />
              <h2 className={heading}>SOS closed</h2>
              <p className={body}>Dispatch has closed your emergency alert.</p>
              <button type="button" onClick={handleClose} className={`${D.button} ${D.primary} mt-6 w-full`}>Understood</button>
            </>
          )}

          {/* ── ERROR ── */}
          {status === "error" && (
            <>
              <AlertTriangle size={40} aria-hidden="true" className={D.redIcon} />
              <h2 className={heading}>SOS could not be sent</h2>
              <p role="alert" className={body}>{errorMessage}</p>
              <div className="mt-6 flex flex-col-reverse gap-3 min-[360px]:flex-row">
                <button type="button" onClick={handleClose} className={`${D.button} ${D.secondary} flex-1`}>Close</button>
                <button type="button" onClick={handleRetry} className={`${D.button} ${D.danger} flex-1`}>Try again</button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
