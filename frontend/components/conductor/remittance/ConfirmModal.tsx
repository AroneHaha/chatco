// app/components/conductor/remittance/ConfirmModal.tsx
import { useCallback, useRef, useState } from "react";
import { fmt } from "@/app/(conductor)/conductor-dashboard/end-of-day/helpers";

interface ConfirmModalProps {
  show: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isRemitting: boolean;
  shiftInfo: { driverName: string; unitNumber: string };
  gcashTotal: number;
  cashTotal: number;
  grandTotal: number;
  totalPassengers: number;
}

const KNOB_SIZE = 48;
const TRACK_PADDING = 4;
const COMPLETE_RATIO = 0.9;

export default function ConfirmModal({
  show,
  onClose,
  onConfirm,
  isRemitting,
  shiftInfo,
  gcashTotal,
  cashTotal,
  grandTotal,
  totalPassengers,
}: ConfirmModalProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const startXRef = useRef(0);
  const pointerIdRef = useRef<number | null>(null);

  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [maxDrag, setMaxDrag] = useState(1);
  const [prevShow, setPrevShow] = useState(show);
  const [prevRemitting, setPrevRemitting] = useState(isRemitting);

  if (show !== prevShow) {
    setPrevShow(show);
    setDragX(0);
    setDragging(false);
    setConfirmed(false);
  }

  if (isRemitting !== prevRemitting) {
    setPrevRemitting(isRemitting);
    if (prevRemitting && !isRemitting) {
      setConfirmed(false);
      setDragX(0);
    }
  }

  const locked = isRemitting || confirmed;

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
        setDragX(0);
      }
    },
    [dragX, dragging, maxDrag, onConfirm]
  );

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

  if (!show) return null;

  const ratio = dragging || confirmed ? dragX / maxDrag : 0;
  const normalizedRatio = Math.min(Math.max(ratio, 0), 1);
  const isActivationReady = normalizedRatio >= COMPLETE_RATIO || confirmed;
  const slideInstruction = isRemitting
    ? "Processing..."
    : isActivationReady
      ? "Release to confirm"
      : "Slide to confirm remittance";

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={!isRemitting ? onClose : undefined} />
      <div className="relative w-full max-w-sm bg-[#0B1E33] border border-white/10 rounded-3xl overflow-hidden shadow-2xl animate-slide-up max-h-[90vh] overflow-y-auto">
        <div className="p-6 space-y-5">
          <div className="flex justify-center">
            <div className="w-14 h-14 rounded-full bg-[#1A5FB4]/15 flex items-center justify-center">
              <svg className="w-7 h-7 text-[#62A0EA]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z" />
              </svg>
            </div>
          </div>

          <div className="text-center">
            <h2 className="text-white font-bold text-lg">Confirm Remittance</h2>
            <p className="text-xs text-white/40 mt-1">Submit shift report to admin</p>
          </div>

          <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 space-y-2.5">
            <div className="flex items-center justify-between text-sm">
              <span className="text-white/40">Driver / Unit</span>
              <span className="text-white font-semibold">{shiftInfo.driverName} / {shiftInfo.unitNumber}</span>
            </div>
            <div className="h-px bg-white/[0.04]" />
            <div className="flex justify-between text-sm">
              <span className="text-white/40">Total Passengers</span>
              <span className="text-white font-bold tabular-nums">{totalPassengers}</span>
            </div>
            <div className="h-px bg-white/[0.04]" />
            <div className="flex justify-between text-sm">
              <span className="text-white/40 flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-blue-400" />GCash (digital)</span>
              <span className="text-blue-400 font-bold tabular-nums">{fmt(gcashTotal)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-white/40 flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-emerald-400" />Cash (system-tracked)</span>
              <span className="text-emerald-400 font-bold tabular-nums">{fmt(cashTotal)}</span>
            </div>
            <div className="h-px bg-white/10" />
            <div className="flex justify-between">
              <span className="text-xs font-bold text-white/50 uppercase tracking-wider">Grand Total</span>
              <span className="text-lg font-extrabold text-white tabular-nums">{fmt(grandTotal)}</span>
            </div>
          </div>

          <div className="flex items-start gap-2.5 bg-blue-500/8 border border-blue-500/15 rounded-xl p-3">
            <svg className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
            </svg>
            <p className="text-[11px] text-blue-400/70 leading-relaxed">
              Hand over <span className="font-bold text-blue-400">{fmt(cashTotal)}</span> in cash to admin. They&apos;ll
              count it and record the official Cash Declaration for this shift.
            </p>
          </div>

          <div className="space-y-3">
            <div
              ref={trackRef}
              className={`relative h-14 w-full select-none overflow-hidden rounded-full border touch-none transition-colors duration-200 ${
                isActivationReady
                  ? "border-emerald-400/45 bg-emerald-500/15"
                  : "border-[#62A0EA]/25 bg-[#1A5FB4]/12"
              }`}
            >
              <div
                className={`absolute inset-y-0 left-0 rounded-full transition-[width,background-color] duration-150 ${
                  isActivationReady ? "bg-emerald-500/45" : "bg-[#1A5FB4]/35"
                }`}
                style={{ width: `${normalizedRatio * 100}%` }}
              />
              <span
                className={`absolute inset-0 flex items-center justify-center px-14 text-center text-xs font-bold uppercase tracking-wider transition-opacity duration-150 ${
                  isActivationReady ? "text-emerald-200" : "text-[#9dccff]"
                } ${
                  ratio > 0.35 ? "opacity-0" : "opacity-100"
                }`}
              >
                {slideInstruction}
              </span>
              <button
                type="button"
                disabled={locked}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={endDrag}
                onPointerCancel={endDrag}
                onKeyDown={handleKeyDown}
                aria-label="Slide to confirm remittance"
                style={{
                  transform: `translateX(${dragX}px)`,
                  transition: dragging ? "none" : "transform 0.25s ease",
                }}
                className={`absolute left-1 top-1 flex h-12 w-12 touch-none items-center justify-center rounded-full text-white shadow-lg transition-colors duration-200 disabled:cursor-wait disabled:opacity-80 ${
                  isActivationReady
                    ? "bg-emerald-500 shadow-emerald-500/30"
                    : "bg-[#1A5FB4] shadow-[#1A5FB4]/30"
                }`}
              >
                {isRemitting || confirmed ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                ) : (
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                  </svg>
                )}
              </button>
            </div>

            <button onClick={onClose} disabled={isRemitting} className="w-full py-3 rounded-xl bg-white/5 border border-white/10 text-white/60 text-sm font-semibold hover:bg-white/10 transition-all active:scale-[0.98] disabled:opacity-50">
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
