"use client";

import { Pause, Play } from "lucide-react";

/**
 * Take a Break / Resume Duty, shared by the mobile card, the 1024–1279px
 * floating control and the xl:+ bar. One neutral solid surface in both
 * states: the label and the pause/play icon say which action it is, rather
 * than a separate colour per state. `className` sets size and spacing.
 */
export function BreakToggleButton({
  isOnBreak,
  busy,
  disabled,
  onClick,
  className = "",
}: {
  isOnBreak: boolean;
  busy: boolean;
  disabled: boolean;
  onClick: () => void;
  className?: string;
}) {
  const Icon = isOnBreak ? Play : Pause;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={isOnBreak}
      className={`inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-white/10 bg-[#131C2E] font-bold text-white transition-colors hover:bg-[#1A2540] active:scale-[0.98] disabled:cursor-wait disabled:opacity-60 light:border-gray-200 light:bg-white light:text-gray-900 light:hover:bg-gray-100 ${className}`}
    >
      <Icon size={14} strokeWidth={2.25} aria-hidden="true" className="shrink-0 text-white/60 light:text-gray-500" />
      {busy ? "Updating..." : isOnBreak ? "Resume Duty" : "Take a Break"}
    </button>
  );
}
