"use client";

import { useRef, useState } from "react";

export default function SosActions({ onClose, onStop }: { onClose: () => void; onStop: () => Promise<void> }) {
  const [confirmStop, setConfirmStop] = useState(false);
  const [isStopping, setIsStopping] = useState(false);
  const [error, setError] = useState("");
  const stoppingRef = useRef(false);

  const stop = async () => {
    if (stoppingRef.current) return;
    stoppingRef.current = true;
    setIsStopping(true);
    setError("");
    try {
      await onStop();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to stop SOS. Please try again.");
    } finally {
      stoppingRef.current = false;
      setIsStopping(false);
    }
  };

  const buttonClass = "flex min-h-11 flex-1 items-center justify-center rounded-xl border px-3 py-3 text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#62A0EA] disabled:cursor-wait disabled:opacity-50";

  return (
    <div className="mt-5">
      {confirmStop && <div className="mb-4 rounded-xl border border-red-400/20 bg-red-500/10 p-4"><p className="text-sm font-semibold text-white">Stop this SOS?</p><p className="mt-1 text-xs leading-relaxed text-white/60">This closes your alert and tells dispatch you no longer need help.</p></div>}
      {error && <p role="alert" className="mb-3 text-sm text-red-300">{error}</p>}
      <div className="flex gap-3">
        <button type="button" disabled={isStopping} onClick={confirmStop ? () => { setConfirmStop(false); setError(""); } : onClose} className={`${buttonClass} border-white/15 bg-white/5 text-white/80 hover:bg-white/10`}>{confirmStop ? "Keep SOS active" : "Close screen"}</button>
        <button type="button" disabled={isStopping} onClick={confirmStop ? stop : () => setConfirmStop(true)} className={`${buttonClass} border-red-400/25 bg-red-500/10 text-red-300 hover:bg-red-500/20`}>{isStopping ? "Stopping…" : confirmStop ? "Yes, stop SOS" : "Stop SOS"}</button>
      </div>
    </div>
  );
}
