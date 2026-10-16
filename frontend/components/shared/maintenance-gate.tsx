"use client";

import { useState, useEffect } from "react";
import MaintenanceScreen from "@/components/shared/maintenance-screen";
import { useAuth } from "@/contexts/auth-context";
import { MAINTENANCE_SUSPECTED_EVENT, parseMaintenanceRoles, type MaintenanceRole } from "@/lib/maintenance";

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
 *  - Re-checks when an API call 503s (the backend blocks every call for an
 *    affected role), so an open tab swaps to the screen on its next request.
 *    A burst of 503s from parallel polls shares one in-flight check.
 *  - Fails open — any error leaves the app usable.
 */
export default function MaintenanceGate({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [state, setState] = useState<{ on: boolean; roles: MaintenanceRole[]; message: string }>({
    on: false,
    roles: [],
    message: "",
  });

  useEffect(() => {
    let cancelled = false;
    let checking = false;

    // setState happens only after the awaited fetch resolves (a microtask),
    // never synchronously during the effect.
    const check = async () => {
      if (checking) return;
      checking = true;
      try {
        const res = await fetch("/api/system-status", { cache: "no-store", headers: { Accept: "application/json" } });
        if (cancelled || !res.ok) return;
        const json = await res.json();
        if (cancelled) return;
        setState({
          on: Boolean(json?.data?.maintenance_mode),
          roles: parseMaintenanceRoles(json?.data?.maintenance_roles),
          message: json?.data?.maintenance_message ?? "",
        });
      } catch {
        // Fail open — keep the app usable if the check fails.
      } finally {
        checking = false;
      }
    };

    void check();

    const onRecheck = () => void check();
    window.addEventListener("focus", onRecheck);
    window.addEventListener(MAINTENANCE_SUSPECTED_EVENT, onRecheck);
    return () => {
      cancelled = true;
      window.removeEventListener("focus", onRecheck);
      window.removeEventListener(MAINTENANCE_SUSPECTED_EVENT, onRecheck);
    };
  }, []);

  if (state.on && state.roles.some(role => role === user?.role)) {
    return <MaintenanceScreen message={state.message} />;
  }

  return <>{children}</>;
}
