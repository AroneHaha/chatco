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
      {confirmStop && <div className="mb-4 rounded-xl border border-red-600 bg-red-900 p-4 light:border-red-200 light:bg-red-50"><p className="text-sm font-semibold text-white light:text-gray-900">Stop this SOS?</p><p className="mt-1 text-xs leading-relaxed text-white/80 light:text-gray-700">This closes your alert and tells dispatch you no longer need help.</p></div>}
      {error && <p role="alert" className="mb-3 text-sm text-red-300 light:text-red-600">{error}</p>}
      <div className="flex gap-3">
        <button type="button" disabled={isStopping} onClick={confirmStop ? () => { setConfirmStop(false); setError(""); } : onClose} className={`${buttonClass} border-[#334155] bg-[#0B223A] text-white hover:bg-[#12304E] light:border-gray-300 light:bg-gray-50 light:text-gray-700 light:hover:bg-gray-100`}>{confirmStop ? "Keep SOS active" : "Close screen"}</button>
        <button type="button" disabled={isStopping} onClick={confirmStop ? stop : () => setConfirmStop(true)} className={`${buttonClass} border-red-600 bg-red-700 text-white hover:border-red-500 hover:bg-red-800 light:border-red-600 light:bg-red-700 light:text-white light:hover:border-red-500 light:hover:bg-red-800`}>{isStopping ? "Stopping…" : confirmStop ? "Yes, stop SOS" : "Stop SOS"}</button>
      </div>
    </div>
  );
}
