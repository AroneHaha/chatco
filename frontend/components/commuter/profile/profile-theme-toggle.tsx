"use client";

import { Moon, Sun } from "lucide-react";
import { useLightModeToggle } from "@/contexts/commuter-theme-context";

/** Moon/Sun swap animation shared by the commuter and admin theme toggles. */
export function ThemeToggleIcons({ isLight, size = 20 }: { isLight: boolean; size?: number }) {
  return (
    <>
      <Moon size={size} aria-hidden="true" className={`absolute transition-all duration-300 ease-out motion-reduce:transition-none ${isLight ? "-rotate-90 scale-50 opacity-0" : "rotate-0 scale-100 opacity-100"}`} />
      <Sun size={size} aria-hidden="true" className={`absolute transition-all duration-300 ease-out motion-reduce:transition-none ${isLight ? "rotate-0 scale-100 opacity-100" : "rotate-90 scale-50 opacity-0"}`} />
    </>
  );
}

export default function ProfileThemeToggle() {
  // The real appearance preference of whichever app it's in (the conductor
  // settings page reuses this toggle).
  const [isLight, setIsLight] = useLightModeToggle();

  return (
    <button
      type="button"
      onClick={() => setIsLight(!isLight)}
      aria-label="Toggle dark and light mode"
      aria-pressed={isLight}
      title={isLight ? "Light mode · Switch to dark mode" : "Dark mode · Switch to light mode"}
      className={`relative flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-full border transition-all duration-300 ease-out hover:scale-105 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#62A0EA] focus-visible:ring-offset-2 focus-visible:ring-offset-[#071A2E] light:focus-visible:ring-offset-[#F8FAFC] motion-reduce:hover:scale-100 motion-reduce:active:scale-100 motion-reduce:transition-none ${isLight ? "border-amber-300/40 bg-amber-300/15 text-amber-200 hover:border-amber-200/70 hover:bg-amber-300/25 hover:shadow-[0_0_16px_rgba(252,211,77,0.2)] light:border-amber-300 light:bg-amber-50 light:text-amber-600 light:hover:border-amber-400 light:hover:bg-amber-100" : "border-[#62A0EA]/25 bg-[#62A0EA]/10 text-[#99C1F1] hover:border-[#99C1F1]/60 hover:bg-[#62A0EA]/20 hover:shadow-[0_0_16px_rgba(98,160,234,0.25)]"}`}
    >
      <ThemeToggleIcons isLight={isLight} />
    </button>
  );
}
