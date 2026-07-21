"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useFeedback } from "./use-feedback";
import { QrScanner } from "@/components/commuter/feedback/qr-scanner";
import { CrewRatingSection } from "@/components/commuter/feedback/crew-rating-section";
import { AlertTriangle, Check, RotateCcw } from "lucide-react";

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

  // Hover preview now lives inside CrewRatingSection, which owns the stars.
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
      // pb-24 clears the mobile bottom nav, which the commuter layout renders as
      // an absolute overlay — without it a centred card sits under the tab bar.
      <div className="h-full w-full bg-[#050F1A] flex flex-col items-center justify-center p-6 pb-24 lg:pb-6">
        <div
          role="status"
          aria-live="polite"
          className="max-w-sm w-full bg-[#071A2E] border border-white/10 rounded-2xl p-8 flex flex-col items-center text-center animate-fade-in"
        >
          <div className="w-14 h-14 rounded-full border-4 border-[#62A0EA] border-t-transparent animate-spin" />
          <h3 className="text-white font-bold text-base mt-5">
            {scanStatus === "verifying"
              ? "Verifying QR signature…"
              : "Resolving today's crew…"}
          </h3>
          <p className="text-white/50 text-sm mt-1.5 max-w-xs">
            {scanStatus === "verifying"
              ? "Checking the QR is genuine and not expired."
              : "Looking up the driver and conductor on duty."}
          </p>
        </div>
      </div>
    );
  }

  // ─── 3. ERROR STATE — typed message + retry ─────────────────
  if (scanStatus === "error" && scanError) {
    return (
      <div className="h-full w-full bg-[#050F1A] flex flex-col items-center justify-center p-6 pb-24 lg:pb-6">
        <div
          role="alert"
          className="max-w-sm w-full bg-[#071A2E] border border-red-500/20 rounded-2xl p-8 flex flex-col items-center text-center space-y-4 animate-fade-in"
        >
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
      <div className="h-full w-full bg-[#050F1A] flex items-center justify-center p-6 pb-24 lg:pb-6">
        <div
          role="status"
          aria-live="polite"
          className="max-w-sm w-full bg-[#071A2E] border border-emerald-500/30 rounded-2xl p-8 flex flex-col items-center text-center space-y-5 animate-fade-in"
        >
          <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center">
            <svg className="w-8 h-8 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </div>
          <h3 className="text-white font-bold text-xl">Thank You!</h3>
          <p className="text-white/50 text-sm max-w-xs">Your feedback has been recorded and will help us improve our service.</p>

          {/* Circular countdown — decorative, the digit carries the meaning. */}
          <div className="relative w-24 h-24 flex items-center justify-center mt-2">
            <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100" aria-hidden="true">
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
            <span className="text-3xl font-extrabold text-white tabular-nums">{countdown}</span>
          </div>

          <p className="text-white/30 text-xs font-medium">Returning to Home…</p>

          <button
            type="button"
            onClick={handleScanAnother}
            className="mt-2 px-4 py-2 rounded-xl text-sm font-semibold text-[#62A0EA] hover:text-white hover:bg-white/5 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#62A0EA]"
          >
            Scan another unit
          </button>
        </div>
      </div>
    );
  }

  // ─── 5. FEEDBACK FORM STATE — crew resolved, ready to rate ──
  return (
    // Pinned header + independently scrolling body, matching the shell used by
    // lost-and-found and rewards. The form grows tall as each step unlocks, so
    // the title and the step progress stay visible while the user scrolls.
    <div className="h-full w-full flex flex-col overflow-hidden bg-[#050F1A]">

      {/* --- HEADER (fixed) --- */}
      <div className="flex-shrink-0 border-b border-white/10 bg-[#071A2E] z-10">
        <div className="max-w-2xl mx-auto p-4 lg:px-8 lg:py-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              {/* Was "Driver Feedback", but this form rates the conductor too. */}
              <h1 className="text-white font-bold text-xl lg:text-2xl">Rate your ride</h1>
              <p className="text-white/40 text-xs mt-1">
                Your reviews are anonymous to the crew.
              </p>
            </div>
            <button
              type="button"
              onClick={handleScanAnother}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#050F1A] hover:bg-[#0B1E33] border border-white/10 text-white/60 hover:text-white text-xs font-semibold flex-shrink-0 transition-colors"
            >
              <RotateCcw size={13} />
              Rescan
            </button>
          </div>

          {/* Step progress — the form rates two people, which was previously
              only discoverable by scrolling until the conductor block appeared. */}
          <div className="flex items-center gap-2 mt-4">
            <StepChip label="Driver" isDone={driverComplete} isActive={!driverComplete} />
            <div className={`h-px flex-1 transition-colors ${driverComplete ? "bg-emerald-500/40" : "bg-white/10"}`} />
            <StepChip
              label="Conductor"
              isDone={conductorComplete}
              isActive={driverComplete && !conductorComplete}
            />
          </div>
        </div>
      </div>

      {/* --- SCROLLING BODY --- */}
      <div className="flex-1 overflow-y-auto scrollbar-themed">
        <div className="max-w-2xl mx-auto p-4 pb-28 lg:p-8 lg:pb-8 space-y-6">

        {/* Crew Card — driver + conductor + unit info from /qr/scan.
            Both crew members are listed as peers now: the form rates them
            separately, so burying the conductor in a caption under the
            driver's name misrepresented what is being asked. */}
        {crew && (
          <div className="bg-[#071A2E] border border-white/10 rounded-2xl p-4 shadow-lg animate-fade-in">
            <div className="flex items-center gap-2 pb-3 mb-3 border-b border-white/5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-white/40">
                {crew.unitNumber ? `Unit ${crew.unitNumber}` : "Unit"}
              </span>
              <span className="text-[10px] font-mono text-[#62A0EA] bg-[#1A5FB4]/10 border border-[#1A5FB4]/20 rounded px-1.5 py-0.5">
                {crew.plateNumber}
              </span>
            </div>
            <div className="space-y-2.5">
              <CrewMemberRow role="Driver" name={crew.driverName} isRated={driverComplete} />
              <CrewMemberRow role="Conductor" name={crew.conductorName} isRated={conductorComplete} />
            </div>
          </div>
        )}

        <div className="space-y-8">

          {/* ─── DRIVER ─────────────────────────────────────────────── */}
          <CrewRatingSection
            label="driver"
            name={crew?.driverName}
            rating={rating}
            hoverRating={hoverRating}
            onHoverRating={setHoverRating}
            onRate={handleSetRating}
            tags={activeTags}
            selectedTags={selectedTags}
            onToggleTag={toggleTag}
            comment={comment}
            onCommentChange={setComment}
            commentPlaceholder="Tell us more about your experience…"
          />

          {/* ─── CONDUCTOR RATING — mirrors the driver section above, shown
                once the driver has been fully rated ─────────────────────── */}
          {driverComplete && (
            <div className="space-y-6 pt-6 border-t border-white/5 animate-fade-in">
              <div>
                <h2 className="text-white font-bold text-lg">Now the conductor</h2>
                <p className="text-white/40 text-xs mt-1">
                  One more, then you&apos;re done.
                </p>
              </div>

              <CrewRatingSection
                label="conductor"
                name={crew?.conductorName}
                rating={conductorRating}
                hoverRating={conductorHoverRating}
                onHoverRating={setConductorHoverRating}
                onRate={handleSetConductorRating}
                tags={activeConductorTags}
                selectedTags={conductorSelectedTags}
                onToggleTag={toggleConductorTag}
                comment={conductorComment}
                onCommentChange={setConductorComment}
                commentPlaceholder="Tell us more about the conductor…"
              />
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
            <div className="space-y-2">
              <button
                type="button"
                onClick={submitFeedback}
                disabled={isSubmitting || !conductorComplete}
                className="w-full py-4 rounded-xl text-base font-bold bg-[#FF6D3A] text-white hover:bg-[#e55a2b] transition-colors shadow-lg shadow-[#FF6D3A]/30 disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                    Submitting…
                  </>
                ) : "Submit Feedback"}
              </button>

              {/* The button greys out until the conductor is rated too, which
                  previously gave no reason — the conductor block is further up
                  the scroll, so the blocker was off-screen. */}
              {!conductorComplete && !isSubmitting && (
                <p className="text-white/40 text-xs text-center">
                  {conductorRating === 0
                    ? "Rate the conductor to submit."
                    : "Pick at least one conductor tag to submit."}
                </p>
              )}
            </div>
          )}
        </div>
        </div>
      </div>
    </div>
  );
}

