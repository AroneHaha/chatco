"use client";

import { useState, useRef, useCallback } from "react";
import { useConductorShift } from "@/app/(conductor)/hooks/use-conductor-shift";
import { useConductorTransactions } from "@/app/(conductor)/hooks/use-conductor-transactions";
import { useConductorHails } from "@/app/(conductor)/hooks/use-conductor-hails";
import { CONDUCTOR_API } from "@/lib/conductor/endpoints";

export type ConductorStatus = "Available" | "Standing" | "Full";

// UI labels → backend CapacityStatus enum values.
const TO_CAPACITY: Record<ConductorStatus, "AVAILABLE" | "STANDING" | "FULL"> = {
  Available: "AVAILABLE",
  Standing: "STANDING",
  Full: "FULL",
};

export function useDashboardState() {
  const { shift, elapsed, status: shiftStatus, error: shiftError } = useConductorShift();
  const { summary: liveTransactions, status: txnStatus, error: txnError } =
    useConductorTransactions(shift?.shiftId ?? null);
  // Conductor just observes waiting commuters on the map; the commuter drives
  // the hail lifecycle (create + cancel), so no accept/reject action here.
  const { hails } = useConductorHails();

  const [status, setStatusState] = useState<ConductorStatus>("Available");
  // Mirror of `status` for reading the pre-change value inside setStatus
  // without adding it to the callback's deps (keeps setStatus stable).
  const statusRef = useRef<ConductorStatus>("Available");

  // Persist the conductor's unit capacity to the backend so it recolors the
  // unit on every commuter's map (green / yellow / red). Optimistic: flip the
  // UI immediately, then roll back if the request fails (e.g. no active shift).
  const setStatus = useCallback((next: ConductorStatus) => {
    const prev = statusRef.current;
    if (prev === next) return;

    statusRef.current = next;
    setStatusState(next);

    void (async () => {
      try {
        const res = await fetch(CONDUCTOR_API.capacityStatus, {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({ capacity_status: TO_CAPACITY[next] }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
      } catch {
        // Revert the optimistic update — the map still shows the old status.
        statusRef.current = prev;
        setStatusState(prev);
      }
    })();
  }, []);

  const [showHistory, setShowHistory] = useState(false);
  const [mobileCardExpanded, setMobileCardExpanded] = useState(true);

  const conductorName = shift?.conductorName || "—";
  const unitNumber = shift?.unitNumber || "—";
  const route = shift?.route || "—";
  const driverName = shift?.driverName || "—";

  return {
    shift,
    elapsed,
    shiftStatus,
    shiftError,
    liveTransactions,
    txnStatus,
    txnError,
    hails,
    status,
    setStatus,
    showHistory,
    setShowHistory,
    mobileCardExpanded,
    setMobileCardExpanded,
    conductorName,
    unitNumber,
    route,
    driverName,
  };
}
