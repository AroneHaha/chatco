"use client";

import { useEffect, useId, useRef, useState } from "react";
import { CircleQuestionMark, MapPinOff } from "lucide-react";

const HAIL_HINT_COPY = {
  "out-of-range": {
    title: "Outside service radius",
    message: "Move within 1 km of a conductor unit to see ETA and hail. Vehicle locations are still visible on the map.",
  },
  denied: {
    title: "Location access denied",
    message: "Allow location access for CHATCO in your browser settings and turn on your device's location services to see ETA and hail.",
  },
  unavailable: {
    title: "Location unavailable",
    message: "Turn on your device's GPS or location services and allow your browser to use your location to see ETA and hail.",
  },
};

/**
 * The "?" on the hail button explains unavailable location access or why
 * the commuter is outside every unit's service radius.
 *
 * Hover shows it on pointer devices (Tailwind's `hover:` only applies where
 * hover exists); a tap toggles it on touch screens, where there is no hover.
 * Keyboard focus shows it too. The badge is a sibling of the hail button,
 * not inside it — the button is disabled in this state, and a disabled
 * button swallows pointer events.
 */
export function HailRangeHint({
  placement,
  reason = "out-of-range",
  className = "",
}: {
  /** Which side of the badge the explanation opens on. */
  placement: "above" | "below";
  reason?: keyof typeof HAIL_HINT_COPY;
  /** Positions the badge on its hail button, e.g. `-top-1 -right-1`. */
  className?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef<HTMLSpanElement>(null);
  const tipId = useId();
  const { title, message } = HAIL_HINT_COPY[reason];

  // A tapped-open hint closes on a tap elsewhere or Escape.
  useEffect(() => {
    if (!isOpen) return;
    const closeOutside = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setIsOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [isOpen]);

  const visibility = isOpen
    ? "visible opacity-100 translate-y-0"
    : `invisible opacity-0 ${placement === "above" ? "translate-y-1" : "-translate-y-1"} group-hover:visible group-hover:opacity-100 group-hover:translate-y-0 group-focus-within:visible group-focus-within:opacity-100 group-focus-within:translate-y-0`;

  return (
    <span ref={rootRef} className={`group absolute z-40 ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-label="Why can't I hail?"
        aria-expanded={isOpen}
        aria-describedby={tipId}
        // before: widens the tap target past the small visible badge.
        className="relative flex h-5 w-5 items-center justify-center rounded-full bg-[#0B1E33] text-white shadow-md transition-colors before:absolute before:-inset-2.5 hover:bg-[#13304F] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#62A0EA] light:bg-white light:text-gray-700 light:hover:bg-gray-100"
      >
        <CircleQuestionMark className="h-5 w-5" strokeWidth={2} aria-hidden="true" />
      </button>

      <span
        id={tipId}
        role="tooltip"
        className={`absolute right-0 w-64 rounded-xl border border-white/10 bg-[#0B1E33] p-3.5 text-left shadow-2xl shadow-black/40 transition-[opacity,transform,visibility] duration-150 light:border-gray-200 light:bg-white light:shadow-black/10 ${
          placement === "above" ? "bottom-full mb-2.5" : "top-full mt-2.5"
        } ${visibility}`}
      >
        <span className="flex items-center gap-2 text-sm font-semibold normal-case tracking-normal text-white light:text-gray-900">
          <MapPinOff className="h-4 w-4 shrink-0 text-amber-400 light:text-amber-600" aria-hidden="true" />
          {title}
        </span>
        <span className="mt-1.5 block text-xs font-normal normal-case leading-relaxed tracking-normal text-white/65 light:text-gray-600">
          {message}
        </span>
      </span>
    </span>
  );
}
