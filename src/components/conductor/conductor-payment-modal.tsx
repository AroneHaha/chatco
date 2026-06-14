"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { useConductorShift } from "@/app/(conductor)/hooks/use-conductor-shift";

// Explicit type for dynamic import — prevents Vercel build type inference errors
interface FareCalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  shiftId: string;
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
    const handler = () => setShowFareCalc(true);
    window.addEventListener("conductor:open-payment", handler);
    return () => window.removeEventListener("conductor:open-payment", handler);
  }, []);

  return (
    <FareCalculatorModal
      isOpen={showFareCalc}
      onClose={() => setShowFareCalc(false)}
      shiftId={shift?.shiftId || ""}
      conductorName={shift?.conductorName || "—"}
      unitNumber={shift?.unitNumber || "—"}
      driverName={shift?.driverName || "—"}
    />
  );
}
