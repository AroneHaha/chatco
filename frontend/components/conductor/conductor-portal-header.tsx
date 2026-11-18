"use client";

import Image from "next/image";
import { LogOut } from "lucide-react";
import { useLightModeToggle } from "@/contexts/commuter-theme-context";
import { ThemeToggleIcons } from "@/components/commuter/profile/profile-theme-toggle";

/**
 * Brand row for the conductor screens that run without the app navigation
 * (unit verification, settling an earlier day's remittance): logo, theme
 * toggle and sign out, since there is no nav to reach those from.
 */
export default function ConductorPortalHeader({ onSignOut, isSigningOut }: { onSignOut: () => void; isSigningOut: boolean }) {
  const [isLight, setIsLight] = useLightModeToggle();

  return (
    <div className="mb-6 flex shrink-0 items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-3">
        <Image src="/logo-transparent.png" alt="" width={40} height={40} className="shrink-0" priority />
        <div className="min-w-0">
          <p className="text-2xl font-extrabold text-white light:text-gray-900 tracking-tight">
            CHATCO<span className="text-[#62A0EA] light:text-[#1A5FB4]">.</span>
          </p>
          <p className="text-[10px] text-slate-500 light:text-gray-500 uppercase tracking-[0.2em] font-semibold mt-1">
            Conductor Portal
          </p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {/* Same light/dark preference and Moon/Sun swap as the profile
            toggle, on every screen size, in this page's solid button style. */}
        <button
          type="button"
          onClick={() => setIsLight(!isLight)}
          aria-label="Toggle dark and light mode"
          aria-pressed={isLight}
          title={isLight ? "Light mode · Switch to dark mode" : "Dark mode · Switch to light mode"}
          className="relative flex h-10 w-10 cursor-pointer items-center justify-center overflow-hidden rounded-full border border-[#1C3350] light:border-gray-200 bg-[#0B1E33] light:bg-white text-slate-300 light:text-gray-700 transition-colors hover:bg-[#10273F] light:hover:bg-gray-100 hover:text-white light:hover:text-gray-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1A5FB4]"
        >
          <ThemeToggleIcons isLight={isLight} size={18} />
        </button>
        <button
          type="button"
          onClick={onSignOut}
          disabled={isSigningOut}
          className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-xl border border-[#1C3350] light:border-gray-200 bg-[#0B1E33] light:bg-white px-3 text-xs font-semibold text-slate-300 light:text-gray-700 transition-colors hover:bg-[#10273F] light:hover:bg-gray-100 hover:text-white light:hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <LogOut size={15} />
          {isSigningOut ? "Signing out" : "Sign out"}
        </button>
      </div>
    </div>
  );
}
