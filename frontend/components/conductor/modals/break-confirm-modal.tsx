"use client";

// Uses the existing confirmation callback and parent busy/error state.
import { useEffect, useRef, useState } from "react";
import SlideCommit from "@/components/ui/slide-commit";

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
  const accent = wasOnBreak ? "emerald" : "amber";
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
      <div className="relative w-full sm:max-w-sm bg-[#0F2135] border border-white/[0.08] rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden pb-safe animate-fade-in">
        <button
          onClick={onClose}
          disabled={locked}
          className="absolute top-3 right-3 w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-white/40 hover:bg-white/10 hover:text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed z-10"
          aria-label="Close modal"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="p-6 pt-8 text-center">
          <div
            className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 border ${
              accent === "emerald" ? "bg-emerald-500/10 border-emerald-500/20" : "bg-amber-500/10 border-amber-500/20"
            }`}
          >
            <svg
              className={`w-6 h-6 ${accent === "emerald" ? "text-emerald-400" : "text-amber-400"}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
          </div>

          <h3 className="text-white font-bold text-base mb-2">{title}</h3>
          <p className="text-white/40 text-sm leading-relaxed mb-6">{description}</p>

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
              trackColor={wasOnBreak ? "#163C3D" : "#34312D"}
              handleColor={wasOnBreak ? "#34D399" : "#FBBF24"}
              successColor={wasOnBreak ? "#34D399" : "#FBBF24"}
              disabled={locked}
              className="conductor-duty-slider"
            />
          </div>

          {error && (
            <p role="alert" className="mt-3 rounded-lg bg-red-950/90 px-3 py-2 text-xs text-red-300">
              {error}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
