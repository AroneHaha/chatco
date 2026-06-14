// components/conductor/dashboard/use-dashboard-state.ts
// Custom hook that encapsulates all conductor dashboard state & data fetching.
// Extracted from conductor-dashboard.tsx

"use client";

import { useState } from "react";
import { useConductorShift } from "@/app/(conductor)/hooks/use-conductor-shift";
import { useConductorTransactions } from "@/app/(conductor)/hooks/use-conductor-transactions";
import { useConductorHails } from "@/app/(conductor)/hooks/use-conductor-hails";

export type ConductorStatus = "Available" | "Standing" | "Full";

export function useDashboardState() {
  const { shift, elapsed, status: shiftStatus, error: shiftError } = useConductorShift();
  const { summary: liveTransactions, status: txnStatus, error: txnError } =
    useConductorTransactions(shift?.shiftId ?? null);
  const { hails } = useConductorHails();

  const [status, setStatus] = useState<ConductorStatus>("Available");
  const [showHistory, setShowHistory] = useState(false);
  const [mobileCardExpanded, setMobileCardExpanded] = useState(true);

  const conductorName = shift?.conductorName || "—";
  const unitNumber = shift?.unitNumber || "—";
  const route = shift?.route || "—";

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
  };
}
