"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ConductorDashboardSkeleton } from "@/components/conductor/ui/skeleton";
import HistoryLogModal from "@/components/conductor/modals/history-log-modal";
import BreakConfirmModal from "@/components/conductor/modals/break-confirm-modal";
import { useDashboardState } from "./dashboard/use-dashboard-state";
import { MobileDashboardCard } from "./dashboard/mobile-dashboard-card";
import { DesktopDashboardCard } from "./dashboard/desktop-dashboard-card";
import { DashboardMapContainer } from "./dashboard/dashboard-map-container";

export default function ConductorDashboard() {
  const router = useRouter();
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
    isOnBreak,
    breakBusy,
    breakError,
    toggleBreak,
    showBreakModal,
    openBreakModal,
    closeBreakModal,
    showHistory,
    setShowHistory,
    mobileCardExpanded,
    setMobileCardExpanded,
    conductorName,
    unitNumber,
    route,
  } = useDashboardState();

  useEffect(() => {
    if (shiftStatus === "empty") {
      // The backend is authoritative. This also handles an already-open tab
      // after an automatic closeout or the Asia/Manila midnight reset.
      router.replace("/unit-verification");
    }
  }, [router, shiftStatus]);

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
      <div className="absolute right-4 top-4 z-30 hidden flex-col items-end gap-1 lg:flex">
        <button
          type="button"
          onClick={openBreakModal}
          disabled={breakBusy}
          className={`rounded-xl border px-4 py-2 text-xs font-bold shadow-lg transition-colors disabled:cursor-wait disabled:opacity-60 ${
            isOnBreak
              ? "border-emerald-400/40 bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30"
              : "border-amber-400/40 bg-amber-500/20 text-amber-300 hover:bg-amber-500/30"
          }`}
        >
          {breakBusy ? "Updating..." : isOnBreak ? "Resume Duty" : "Take a Break"}
        </button>
      </div>

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
        isOnBreak={isOnBreak}
        breakBusy={breakBusy}
        onOpenBreakModal={openBreakModal}
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
        isOnBreak={isOnBreak}
        shiftTimeIn={shift?.timeIn}
        onPaymentClick={() => {
          if (!isOnBreak) {
            window.dispatchEvent(new CustomEvent("conductor:open-payment"));
          }
        }}
        onHistoryClick={() => setShowHistory(true)}
      />

      <DashboardMapContainer
        unitNumber={unitNumber}
        hails={hails}
        status={status}
        isOnBreak={isOnBreak}
      />

      <HistoryLogModal isOpen={showHistory} onClose={() => setShowHistory(false)} shiftId={shift?.shiftId || ""} />

      {showBreakModal && (
        <BreakConfirmModal
          isOnBreak={isOnBreak}
          busy={breakBusy}
          error={breakError}
          onClose={closeBreakModal}
          onConfirm={() => void toggleBreak()}
        />
      )}
    </div>
  );
}
