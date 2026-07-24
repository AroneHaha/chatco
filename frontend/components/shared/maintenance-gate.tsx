"use client";

import { useState, useEffect } from "react";
import MaintenanceScreen from "@/components/shared/maintenance-screen";

/**
 * Client gate for the commuter + conductor app shells. When an admin turns on
 * Maintenance Mode, this replaces the whole app with the maintenance screen.
 *
 * The ADMIN shell is intentionally NOT wrapped in this gate, so admins can
 * still reach /settings/app-configuration to turn maintenance back off.
 *
 * Behaviour:
 *  - Optimistic: renders children immediately and only swaps to the screen
 *    once the status check confirms maintenance is on (so the common
 *    not-in-maintenance case has zero delay).
 *  - Re-checks when the tab regains focus, so flipping maintenance off (or on)
 *    releases/gates an already-open session without a manual hard refresh.
 *  - Fails open — any error leaves the app usable.
 */
export default function MaintenanceGate({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<{ on: boolean; message: string }>({
    on: false,
    message: "",
  });

  useEffect(() => {
    let cancelled = false;

    // setState happens only after the awaited fetch resolves (a microtask),
    // never synchronously during the effect.
    const check = async () => {
      try {
        const res = await fetch("/api/system-status", { headers: { Accept: "application/json" } });
        if (cancelled || !res.ok) return;
        const json = await res.json();
        if (cancelled) return;
        setState({
          on: Boolean(json?.data?.maintenance_mode),
          message: json?.data?.maintenance_message ?? "",
        });
      } catch {
        // Fail open — keep the app usable if the check fails.
      }
    };

    void check();

    const onFocus = () => void check();
    window.addEventListener("focus", onFocus);
    return () => {
      cancelled = true;
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  if (state.on) {
    return <MaintenanceScreen message={state.message} />;
  }

  return <>{children}</>;
}
