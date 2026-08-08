"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Loader2, MapPin } from "lucide-react";
import { haversineMeters } from "@/lib/utils/geo";

// The public tracking page (app/share/[token]/page.tsx) polls every 5s, so
// pushing position updates more often than that is wasted work. Only push
// when meaningfully stale (time) or meaningfully moved (distance) — a real
// position change is still sent immediately regardless of the timer.
const MIN_UPDATE_INTERVAL_MS = 4000;
const MIN_UPDATE_DISTANCE_METERS = 8;

interface ShareRideModalProps {
  commuterName: string;
  commuterId?: string;
  lat?: number;
  lng?: number;
  onClose: () => void;
}

export default function ShareRideModal({ commuterName, lat: propLat, lng: propLng, onClose }: ShareRideModalProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState<string>("");
  const [expiresAt, setExpiresAt] = useState<string>("");
  const [timeLeft, setTimeLeft] = useState(0);
  const [isCopied, setIsCopied] = useState(false);
  const [isExpired, setIsExpired] = useState(false);
  const [gpsStatus, setGpsStatus] = useState<"idle" | "requesting" | "success" | "error">("idle");
  const [isStopping, setIsStopping] = useState(false);
  const [isStopped, setIsStopped] = useState(false);

  // Track the share token + current position so we can push updates.
  const tokenRef = useRef<string | null>(null);
  const watchIdRef = useRef<number | null>(null);
  // Last position actually pushed to the backend, for throttling.
  const lastSentRef = useRef<{ lat: number; lng: number; at: number } | null>(null);

  // ── Get current GPS position ──
  const getCurrentPosition = (): Promise<{ lat: number; lng: number }> => {
    return new Promise((resolve, reject) => {
      if (typeof navigator === "undefined" || !navigator.geolocation) {
        reject(new Error("Geolocation is not supported by your browser."));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        (err) => reject(new Error(err.message || "Failed to get GPS position.")),
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    });
  };

  // ── Push position update to the backend ──
  const updatePosition = useCallback(async (latVal: number, lngVal: number) => {
    if (!tokenRef.current) return;

    // Throttle: skip this push if it's both too soon since the last one AND
    // the position hasn't moved meaningfully — avoids spamming the backend
    // on every raw watchPosition tick while still pushing immediately on
    // real movement or once the interval elapses.
    const now = Date.now();
    const last = lastSentRef.current;
    if (last) {
      const elapsedMs = now - last.at;
      const movedMeters = haversineMeters(last.lat, last.lng, latVal, lngVal);
      if (elapsedMs < MIN_UPDATE_INTERVAL_MS && movedMeters < MIN_UPDATE_DISTANCE_METERS) {
        return;
      }
    }
    lastSentRef.current = { lat: latVal, lng: lngVal, at: now };

    try {
      await fetch("/api/commuter/share-ride", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ lat: latVal, lng: lngVal }),
      });
    } catch {
      // Best-effort — position update failure is non-critical.
    }
  }, []);

  // ── Create the share link on mount ──
  useEffect(() => {
    const createLink = async () => {
      setIsLoading(true);
      setError(null);
      setGpsStatus("requesting");

      try {
        // Get the commuter's current GPS position first.
        let initLat = propLat;
        let initLng = propLng;

        if (initLat == null || initLng == null) {
          try {
            const pos = await getCurrentPosition();
            initLat = pos.lat;
            initLng = pos.lng;
            setGpsStatus("success");
          } catch (gpsErr) {
            setGpsStatus("error");
            // Create the link anyway without GPS — the commuter can still
            // share the link and the position will be updated when GPS
            // becomes available (via the watchPosition below).
          }
        } else {
          setGpsStatus("success");
        }

        const res = await fetch("/api/commuter/share-ride", {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({
            lat: initLat ?? undefined,
            lng: initLng ?? undefined,
            rotate: false,
          }),
        });

        if (!res.ok) {
          const body = await res.json().catch(() => null);
          throw new Error(body?.message ?? "Failed to create share link.");
        }

        const json = await res.json();
        const data = json.data;
        tokenRef.current = data.token;
        // Always construct the share URL using the frontend's origin (port 3000).
        setShareUrl(`${window.location.origin}/share/${data.token}`);
        setExpiresAt(data.expires_at);

        // Start watching position for live updates.
        if (typeof navigator !== "undefined" && navigator.geolocation) {
          watchIdRef.current = navigator.geolocation.watchPosition(
            (pos) => {
              setGpsStatus("success");
              void updatePosition(pos.coords.latitude, pos.coords.longitude);
            },
            () => {
              setGpsStatus("error");
            },
            { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
          );
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to create share link.");
      } finally {
        setIsLoading(false);
      }
    };

    void createLink();

    // Cleanup: stop watching + deactivate the link when modal closes.
    return () => {
      if (watchIdRef.current != null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Countdown timer ──
  useEffect(() => {
    if (!expiresAt) return;

    const updateTimer = () => {
      const remaining = Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000);
      if (remaining <= 0) {
        setTimeLeft(0);
        setIsExpired(true);
        return false;
      }
      setTimeLeft(remaining);
      return true;
    };

    if (!updateTimer()) return;

    const timer = setInterval(() => {
      if (!updateTimer()) {
        clearInterval(timer);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [expiresAt]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch {
      // Fallback
    }
  }, [shareUrl]);

  const handleStopSharing = useCallback(async () => {
    if (isStopping) return;
    setIsStopping(true);
    if (watchIdRef.current != null && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    try {
      const response = await fetch("/api/commuter/share-ride", { method: "DELETE" });
      if (!response.ok) throw new Error("Unable to stop sharing.");
      setIsStopped(true);
      setTimeout(onClose, 1200);
    } catch {
      setError("Unable to stop location sharing. Please try again.");
    } finally {
      setIsStopping(false);
    }
  }, [isStopping, onClose]);

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={!isLoading ? onClose : undefined} />
      <div className="relative bg-white sm:rounded-3xl rounded-t-3xl shadow-2xl w-full sm:max-w-md overflow-hidden animate-slide-in-from-bottom duration-300 pb-safe">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-[#071A2E]">Share Live Location</h2>
            {!isExpired && !isLoading && (
              <span className="flex items-center gap-1 bg-green-50 text-green-600 text-[10px] font-bold px-2 py-0.5 rounded-full border border-green-200">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                LIVE
              </span>
            )}
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors">
            <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="p-5 space-y-5">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <Loader2 className="w-8 h-8 text-[#1A5FB4] animate-spin" />
              <p className="text-sm text-gray-500">Getting your GPS position…</p>
            </div>
          ) : isStopped ? (
            <div className="flex flex-col items-center justify-center py-10 gap-3 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-green-600">
                <svg className="h-9 w-9" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>
              </div>
              <h3 className="text-lg font-bold text-[#071A2E]">Location sharing stopped</h3>
              <p className="text-sm text-gray-500">The tracking link is no longer active.</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-8 gap-3">
              <p className="text-sm text-red-500 text-center">{error}</p>
              <button onClick={onClose} className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 text-sm font-semibold hover:bg-gray-200">Close</button>
            </div>
          ) : (
            <>
              {/* GPS Status indicator */}
              <div className={`flex items-center gap-2 p-3 rounded-lg text-xs font-medium ${
                gpsStatus === "success" ? "bg-green-50 text-green-600 border border-green-200" :
                gpsStatus === "error" ? "bg-red-50 text-red-600 border border-red-200" :
                gpsStatus === "requesting" ? "bg-blue-50 text-blue-600 border border-blue-200" :
                "bg-gray-50 text-gray-500 border border-gray-200"
              }`}>
                <MapPin size={14} />
                {gpsStatus === "success" && "GPS connected — sharing live position"}
                {gpsStatus === "error" && "GPS unavailable — sharing link without position. Move to an open area for better signal."}
                {gpsStatus === "requesting" && "Connecting to GPS…"}
                {gpsStatus === "idle" && "Waiting for GPS…"}
              </div>

              {/* Info Text */}
              <p className="text-sm text-gray-600 leading-relaxed">
                Anyone with this link can track your live location on the map for 30 minutes.
                <span className="font-semibold text-[#071A2E]"> Do not share with untrusted individuals.</span>
              </p>

              {/* URL Box */}
              <div className="bg-[#F8FAFC] rounded-xl border border-gray-200 p-1 flex items-center gap-2">
                <div className="flex-1 px-3 py-2.5 truncate">
                  <p className="text-xs text-gray-500 font-medium truncate">{shareUrl}</p>
                </div>
                <button
                  onClick={handleCopy}
                  disabled={isExpired}
                  className={`px-4 py-2.5 rounded-lg text-xs font-semibold transition-all flex-shrink-0 ${
                    isCopied
                      ? "bg-green-100 text-green-700"
                      : isExpired
                        ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                        : "bg-[#1A5FB4] text-white hover:bg-[#164A8F] shadow-sm"
                  }`}
                >
                  {isCopied ? "Copied!" : "Copy"}
                </button>
              </div>

              {/* Countdown Timer */}
              <div className={`flex items-center justify-center gap-3 p-4 rounded-xl border transition-colors ${
                isExpired
                  ? "bg-red-50 border-red-200"
                  : timeLeft <= 300
                    ? "bg-amber-50 border-amber-200"
                    : "bg-[#F0F7FF] border-[#DAEEFF]"
              }`}>
                <svg className={`w-5 h-5 ${isExpired ? "text-red-500" : timeLeft <= 300 ? "text-amber-500" : "text-[#1A5FB4]"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                </svg>
                <div className="text-center">
                  <p className={`text-2xl font-extrabold tracking-wider ${isExpired ? "text-red-600" : timeLeft <= 300 ? "text-amber-600" : "text-[#1A5FB4]"}`}>
                    {isExpired ? "00:00" : formatTime(timeLeft)}
                  </p>
                  <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wider mt-0.5">
                    {isExpired ? "Link Expired" : "Time Remaining"}
                  </p>
                </div>
              </div>

              {/* Disclaimer */}
              <div className="flex gap-2 bg-gray-50 p-3 rounded-lg">
                <svg className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
                </svg>
                <p className="text-[11px] text-gray-500 leading-relaxed">
                  Link automatically stops sharing after 30 minutes. Keep this app open for live updates.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-1">
                {!isExpired && (
                  <button
                    onClick={handleStopSharing}
                    disabled={isStopping}
                    className="flex-1 px-4 py-3 rounded-xl text-sm font-semibold border border-red-200 text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                  >
                    {isStopping ? "Stopping…" : "Stop Sharing"}
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="flex-1 px-4 py-3 rounded-xl text-sm font-semibold border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  {isExpired ? "Close" : "Keep Sharing"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
