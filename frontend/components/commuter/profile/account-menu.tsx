"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ChevronDown, LogOut, Moon, Settings, Sun } from "lucide-react";
import { useLightModeToggle } from "@/contexts/commuter-theme-context";

/**
 * What the shell's AccountMenu needs from the content that owns logging out
 * (ProfileContent / SettingsContent own the confirmation dialog and, for
 * conductors, the remittance lock). `null` while that content is loading or
 * failed to load, so Log out stays unavailable until it can be confirmed.
 */
export type SignOutControl = {
  request: () => void;
  locked: boolean;
};

/**
 * lg:+ account dropdown for the commuter Profile and conductor Settings
 * headers: shows the current appearance mode and holds Log out, so Log out
 * no longer sits alone at the bottom of the scroll. Below lg: the round
 * ProfileThemeToggle and the bottom Log out button stay as they were.
 *
 * Appearance shares ProfileThemeToggle's state: the real commuter preference
 * inside the commuter app, preview-only in the conductor app.
 *
 * `trigger`: "appearance" (default) shows the current mode's moon/sun with a
 * chevron; "gear" is a bare settings gear that turns while the menu opens,
 * used by the commuter Profile.
 */
export default function AccountMenu({
  signOut,
  lockedHint,
  trigger = "appearance",
}: {
  signOut: SignOutControl | null;
  lockedHint?: string;
  trigger?: "appearance" | "gear";
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLight, setIsLight] = useLightModeToggle();
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!isOpen) return;
    const handlePointer = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setIsOpen(false);
    };
    document.addEventListener("pointerdown", handlePointer);
    return () => document.removeEventListener("pointerdown", handlePointer);
  }, [isOpen]);

  const signOutDisabled = !signOut || signOut.locked;
  const modeLabel = isLight ? "Light mode" : "Dark mode";

  return (
    <div
      ref={rootRef}
      className="relative shrink-0"
      onKeyDown={event => {
        if (event.key !== "Escape" || !isOpen) return;
        // Close only the menu — the surrounding popover listens for Escape
        // on document and would otherwise close too.
        event.stopPropagation();
        setIsOpen(false);
        triggerRef.current?.focus();
      }}
    >
      {trigger === "gear" ? (
        <button
          ref={triggerRef}
          type="button"
          onClick={() => setIsOpen(previous => !previous)}
          aria-haspopup="true"
          aria-expanded={isOpen}
          aria-controls={menuId}
          aria-label={`Settings, ${modeLabel}`}
          title="Appearance and log out"
          className={`flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#62A0EA] ${isOpen ? "text-white light:text-gray-900" : "text-white/60 hover:text-white light:text-gray-500 light:hover:text-gray-900"}`}
        >
          <Settings
            size={24}
            aria-hidden="true"
            className={`transition-transform duration-500 ease-out motion-reduce:transition-none ${isOpen ? "rotate-180" : "rotate-0"}`}
          />
        </button>
      ) : (
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen(previous => !previous)}
        aria-haspopup="true"
        aria-expanded={isOpen}
        aria-controls={menuId}
        aria-label={`Account options, ${modeLabel}`}
        title="Appearance and log out"
        className={`flex h-10 cursor-pointer items-center gap-1.5 rounded-lg border pl-2.5 pr-2 transition-all duration-300 ease-out hover:scale-105 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#62A0EA] motion-reduce:hover:scale-100 motion-reduce:active:scale-100 motion-reduce:transition-none ${isLight ? "border-amber-300/40 bg-amber-300/15 text-amber-200 hover:border-amber-200/70 hover:bg-amber-300/25 hover:shadow-[0_0_16px_rgba(252,211,77,0.2)] light:border-amber-300 light:bg-amber-50 light:text-amber-600 light:hover:border-amber-400 light:hover:bg-amber-100" : "border-[#62A0EA]/25 bg-[#62A0EA]/10 text-[#99C1F1] hover:border-[#99C1F1]/60 hover:bg-[#62A0EA]/20 hover:shadow-[0_0_16px_rgba(98,160,234,0.25)]"}`}
      >
        {/* Same moon/sun crossfade as ProfileThemeToggle, shown below lg:. */}
        <span className="relative flex h-[18px] w-[18px] items-center justify-center">
          <Moon size={18} aria-hidden="true" className={`absolute transition-all duration-300 ease-out motion-reduce:transition-none ${isLight ? "-rotate-90 scale-50 opacity-0" : "rotate-0 scale-100 opacity-100"}`} />
          <Sun size={18} aria-hidden="true" className={`absolute transition-all duration-300 ease-out motion-reduce:transition-none ${isLight ? "rotate-0 scale-100 opacity-100" : "rotate-90 scale-50 opacity-0"}`} />
        </span>
        <ChevronDown size={15} aria-hidden="true" className={`text-white/50 transition-transform light:text-gray-500 duration-200 motion-reduce:transition-none ${isOpen ? "rotate-180" : ""}`} />
      </button>
      )}

      <div
        id={menuId}
        className={`absolute right-0 top-full z-30 mt-2 w-64 origin-top-right rounded-xl border border-white/10 bg-[#0B223A] p-2 shadow-2xl shadow-black/40 light:border-gray-200 light:bg-white light:shadow-black/10 transition-[opacity,transform] duration-200 ease-out motion-reduce:transition-none ${isOpen ? "visible scale-100 opacity-100" : "invisible pointer-events-none scale-95 opacity-0"}`}
      >
        <p className="px-2 pb-2 pt-1 text-[10px] font-semibold uppercase tracking-wider text-white/40 light:text-gray-500">Appearance</p>
        <div role="group" aria-label="Appearance" className="grid grid-cols-2 gap-1 rounded-lg border border-white/10 bg-[#050F1A] p-1 light:border-gray-200 light:bg-gray-100">
          {([
            { light: false, label: "Dark", Icon: Moon },
            { light: true, label: "Light", Icon: Sun },
          ] as const).map(({ light, label, Icon }) => {
            const active = isLight === light;
            return (
              <button
                key={label}
                type="button"
                aria-pressed={active}
                onClick={() => setIsLight(light)}
                className={`flex min-h-9 items-center justify-center gap-2 rounded-md text-xs font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#62A0EA] ${active ? "bg-[#1A5FB4] text-white" : "text-white/50 hover:bg-white/5 hover:text-white/80 light:text-gray-500 light:hover:bg-white light:hover:text-gray-900"}`}
              >
                <Icon size={15} aria-hidden="true" />{label}
              </button>
            );
          })}
        </div>

        <div className="my-2 border-t border-white/10 light:border-gray-200" />

        <button
          type="button"
          disabled={signOutDisabled}
          onClick={() => {
            setIsOpen(false);
            signOut?.request();
          }}
          className="flex min-h-10 w-full items-center gap-3 rounded-lg px-2 text-left text-sm font-medium text-red-400 transition-colors hover:bg-red-500/10 light:text-red-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
        >
          <LogOut size={17} aria-hidden="true" className="shrink-0" />Log out
        </button>
        {signOut?.locked && lockedHint && <p className="px-2 pb-1 pt-1 text-[11px] leading-relaxed text-amber-400/80 light:text-amber-700">{lockedHint}</p>}
      </div>
    </div>
  );
}
