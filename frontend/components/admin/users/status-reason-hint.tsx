'use client';

import { useId, useState } from 'react';

interface StatusReasonHintProps {
  /** First line of the tooltip, e.g. "Permanently suspended". */
  title: string;
  reason: string;
  /** Accessible name for the "?" button. */
  label: string;
}

/**
 * Small amber "?" pinned to the top-right of a profile photo (place it inside
 * a `relative` wrapper). Hovering — or tapping, for touch — reveals why the
 * account is in its current state (suspended, rejected).
 */
export function StatusReasonHint({ title, reason, label }: StatusReasonHintProps) {
  const [open, setOpen] = useState(false);
  const tooltipId = useId();

  return (
    <span className="group absolute -right-0.5 -top-0.5" onMouseLeave={() => setOpen(false)}>
      <button
        type="button"
        aria-label={label}
        aria-describedby={tooltipId}
        aria-expanded={open}
        onClick={() => setOpen(value => !value)}
        onBlur={() => setOpen(false)}
        className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-[#131C2E] bg-amber-400 text-xs font-bold leading-none text-[#071A2E] transition-colors hover:bg-amber-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400 admin-light:border-[#F8FAFC]"
      >
        ?
      </button>
      <span
        id={tooltipId}
        role="tooltip"
        className={`absolute left-0 top-full z-10 mt-2 w-52 rounded-md border border-[#2A3A55] bg-[#0B1120] p-3 text-left text-xs shadow-xl shadow-black/40 transition-opacity sm:left-1/2 sm:-translate-x-1/2 admin-light:border-[#E2E8F0] admin-light:bg-white admin-light:shadow-slate-900/10 group-hover:visible group-hover:opacity-100 ${open ? 'visible opacity-100' : 'invisible opacity-0'}`}
      >
        <span className="block font-semibold text-amber-300 admin-light:text-amber-700">{title}</span>
        <span className="mt-1 block wrap-anywhere text-slate-300 admin-light:text-slate-700">{reason}</span>
      </span>
    </span>
  );
}
