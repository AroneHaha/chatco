"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useFeedback } from "./use-feedback";
import { QrScanner } from "@/components/commuter/feedback/qr-scanner";
import { AlertTriangle, RotateCcw } from "lucide-react";

/**
 * Sprint 6 — Commuter Feedback page (S6-T6 scan + S6-T7 submit, both
 * wired to the real backend).
 *
 * State machine (driven by `scanStatus` from useFeedback):
 *   scanning   → QrScanner component (camera + manual entry)
 *   verifying  → spinner ("Verifying QR signature…")
 *   resolving  → spinner ("Resolving today's crew…")
 *   error      → typed error message + "Try again" button
 *   resolved   → driver card + rating/tags/comment form (existing UI)
 *
 * On submit success (real POST /commuter/feedback → 201), shows the
 * success state with a 3-second countdown back to /dashboard. On submit
 * error (409 already-submitted / 422 validation / network), surfaces an
 * inline error banner above the submit button.
 */
export default function FeedbackPage() {
  const router = useRouter();

  const {
    scanStatus,
    scanError,
    crew,
    handleToken,
    resetForNewScan,
    rating,
    hoverRating,
    setHoverRating,
    handleSetRating,
    activeTags,
    selectedTags,
    toggleTag,
    comment,
    setComment,
    conductorRating,
    conductorHoverRating,
    setConductorHoverRating,
    handleSetConductorRating,
    activeConductorTags,
    conductorSelectedTags,
    toggleConductorTag,
    conductorComment,
    setConductorComment,
    isSubmitting,
    isSubmitted,
    submitError,
    submitFeedback,
  } = useFeedback();

  const displayRating = hoverRating || rating;
  const displayConductorRating = conductorHoverRating || conductorRating;
  // Both crew members must be fully rated (star + at least one tag) to submit.
  const driverComplete = rating > 0 && selectedTags.length > 0;
  const conductorComplete = conductorRating > 0 && conductorSelectedTags.length > 0;

  // --- COUNTDOWN & AUTO-CLOSE LOGIC (kept from original) ---
  const [countdown, setCountdown] = useState(3);

  useEffect(() => {
    if (!isSubmitted) return;
    if (countdown === 0) {
      router.push("/dashboard");
      return;
    }
    const timer = setTimeout(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);
    return () => clearTimeout(timer);
  }, [isSubmitted, countdown, router]);

  const handleScanAnother = () => {
    setCountdown(3);
    resetForNewScan();
  };

  // ─── 1. SCANNING STATE — render the QR scanner ──────────────
  if (scanStatus === "scanning") {
    return <QrScanner onToken={handleToken} onCancel={() => router.push("/dashboard")} />;
  }

  // ─── 2. VERIFYING / RESOLVING — spinner ─────────────────────
  if (scanStatus === "verifying" || scanStatus === "resolving") {
    return (
      <div className="h-full w-full bg-[#050F1A] flex flex-col items-center justify-center p-6">
        <div className="w-16 h-16 rounded-full border-4 border-[#62A0EA] border-t-transparent animate-spin mb-4" />
        <p className="text-white font-semibold text-sm">
          {scanStatus === "verifying"
            ? "Verifying QR signature…"
            : "Resolving today's crew…"}
        </p>
        <p className="text-white/40 text-xs mt-1">
          {scanStatus === "verifying"
            ? "Checking the QR is genuine and not expired."
            : "Looking up the driver and conductor on duty."}
        </p>
      </div>
    );
  }

  // ─── 3. ERROR STATE — typed message + retry ─────────────────
  if (scanStatus === "error" && scanError) {
    return (
      <div className="h-full w-full bg-[#050F1A] flex flex-col items-center justify-center p-6">
        <div className="max-w-sm w-full bg-[#071A2E] border border-red-500/20 rounded-2xl p-8 flex flex-col items-center text-center space-y-4">
          <div className="w-14 h-14 rounded-full bg-red-500/10 flex items-center justify-center">
            <AlertTriangle className="w-7 h-7 text-red-400" />
          </div>
          <h3 className="text-white font-bold text-lg">
            {errorTitleForCode(scanError.code)}
          </h3>
          <p className="text-white/50 text-sm max-w-xs">
            {errorMessageForCode(scanError.code, scanError.message)}
          </p>
          <button
            onClick={resetForNewScan}
            className="mt-2 flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#1A5FB4] hover:bg-[#164A8F] text-white text-sm font-semibold transition-colors shadow-lg shadow-[#1A5FB4]/20"
          >
            <RotateCcw size={14} />
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // ─── 4. SUCCESS STATE (post-submit) — kept from original ────
  if (isSubmitted) {
    return (
      <div className="h-full w-full bg-[#050F1A] overflow-y-auto pb-28 lg:pb-8 flex items-center justify-center">
        <div className="max-w-sm w-full bg-[#071A2E] border border-emerald-500/30 rounded-2xl p-8 flex flex-col items-center text-center space-y-5 animate-fade-in mx-4">
          <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center">
            <svg className="w-8 h-8 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </div>
          <h3 className="text-white font-bold text-xl">Thank You!</h3>
          <p className="text-white/50 text-sm max-w-xs">Your feedback has been recorded and will help us improve our service.</p>

          {/* Circular Countdown Timer */}
          <div className="relative w-24 h-24 flex items-center justify-center mt-2">
            <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="6" />
              <circle
                cx="50" cy="50" r="40"
                fill="none"
                stroke="#62A0EA"
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray="251.3"
                className="countdown-ring"
              />
            </svg>
            <span className="text-3xl font-extrabold text-white">{countdown}</span>
          </div>

          <p className="text-white/30 text-xs font-medium">Returning to Home...</p>

          <button onClick={handleScanAnother} className="mt-2 text-sm font-semibold text-[#62A0EA] hover:text-white transition-colors">
            Scan another unit
          </button>
        </div>

        <style jsx global>{`
          @keyframes circle-deplete {
            from { stroke-dashoffset: 0; }
            to { stroke-dashoffset: 251.3; }
          }
          .countdown-ring {
            animation: circle-deplete 3s linear forwards;
          }
        `}</style>
      </div>
    );
  }

  // ─── 5. FEEDBACK FORM STATE — crew resolved, ready to rate ──
  return (
    <div className="h-full w-full bg-[#050F1A] overflow-y-auto pb-28 lg:pb-8">
      <div className="max-w-2xl mx-auto p-6 lg:p-8 space-y-6">

        <div>
          <h1 className="text-white font-bold text-2xl">Driver Feedback</h1>
          <p className="text-white/40 text-sm mt-1">Help us improve our service. Your reviews are anonymous to drivers.</p>
        </div>

        {/* Crew Card — driver + conductor + unit info from /qr/scan */}
        {crew && (
          <div className="bg-[#071A2E] border border-white/10 rounded-2xl p-5 shadow-lg animate-fade-in">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-[#1A5FB4] flex items-center justify-center text-white font-bold text-xl flex-shrink-0 border-2 border-white/10">
                {crew.driverName[0] ?? "?"}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-white font-bold text-lg truncate">{crew.driverName}</h3>
                <p className="text-white/40 text-xs mt-0.5">
                  Driver
                  {crew.unitNumber ? ` · Unit ${crew.unitNumber}` : ""}
                  {` · Plate: ${crew.plateNumber}`}
                </p>
                <p className="text-[#62A0EA] text-xs font-medium mt-0.5">
                  Conductor: {crew.conductorName}
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-8">

          {/* Star Rating */}
          <div className="bg-[#071A2E] border border-white/10 rounded-2xl p-6 flex flex-col items-center">
            <h3 className="text-white/70 text-sm font-semibold mb-4">How was your ride?</h3>
            <div className="flex gap-3">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  onClick={() => handleSetRating(star)}
                  className="transition-transform duration-150 hover:scale-110 focus:outline-none"
                >
                  <svg className={`w-10 h-10 transition-colors duration-150 ${star <= displayRating ? "text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.4)]" : "text-white/10"}`} fill="currentColor" viewBox="0 0 24 24">
                    <path d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z" />
                  </svg>
                </button>
              ))}
            </div>
            {rating > 0 && (
              <p className="text-white/40 text-xs mt-3 font-medium animate-pulse">
                {rating === 1 && "Terrible"}
                {rating === 2 && "Poor"}
                {rating === 3 && "Average"}
                {rating === 4 && "Good"}
                {rating === 5 && "Excellent"}
              </p>
            )}
          </div>

          {/* Dynamic Tags */}
          {rating > 0 && (
            <div className="animate-fade-in">
              <h3 className="text-white/70 text-sm font-semibold mb-3">
                {rating >= 4 ? "What went well?" : "What could be improved?"}
              </h3>
              <div className="flex flex-wrap gap-2">
                {activeTags.map((tag) => {
                  const isSelected = selectedTags.includes(tag);
                  const isPositive = rating >= 4;

                  return (
                    <button
                      key={tag}
                      onClick={() => toggleTag(tag)}
                      className={`px-4 py-2 rounded-full text-xs font-semibold border transition-all duration-200 ${
                        isSelected
                          ? (isPositive ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-400 shadow-lg shadow-emerald-500/10" : "bg-red-500/20 border-red-500/50 text-red-400 shadow-lg shadow-red-500/10")
                          : "bg-white/5 border-white/10 text-white/50 hover:bg-white/10"
                      }`}
                    >
                      {tag}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Comment Box */}
          {rating > 0 && selectedTags.length > 0 && (
            <div className="space-y-3 animate-fade-in">
              <h3 className="text-white/70 text-sm font-semibold">Additional Comments (Optional)</h3>
              <textarea
                rows={3}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Tell us more about your experience..."
                className="w-full bg-[#071A2E] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[#62A0EA] transition-colors resize-none"
              />
            </div>
          )}

          {/* ─── CONDUCTOR RATING — mirrors the driver section above, shown
                once the driver has been fully rated ─────────────────────── */}
          {driverComplete && (
            <div className="space-y-8 pt-2 border-t border-white/5 animate-fade-in">
              <div className="pt-2">
                <h2 className="text-white font-bold text-lg">Rate the Conductor</h2>
                <p className="text-white/40 text-xs mt-1">
                  {crew ? `${crew.conductorName} · ` : ""}How was the conductor?
                </p>
              </div>

              {/* Conductor Star Rating */}
              <div className="bg-[#071A2E] border border-white/10 rounded-2xl p-6 flex flex-col items-center">
                <h3 className="text-white/70 text-sm font-semibold mb-4">How was the conductor?</h3>
                <div className="flex gap-3">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onMouseEnter={() => setConductorHoverRating(star)}
                      onMouseLeave={() => setConductorHoverRating(0)}
                      onClick={() => handleSetConductorRating(star)}
                      className="transition-transform duration-150 hover:scale-110 focus:outline-none"
                    >
                      <svg className={`w-10 h-10 transition-colors duration-150 ${star <= displayConductorRating ? "text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.4)]" : "text-white/10"}`} fill="currentColor" viewBox="0 0 24 24">
                        <path d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z" />
                      </svg>
                    </button>
                  ))}
                </div>
                {conductorRating > 0 && (
                  <p className="text-white/40 text-xs mt-3 font-medium animate-pulse">
                    {conductorRating === 1 && "Terrible"}
                    {conductorRating === 2 && "Poor"}
                    {conductorRating === 3 && "Average"}
                    {conductorRating === 4 && "Good"}
                    {conductorRating === 5 && "Excellent"}
                  </p>
                )}
              </div>

              {/* Conductor Dynamic Tags */}
              {conductorRating > 0 && (
                <div className="animate-fade-in">
                  <h3 className="text-white/70 text-sm font-semibold mb-3">
                    {conductorRating >= 4 ? "What went well?" : "What could be improved?"}
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {activeConductorTags.map((tag) => {
                      const isSelected = conductorSelectedTags.includes(tag);
                      const isPositive = conductorRating >= 4;

                      return (
                        <button
                          key={tag}
                          onClick={() => toggleConductorTag(tag)}
                          className={`px-4 py-2 rounded-full text-xs font-semibold border transition-all duration-200 ${
                            isSelected
                              ? (isPositive ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-400 shadow-lg shadow-emerald-500/10" : "bg-red-500/20 border-red-500/50 text-red-400 shadow-lg shadow-red-500/10")
                              : "bg-white/5 border-white/10 text-white/50 hover:bg-white/10"
                          }`}
                        >
                          {tag}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Conductor Comment Box */}
              {conductorRating > 0 && conductorSelectedTags.length > 0 && (
                <div className="space-y-3 animate-fade-in">
                  <h3 className="text-white/70 text-sm font-semibold">Additional Comments (Optional)</h3>
                  <textarea
                    rows={3}
                    value={conductorComment}
                    onChange={(e) => setConductorComment(e.target.value)}
                    placeholder="Tell us more about the conductor..."
                    className="w-full bg-[#071A2E] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[#62A0EA] transition-colors resize-none"
                  />
                </div>
              )}
            </div>
          )}

          {/* Submit Button — enabled only when BOTH crew members are rated */}
          {driverComplete && submitError && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 flex items-start gap-2 animate-fade-in">
              <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-red-400 text-xs font-medium leading-relaxed">
                {submitError.code === "already_submitted"
                  ? "You already left feedback for this ride today. Scan another unit to rate a different ride."
                  : submitError.code === "unauthenticated"
                    ? "Your session has expired. Please log in again."
                    : submitError.message}
              </p>
            </div>
          )}

          {driverComplete && (
            <button
              onClick={submitFeedback}
              disabled={isSubmitting || !conductorComplete}
              className="w-full py-4 rounded-xl text-base font-bold bg-[#FF6D3A] text-white hover:bg-[#e55a2b] transition-colors shadow-lg shadow-[#FF6D3A]/30 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
              ) : "Submit Feedback"}
            </button>
          )}
        </div>
      </div>

      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fadeIn 0.3s ease-out forwards;
        }
      `}</style>
    </div>
  );
}

// ─── Error message helpers (kept local — switch on stable codes) ──

function errorTitleForCode(code: string): string {
  switch (code) {
    case "invalid_format":
      return "Not a Unit QR";
    case "invalid_signature":
      return "Invalid QR";
    case "expired":
      return "QR Expired";
    case "malformed":
      return "Unreadable QR";
    case "no_crew_today":
      return "No Active Crew";
    case "forbidden":
      return "Not Allowed";
    case "unauthenticated":
      return "Session Expired";
    case "validation":
      return "Invalid Token";
    case "network":
    default:
      return "Connection Error";
  }
}

function errorMessageForCode(code: string, fallback: string): string {
  switch (code) {
    case "invalid_format":
      return "This QR is not a Chatco unit QR. Scan the feedback QR posted inside the jeepney.";
    case "invalid_signature":
      return "This QR is invalid or has been tampered with. Ask the operator to issue a new one.";
    case "expired":
      return "This QR has expired. Ask the operator to issue a fresh one for this unit.";
    case "malformed":
      return "The QR couldn't be read. Try re-scanning, or use manual entry to paste the token.";
    case "no_crew_today":
      return "This unit has no active crew today. Feedback is only available during or after a ride.";
    case "forbidden":
      return "Only commuter accounts can submit ride feedback.";
    case "unauthenticated":
      return "Your session has expired. Please log in again.";
    case "validation":
      return fallback || "The QR token didn't pass validation.";
    case "network":
    default:
      return "We couldn't reach the backend. Check your connection and try again.";
  }
}
