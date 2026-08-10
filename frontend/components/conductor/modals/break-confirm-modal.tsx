"use client";

// components/conductor/modals/break-confirm-modal.tsx
//
// Confirmation modal for toggling "Take a Break" / "Resume Duty". Replaces
// the old instant toggle: the conductor must drag the slider fully across
// the track (left → right) to confirm. Releasing early snaps the slider
// back to the start and does nothing; closing the modal without completing
// the slide cancels the action the same way. The parent only mounts this
// component while the modal should be visible (`{show && <BreakConfirmModal ... />}`).

import { useCallback, useRef, useState } from "react";

interface BreakConfirmModalProps {
  isOnBreak: boolean;
  busy: boolean;
  error: string | null;
  onClose: () => void;
  onConfirm: () => void;
}

const KNOB_SIZE = 48;
const TRACK_PADDING = 4;
const COMPLETE_RATIO = 0.9;

// The parent only mounts this component while the modal is open, so a
// fresh mount already starts every piece of state below at its initial
// value — no "reset on open" effect needed.
export default function BreakConfirmModal({
  isOnBreak,
  busy,
  error,
  onClose,
  onConfirm,
}: BreakConfirmModalProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const startXRef = useRef(0);
  const pointerIdRef = useRef<number | null>(null);

  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [maxDrag, setMaxDrag] = useState(1);

  // Let the conductor retry if the confirm request finishes with an error,
  // instead of leaving the slider stuck at "confirmed". Adjusted during
  // render rather than in an effect, per React's guidance for state derived
  // from a prop transition (avoids the extra effect render pass).
  const [prevBusy, setPrevBusy] = useState(busy);
  if (busy !== prevBusy) {
    setPrevBusy(busy);
    if (prevBusy && !busy && error) {
      setConfirmed(false);
      setDragX(0);
    }
  }

  const locked = busy || confirmed;

  const handlePointerDown = useCallback(
    (event: React.PointerEvent<HTMLButtonElement>) => {
      if (locked || !trackRef.current) return;
      setMaxDrag(Math.max(trackRef.current.clientWidth - KNOB_SIZE - TRACK_PADDING * 2, 1));
      startXRef.current = event.clientX - dragX;
      pointerIdRef.current = event.pointerId;
      event.currentTarget.setPointerCapture(event.pointerId);
      setDragging(true);
    },
    [dragX, locked]
  );

  const handlePointerMove = useCallback(
    (event: React.PointerEvent<HTMLButtonElement>) => {
      if (!dragging || pointerIdRef.current !== event.pointerId) return;
      const next = Math.min(Math.max(event.clientX - startXRef.current, 0), maxDrag);
      setDragX(next);
    },
    [dragging, maxDrag]
  );

  const endDrag = useCallback(
    (event: React.PointerEvent<HTMLButtonElement>) => {
      if (pointerIdRef.current !== event.pointerId) return;
      pointerIdRef.current = null;
      if (!dragging) return;
      setDragging(false);

      const ratio = dragX / maxDrag;
      if (ratio >= COMPLETE_RATIO) {
        setDragX(maxDrag);
        setConfirmed(true);
        onConfirm();
      } else {
        // Released before completing the slide — cancel, snap back.
        setDragX(0);
      }
    },
    [dragX, dragging, maxDrag, onConfirm]
  );

  // Keyboard fallback for the drag-only control (Enter/Space confirms).
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLButtonElement>) => {
      if (locked) return;
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        setConfirmed(true);
        onConfirm();
      }
    },
    [locked, onConfirm]
  );

  const ratio = dragging || confirmed ? dragX / maxDrag : 0;
  const accent = isOnBreak ? "emerald" : "amber";
  const title = isOnBreak ? "Resume Duty?" : "Take a Break?";
  const description = isOnBreak
    ? "You'll be marked back on duty and visible to commuters and hails again."
    : "Your unit pauses from the live map while on break, and won't be flagged as inactive.";
  const instruction = busy ? "Updating..." : isOnBreak ? "Slide to resume duty" : "Slide to start break";

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

          <div
            ref={trackRef}
            className={`relative w-full h-14 rounded-full border select-none touch-none ${
              accent === "emerald" ? "bg-emerald-500/10 border-emerald-500/20" : "bg-amber-500/10 border-amber-500/20"
            }`}
          >
            <span
              className={`absolute inset-0 flex items-center justify-center text-xs font-bold uppercase tracking-wider transition-opacity duration-150 ${
                accent === "emerald" ? "text-emerald-300" : "text-amber-300"
              } ${ratio > 0.35 ? "opacity-0" : "opacity-100"}`}
            >
              {instruction}
            </span>
            <button
              type="button"
              disabled={locked}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={endDrag}
              onPointerCancel={endDrag}
              onKeyDown={handleKeyDown}
              aria-label={isOnBreak ? "Slide to resume duty" : "Slide to start break"}
              style={{
                transform: `translateX(${dragX}px)`,
                transition: dragging ? "none" : "transform 0.25s ease",
              }}
              className={`absolute left-1 top-1 w-12 h-12 rounded-full flex items-center justify-center shadow-lg touch-none disabled:cursor-wait ${
                accent === "emerald" ? "bg-emerald-500 text-white" : "bg-amber-500 text-white"
              }`}
            >
              {locked ? (
                <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              ) : (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
              )}
            </button>
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
