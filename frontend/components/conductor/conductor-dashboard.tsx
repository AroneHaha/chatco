"use client";

import { ConductorDashboardSkeleton } from "@/components/conductor/ui/skeleton";
import HistoryLogModal from "@/components/conductor/modals/history-log-modal";
import { useDashboardState } from "./dashboard/use-dashboard-state";
import { MobileDashboardCard } from "./dashboard/mobile-dashboard-card";
import { DesktopDashboardCard } from "./dashboard/desktop-dashboard-card";
import { DashboardMapContainer } from "./dashboard/dashboard-map-container";

export default function ConductorDashboard() {
  const {
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
  } = useDashboardState();

  if (shiftStatus === "loading" || txnStatus === "loading") {
    return <ConductorDashboardSkeleton />;
  }

  if (shiftStatus === "empty") {
    return (
      <div className="min-h-screen bg-[#050F1A] flex items-center justify-center px-6">
        <div className="max-w-sm text-center">
          <p className="text-white font-semibold text-base">No active shift</p>
          <p className="text-white/40 text-sm mt-2">
            Start a shift from unit verification to access the dashboard.
          </p>
        </div>
      </div>
    );
  }

  if (shiftStatus === "error" || txnStatus === "error") {
    return (
      <div className="min-h-screen bg-[#050F1A] flex items-center justify-center px-6">
        <div className="max-w-sm text-center">
          <p className="text-red-300 text-sm">{shiftError || txnError}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full bg-[#050F1A] flex flex-col lg:block">
      <MobileDashboardCard
        unitNumber={unitNumber}
        route={route}
        conductorName={conductorName}
        elapsed={elapsed}
        status={status}
        setStatus={setStatus}
        mobileCardExpanded={mobileCardExpanded}
        setMobileCardExpanded={setMobileCardExpanded}
        total={liveTransactions.total}
        gcash={liveTransactions.gcash}
        cash={liveTransactions.cash}
        voucher={liveTransactions.voucher}
        onHistoryClick={() => setShowHistory(true)}
      />

      <DesktopDashboardCard
        unitNumber={unitNumber}
        route={route}
        conductorName={conductorName}
        elapsed={elapsed}
        status={status}
        setStatus={setStatus}
        total={liveTransactions.total}
        gcash={liveTransactions.gcash}
        cash={liveTransactions.cash}
        voucher={liveTransactions.voucher}
        shiftTimeIn={shift?.timeIn}
        onPaymentClick={() => window.dispatchEvent(new CustomEvent("conductor:open-payment"))}
        onHistoryClick={() => setShowHistory(true)}
      />

      <DashboardMapContainer unitNumber={unitNumber} hails={hails} />

      <HistoryLogModal isOpen={showHistory} onClose={() => setShowHistory(false)} shiftId={shift?.shiftId || ""} />
    </div>
  );
}
