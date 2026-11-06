"use client";

import { Route } from "lucide-react";

/**
 * Opens the trip-direction modal. Sits beside Take a Break in the mobile
 * card, the 1024–1279px floating controls and the xl:+ bar, with the same
 * neutral solid surface. `className` sets size and spacing.
 */
export function TripDirectionButton({
  destination,
  onClick,
  className = "",
}: {
  destination: string;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Trip direction: to ${destination}`}
      className={`inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-white/10 bg-[#131C2E] font-bold text-white transition-colors hover:bg-[#1A2540] active:scale-[0.98] light:border-gray-200 light:bg-white light:text-gray-900 light:hover:bg-gray-100 ${className}`}
    >
      <Route size={14} strokeWidth={2.25} aria-hidden="true" className="shrink-0 text-white/60 light:text-gray-500" />
      To {destination}
    </button>
  );
}
