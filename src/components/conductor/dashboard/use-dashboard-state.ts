"use client";

import { useState } from "react";
import { useConductorShift } from "@/app/(conductor)/hooks/use-conductor-shift";
import { useConductorTransactions } from "@/app/(conductor)/hooks/use-conductor-transactions";
import { useConductorHails } from "@/app/(conductor)/hooks/use-conductor-hails";
import type { ConductorShift } from "@/lib/conductor/persistence/shift.store";

export interface TransactionSummary {
  gcash: number;
  cash: number;
  voucher: number;
  total: number;
}

export type ConductorStatus = "Available" | "Standing" | "Full";

export interface DashboardState {
  // Shift data
  shift: ConductorShift | null;
  elapsed: string;
  shiftStatus: "loading" | "success" | "error" | "empty";
  shiftError: string | null;

  // Transaction data
  liveTransactions: TransactionSummary;
  txnStatus: "loading" | "success" | "error" | "empty";
  txnError: string | null;

  // Hails data
  hails: import("@/lib/conductor/types").ConductorHailRequest[];

  // Local state
  status: ConductorStatus;
  setStatus: (status: ConductorStatus) => void;
  showHistory: boolean;
  setShowHistory: (show: boolean) => void;
  mobileCardExpanded: boolean;
  setMobileCardExpanded: (expanded: boolean) => void;

  // Derived
  conductorName: string;
  unitNumber: string;
  route: string;
  driverName: string;
}

export function useDashboardState(): DashboardState {
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
