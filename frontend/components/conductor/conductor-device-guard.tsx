"use client";

import { useState } from "react";
import { useConductorShift } from "@/app/(conductor)/hooks/use-conductor-shift";
import {
  claimOperatingDevice,
  isOperatingDevice,
  releaseOperatingDevice,
} from "@/lib/conductor/services/shift.service";
import { syncPendingTransactions } from "@/lib/conductor/services/transactions.service";
import { getPendingCashTransactions } from "@/lib/conductor/persistence/transactions.store";

export default function ConductorDeviceGuard() {
  const { shift, refresh } = useConductorShift({ pollMs: 30000 });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (!shift) return null;
  const ownsShift = isOperatingDevice(shift);
  const unclaimed = !shift.operatingDeviceId;

  const claim = async () => {
    setBusy(true);
    setError("");
    try {
      await claimOperatingDevice(shift.shiftId);
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to claim this shift.");
    } finally {
      setBusy(false);
    }
  };

  const release = async () => {
    if (!window.confirm("Move this shift to another device? All offline cash must sync first.")) return;
    setBusy(true);
    setError("");
    try {
      await syncPendingTransactions();
      const pending = getPendingCashTransactions().filter((item) => item.shiftId === shift.shiftId);
      if (pending.length) {
        throw new Error("Offline cash is still waiting to sync. Keep this device connected and try again.");
      }
      await releaseOperatingDevice(shift.shiftId);
      window.dispatchEvent(new CustomEvent("conductor:device-changed"));
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to release this shift.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={`mx-4 mt-3 rounded-xl border px-4 py-3 text-sm ${
      ownsShift ? "border-sky-500/25 bg-sky-500/10 text-sky-100" : "border-amber-500/30 bg-amber-500/10 text-amber-100"
    }`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-semibold">
            {unclaimed ? "Choose the operating device" : ownsShift ? "This is the operating device" : "View-only on this device"}
          </p>
          <p className="mt-1 text-xs opacity-75">
            {unclaimed
              ? "Claim this shift before collecting fares."
              : ownsShift
                ? "Release only when moving the shift to Web or Mobile."
                : `The ${shift.operatingDeviceType?.toLowerCase() ?? "other"} device must sync and release the shift first.`}
          </p>
        </div>
        {unclaimed ? (
          <button disabled={busy} onClick={() => void claim()} className="rounded-lg bg-sky-500 px-3 py-2 text-xs font-bold text-white disabled:opacity-50">
            {busy ? "Claiming…" : "Use this device"}
          </button>
        ) : ownsShift ? (
          <button disabled={busy} onClick={() => void release()} className="rounded-lg border border-white/15 px-3 py-2 text-xs font-semibold disabled:opacity-50">
            {busy ? "Checking sync…" : "Release for handoff"}
          </button>
        ) : null}
      </div>
      {error ? <p className="mt-2 text-xs text-red-300">{error}</p> : null}
    </div>
  );
}