// ─── Small presentational helpers (local to this page) ────────────

/** One step in the header's Driver → Conductor progress row. */
function StepChip({
  label,
  isDone,
  isActive,
}: {
  label: string;
  isDone: boolean;
  isActive: boolean;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border transition-colors ${
        isDone
          ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
          : isActive
            ? "bg-[#1A5FB4]/15 border-[#1A5FB4]/40 text-[#62A0EA]"
            : "bg-white/5 border-white/10 text-white/30"
      }`}
    >
      {isDone && <Check size={11} strokeWidth={3} />}
      {label}
    </span>
  );
}

/** A crew member line in the unit card, with a rated/pending marker. */
function CrewMemberRow({
  role,
  name,
  isRated,
}: {
  role: string;
  name: string;
  isRated: boolean;
}) {
  return (
    <div className="flex items-center gap-3">
      <div
        className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 border transition-colors ${
          isRated
            ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400"
            : "bg-[#1A5FB4] border-white/10 text-white"
        }`}
      >
        {isRated ? <Check size={15} strokeWidth={3} /> : (name[0] ?? "?")}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-white text-sm font-semibold truncate">{name}</p>
        <p className="text-white/30 text-[11px]">{role}</p>
      </div>
      {isRated && (
        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
          Rated
        </span>
      )}
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
