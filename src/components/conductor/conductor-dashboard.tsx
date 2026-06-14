"use client";

import HistoryLogModal from "@/components/conductor/modals/history-log-modal";
import { ConductorDashboardSkeleton } from "@/components/conductor/ui/skeleton";
import { useDashboardState } from "@/components/conductor/dashboard/use-dashboard-state";
import MobileDashboardCard from "@/components/conductor/dashboard/mobile-dashboard-card";
import DesktopDashboardCard from "@/components/conductor/dashboard/desktop-dashboard-card";
import DashboardMapContainer from "@/components/conductor/dashboard/dashboard-map-container";

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
    unitNumber,
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
        shift={shift}
        elapsed={elapsed}
        status={status}
        setStatus={setStatus}
        liveTransactions={liveTransactions}
        showHistory={showHistory}
        setShowHistory={setShowHistory}
        mobileCardExpanded={mobileCardExpanded}
        setMobileCardExpanded={setMobileCardExpanded}
      />

      <DesktopDashboardCard
        shift={shift}
        elapsed={elapsed}
        status={status}
        setStatus={setStatus}
        liveTransactions={liveTransactions}
        showHistory={showHistory}
        setShowHistory={setShowHistory}
      />

      <DashboardMapContainer unitNumber={unitNumber} hails={hails} />

      <HistoryLogModal isOpen={showHistory} onClose={() => setShowHistory(false)} shiftId={shift?.shiftId || ""} />
    </div>
  );
}
