"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { RefreshCw } from "lucide-react";
import { getEcho } from "@/lib/echo";
import { useAuth } from "@/contexts/auth-context";

/** Seconds the notice stays up before signing out on its own. */
const COUNTDOWN_SECONDS = 5;

/**
 * Signs the conductor out when an admin changes the minimum fare or discount
 * rate (Admin › Financial Rules), so every device signs back in on the new
 * fares.
 *
 * The save expires every conductor token after a short grace period and
 * broadcasts FaresUpdated on private-conductors. This notice explains the
 * sign-out and counts down inside that grace. A device that misses the event
 * (offline, realtime unavailable) still loses its session when the token
 * expires, through the API client's usual 401 → /login redirect.
 *
 * The active shift is server-side and untouched: it reloads after sign-in.
 */
export default function ConductorFaresUpdatedNotice() {
  const { logout } = useAuth();
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const signingOut = useRef(false);

  useEffect(() => {
    let echo: ReturnType<typeof getEcho> | null = null;
    try {
      echo = getEcho();
      echo.private("conductors").listen(".FaresUpdated", (event: { sign_out_in_seconds?: number }) => {
        // Stay inside the server's grace period, leaving time for the logout request.
        const grace = event?.sign_out_in_seconds ?? COUNTDOWN_SECONDS;
        setSecondsLeft(current => current ?? Math.max(1, Math.min(COUNTDOWN_SECONDS, grace - 2)));
      });
    } catch (error) {
      console.warn("Fare update notice unavailable; the session still ends when its token expires:", error);
    }
    return () => { echo?.leave("conductors"); };
  }, []);

  const signOut = useCallback(() => {
    if (signingOut.current) return;
    signingOut.current = true;
    void logout("/login");
  }, [logout]);

  useEffect(() => {
    if (secondsLeft === null) return;
    if (secondsLeft <= 0) { signOut(); return; }
    const timer = window.setTimeout(() => setSecondsLeft(secondsLeft - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [secondsLeft, signOut]);

  if (secondsLeft === null) return null;

  return (
    <div className="fixed inset-0 z-[130] flex items-end justify-center p-0 sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-black/60" />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="fares-updated-title"
        aria-describedby="fares-updated-message"
        className="relative w-full overflow-hidden rounded-t-2xl border border-[#1E2D45] bg-[#071A2E] pb-safe shadow-2xl animate-fade-in sm:max-w-sm sm:rounded-2xl light:border-gray-200 light:bg-white"
      >
        <div className="p-6 pt-5">
          <RefreshCw size={32} aria-hidden="true" className="text-[#62A0EA] light:text-[#1A5FB4]" />
          <h3 id="fares-updated-title" className="mt-4 text-lg font-bold text-white light:text-gray-900">
            System updated
          </h3>
          <p id="fares-updated-message" className="mt-1 text-sm leading-relaxed text-white/60 light:text-gray-500">
            Fares were updated by an admin. You will be signed out automatically. Sign in again to continue; your shift stays open.
          </p>
          <p aria-live="polite" className="mt-3 text-sm font-medium tabular-nums text-white/80 light:text-gray-700">
            Signing out in {secondsLeft}s
          </p>
          <button
            type="button"
            onClick={signOut}
            autoFocus
            className="mt-6 h-11 w-full rounded-xl bg-[#1A5FB4] text-sm font-semibold text-white transition-colors hover:bg-[#164A8F]"
          >
            Sign out now
          </button>
        </div>
      </div>
    </div>
  );
}
