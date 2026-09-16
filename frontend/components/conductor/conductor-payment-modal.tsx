"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { useConductorShift } from "@/app/(conductor)/hooks/use-conductor-shift";
import { isOperatingDevice } from "@/lib/conductor/services/shift.service";

// Explicit type for dynamic import — prevents Vercel build type inference errors
interface FareCalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  shiftId: string;
  routeId?: string;
  conductorName: string;
  unitNumber: string;
  driverName: string;
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

  useEffect(() => {
    const handler = () => {
      if (shift && !isOperatingDevice(shift)) {
        window.alert("This shift is active on another device. Sync and release that device before collecting a fare here.");
        return;
      }
      if (!shift?.isOnBreak) setShowFareCalc(true);
    };
    window.addEventListener("conductor:open-payment", handler);
    return () => window.removeEventListener("conductor:open-payment", handler);
  }, [shift]);

  // ConductorDock dispatches this on every one of its own item clicks
  // (including this modal's own Payment button) so switching to a
  // different tab/popover doesn't require closing this one first — see
  // ConductorDock's closePopovers. A same-click reopen (Payment clicked
  // while already open) still nets out to open: React batches this
  // synchronous close with the conductor:open-payment handler above that
  // fires right after it in the same click.
  useEffect(() => {
    const handler = () => setShowFareCalc(false);
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
    <FareCalculatorModal
      isOpen={showFareCalc}
      onClose={() => setShowFareCalc(false)}
      shiftId={shift?.shiftId || ""}
      routeId={shift?.routeId}
      conductorName={shift?.conductorName || "—"}
      unitNumber={shift?.unitNumber || "—"}
      driverName={shift?.driverName || "—"}
    />
  );
}
