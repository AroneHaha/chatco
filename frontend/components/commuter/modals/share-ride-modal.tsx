"use client";

import { useState, useEffect, useCallback } from "react";
import { Loader2 } from "lucide-react";

interface ShareRideModalProps {
  commuterName: string;
  commuterId?: string;
  lat?: number;
  lng?: number;
  onClose: () => void;
}

export default function ShareRideModal({ commuterName, lat, lng, onClose }: ShareRideModalProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState<string>("");
  const [expiresAt, setExpiresAt] = useState<string>("");
  const [timeLeft, setTimeLeft] = useState(0);
  const [isCopied, setIsCopied] = useState(false);
  const [isExpired, setIsExpired] = useState(false);

  // Create the share link on mount
  useEffect(() => {
    const createLink = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/commuter/share-ride", {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({ lat, lng }),
        });

        if (!res.ok) {
          const body = await res.json().catch(() => null);
          throw new Error(body?.message ?? "Failed to create share link.");
        }

        const json = await res.json();
        const data = json.data;
        // Always construct the share URL using the frontend's origin (port 3000),
        // NOT the backend's share_url (which points to port 8000 / Laravel).
        setShareUrl(`${window.location.origin}/share/${data.token}`);
        setExpiresAt(data.expires_at);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to create share link.");
      } finally {
        setIsLoading(false);
      }
    };

    void createLink();
  }, [lat, lng]);

  // Countdown timer
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

    // Initial update
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
    try {
      await fetch("/api/commuter/share-ride", { method: "DELETE" });
    } catch {
      // Best-effort
    }
    onClose();
  }, [onClose]);

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
              <p className="text-sm text-gray-500">Creating share link…</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-8 gap-3">
              <p className="text-sm text-red-500 text-center">{error}</p>
              <button onClick={onClose} className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 text-sm font-semibold hover:bg-gray-200">Close</button>
            </div>
          ) : (
            <>
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
                  Link automatically stops sharing after 30 minutes. Tracking relies on your device&apos;s GPS.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-1">
                {!isExpired && (
                  <button
                    onClick={handleStopSharing}
                    className="flex-1 px-4 py-3 rounded-xl text-sm font-semibold border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
                  >
                    Stop Sharing
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
