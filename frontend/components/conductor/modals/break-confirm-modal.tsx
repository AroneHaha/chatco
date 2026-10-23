"use client";

// Uses the existing confirmation callback and parent busy/error state.
import { useEffect, useRef, useState } from "react";
import SlideCommit from "@/components/ui/slide-commit";
import { useCommuterTheme } from "@/contexts/commuter-theme-context";

interface BreakConfirmModalProps {
  isOnBreak: boolean;
  busy: boolean;
  error: string | null;
  onClose: () => void;
  onConfirm: () => void;
}

// The parent mounts a fresh modal for each break/duty confirmation.
export default function BreakConfirmModal({
  isOnBreak,
  busy,
  error,
  onClose,
  onConfirm,
}: BreakConfirmModalProps) {
  const sliderContainerRef = useRef<HTMLDivElement>(null);
  const requestRef = useRef<{ resolve: () => void; reject: (reason: Error) => void } | null>(null);
  const requestStartedRef = useRef(false);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [wasOnBreak] = useState(isOnBreak);
  const [sliderWidth, setSliderWidth] = useState(280);
  const [confirmed, setConfirmed] = useState(false);
  // The slider takes inline colours, which `light:` classes can't reach;
  // this is the conductor app's active theme (dark off light-ready routes).
  const isLight = useCommuterTheme() === "light";

  const [prevBusy, setPrevBusy] = useState(busy);
  if (busy !== prevBusy) {
    setPrevBusy(busy);
    if (prevBusy && !busy && error) setConfirmed(false);
  }

  useEffect(() => {
    const container = sliderContainerRef.current;
    if (!container) return;
    const observer = new ResizeObserver(([entry]) => {
      setSliderWidth(Math.round(entry.contentRect.width));
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // Let SlideCommit display pending/error states while the existing action runs.
  useEffect(() => {
    if (busy) {
      requestStartedRef.current = true;
      return;
    }
    if (!requestStartedRef.current || !requestRef.current) return;
    const request = requestRef.current;
    requestRef.current = null;
    requestStartedRef.current = false;
    if (error) request.reject(new Error(error));
    else request.resolve();
  }, [busy, error]);

  useEffect(() => () => {
    clearTimeout(closeTimerRef.current);
    requestRef.current?.resolve();
    requestRef.current = null;
  }, []);

  const confirm = () => new Promise<void>((resolve, reject) => {
    requestRef.current = { resolve, reject };
    setConfirmed(true);
    onConfirm();
  });

  const locked = busy || confirmed;
  const title = wasOnBreak ? "Resume Duty?" : "Take a Break?";
  const description = wasOnBreak
    ? "You'll be marked back on duty and visible to commuters and hails again."
    : "Your unit pauses from the live map while on break, and won't be flagged as inactive.";
  const instruction = busy ? "Updating..." : wasOnBreak ? "Slide to resume duty" : "Slide to start break";

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={locked ? undefined : onClose}
      />
      <div className="relative w-full sm:max-w-sm bg-[#071A2E] border border-white/10 rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden pb-safe animate-fade-in light:bg-white light:border-gray-200 light:shadow-black/10">
        <button
          onClick={onClose}
          disabled={locked}
          className="absolute top-3 right-3 w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-white/40 hover:bg-white/10 hover:text-white light:bg-gray-100 light:text-gray-500 light:hover:bg-gray-200 light:hover:text-gray-900 transition-all disabled:opacity-30 disabled:cursor-not-allowed z-10"
          aria-label="Close modal"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Left-aligned like the other conductor popovers: the current state as
            an eyebrow, then the question. No colour per state; the slider
            carries the action. */}
        <div className="p-6 pt-5">
          <p className="pr-10 text-[10px] font-semibold uppercase tracking-[0.08em] text-white/40 light:text-gray-500">
            {wasOnBreak ? "On break" : "On duty"}
          </p>
          <h3 className="mt-1.5 text-lg font-bold text-white light:text-gray-900">{title}</h3>
          <p className="mt-1 mb-6 text-sm leading-relaxed text-white/55 light:text-gray-500">{description}</p>

          <div ref={sliderContainerRef}>
            <SlideCommit
              label={instruction}
              doneLabel="Done"
              errorLabel="Slide to try again"
              onConfirm={confirm}
              onDone={() => {
                closeTimerRef.current = setTimeout(onClose, 1200);
              }}
              holdMs={0}
              width={sliderWidth}
              height={56}
              commitRatio={0.9}
              // Yellow only on the Take a Break slider; Resume Duty stays blue.
              trackColor={wasOnBreak ? (isLight ? "#EEF2F7" : "#1A2540") : isLight ? "#FEF3C7" : "#34312D"}
              handleColor={wasOnBreak ? (isLight ? "#1A5FB4" : "#62A0EA") : isLight ? "#F59E0B" : "#FBBF24"}
              successColor={wasOnBreak ? (isLight ? "#1A5FB4" : "#62A0EA") : isLight ? "#F59E0B" : "#FBBF24"}
              disabled={locked}
              className="conductor-duty-slider"
            />
          </div>

          {error && (
            <p role="alert" className="mt-3 rounded-lg bg-red-950/90 px-3 py-2 text-xs text-red-300 light:bg-red-50 light:text-red-700">
              {error}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
