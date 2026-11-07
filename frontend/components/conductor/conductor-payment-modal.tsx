"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { useConductorShift } from "@/app/(conductor)/hooks/use-conductor-shift";
import { isOperatingDevice } from "@/lib/conductor/services/shift.service";
import HistoryLogModal from "@/components/conductor/modals/history-log-modal";

// Explicit type for dynamic import — prevents Vercel build type inference errors
interface FareCalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  shiftId: string;
  routeId?: string;
  conductorName: string;
  unitNumber: string;
  driverName: string;
  blockedReason: string | null;
  onShowHistory: () => void;
}

const FareCalculatorModal = dynamic<FareCalculatorModalProps>(
  () => import("@/components/conductor/modals/fare-calculator-modal"),
  { ssr: false }
);

/**
 * Global payment modal listener for the Conductor layout.
 *
 * Why this exists:
 * ─────────────────────────────────────────────────────────────
 * The floating "Collect Payment" button in ConductorBottomNav
 * dispatches a `conductor:open-payment` custom event. Previously,
 * only the ConductorDashboard (Home tab) component listened for
 * this event, so the payment modal was not accessible from the
 * Metrics or Settings tabs.
 *
 * This component lives in the conductor layout so the payment
 * modal is available across ALL tabs (Home, Report, Metrics,
 * Settings).
 * ─────────────────────────────────────────────────────────────
 */
export default function ConductorPaymentModal() {
  const { shift } = useConductorShift();
  const [showFareCalc, setShowFareCalc] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  // Always opens so Payment History stays reachable; fares are blocked
  // inside the modal instead while on break or on another device.
  const blockedReason = shift?.isOnBreak
    ? "You're on break. End your break to collect fares."
    : shift && !isOperatingDevice(shift)
      ? "This shift is active on another device. Sync and release that device before collecting a fare here."
      : null;

  useEffect(() => {
    const handler = () => setShowFareCalc(true);
    window.addEventListener("conductor:open-payment", handler);
    return () => window.removeEventListener("conductor:open-payment", handler);
  }, []);

  // ConductorDock dispatches this on every one of its own item clicks so
  // switching to a different tab/popover doesn't require closing this one
  // first — see ConductorDock's closePopovers. Clicking this modal's own
  // Payment button while it's open closes it: the dock checks its active
  // state and only dispatches this, skipping the open event.
  useEffect(() => {
    const handler = () => {
      setShowFareCalc(false);
      setShowHistory(false);
    };
    window.addEventListener("conductor:close-popovers", handler);
    return () => window.removeEventListener("conductor:close-popovers", handler);
  }, []);

  // Lets ConductorSidebar/ConductorDock/ConductorBottomNav show "Payment" as
  // the active tab while this modal is open (and revert to whichever tab
  // actually matches the route once it closes) without needing to know any
  // of this component's internal state directly — same event-based
  // decoupling as conductor:open-payment above.
  useEffect(() => {
    window.dispatchEvent(new CustomEvent("conductor:payment-active-changed", { detail: { active: showFareCalc } }));
  }, [showFareCalc]);

  return (
    <>
      <FareCalculatorModal
        isOpen={showFareCalc}
        onClose={() => setShowFareCalc(false)}
        shiftId={shift?.shiftId || ""}
        routeId={shift?.routeId}
        conductorName={shift?.conductorName || "—"}
        unitNumber={shift?.unitNumber || "—"}
        driverName={shift?.driverName || "—"}
        blockedReason={blockedReason}
        onShowHistory={() => {
          setShowFareCalc(false);
          setShowHistory(true);
        }}
      />
      <HistoryLogModal isOpen={showHistory} onClose={() => setShowHistory(false)} shiftId={shift?.shiftId || ""} />
    </>
  );
}
