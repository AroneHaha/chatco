"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ConductorDashboardSkeleton } from "@/components/conductor/ui/skeleton";
import HistoryLogModal from "@/components/conductor/modals/history-log-modal";
import BreakConfirmModal from "@/components/conductor/modals/break-confirm-modal";
import ConductorConnectivityBanner from "@/components/conductor/conductor-connectivity-banner";
import ConductorDeviceGuard from "@/components/conductor/conductor-device-guard";
import { useDashboardState } from "./dashboard/use-dashboard-state";
import { BreakToggleButton } from "./dashboard/break-toggle-button";
import { useConductorProfile } from "@/app/(conductor)/hooks/use-conductor-profile";
import { MobileDashboardCard } from "./dashboard/mobile-dashboard-card";
import { DesktopDashboardCard } from "./dashboard/desktop-dashboard-card";
import { DesktopDashboardBar } from "./dashboard/desktop-dashboard-bar";
import { DashboardMapContainer } from "./dashboard/dashboard-map-container";

export default function ConductorDashboard() {
  const router = useRouter();
  const {
    shift,
    canOperate,
    elapsed,
    shiftStatus,
    shiftError,
    liveTransactions,
    txnStatus,
    txnError,
    hails,
    hailBusyId,
    hailActionError,
    updateHail,
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
  const conductorPhotoUrl = useConductorProfile()?.photoUrl ?? null;

  useEffect(() => {
    if (shiftStatus === "empty") {
      // The backend is authoritative. This also handles an already-open tab
      // after an automatic closeout or the Asia/Manila midnight reset.
      router.replace("/unit-verification");
    }
  }, [router, shiftStatus]);

  // Only the shift needs to be known before the shell (map + card) can paint.
  // Transactions load in parallel now (see use-conductor-transactions.ts) and
  // the card already renders whatever total it currently has — gating the
  // whole page on txnStatus too just adds a second wait for no visible gain.
  if (shiftStatus === "loading") {
    return <ConductorDashboardSkeleton />;
  }

  if (shiftStatus === "empty") {
    // The effect above is already redirecting to unit verification. Keep the
    // dashboard hidden until navigation completes instead of flashing an
    // empty-shift message on a page the conductor should not be seeing.
    return <ConductorDashboardSkeleton />;
  }

  if (shiftStatus === "error" || txnStatus === "error") {
    return (
      <div className="min-h-screen bg-[#050F1A] light:bg-[#F8FAFC] flex items-center justify-center px-6">
        <div className="max-w-sm text-center">
          <p className="text-red-300 light:text-red-600 text-sm">{shiftError || txnError}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full bg-[#050F1A] flex flex-col lg:block">
      {/* lg:flex xl:hidden: only for the 1024–1279px range (DesktopDashboardCard).
          At xl:+, this same "Take a Break" control lives inside
          DesktopDashboardBar itself instead of floating separately in the
          far corner, disconnected from the rest of the bar's controls. */}
      <div className="absolute right-4 top-4 z-30 hidden flex-col items-end gap-1 lg:flex xl:hidden">
        <BreakToggleButton
          isOnBreak={isOnBreak}
          busy={breakBusy}
          disabled={breakBusy || !canOperate}
          onClick={openBreakModal}
          className="px-4 py-2 text-xs shadow-lg light:shadow-black/10"
        />
      </div>

      {/* Floating top overlay: connectivity/device-guard banners stack above
          the mobile card here, in normal flow within this one absolutely
          positioned box — so unlike rendering them in the shared layout's
          <main>, they can never push this fixed full-bleed screen taller
          than its box (clipped by overflow-hidden) or end up painted under
          the map (position: fixed, its own stacking context). */}
      {/* xl:left-0: the sidebar no longer reserves 256px of left space at
          xl:+ (it's a floating bottom dock instead), so these banners go
          back to full width there. xl:top-24 clears the new top-center bar. */}
      <div className="absolute inset-x-0 top-0 z-30 lg:left-64 lg:top-16 xl:left-0 xl:top-24">
        <ConductorConnectivityBanner />
        <ConductorDeviceGuard />
        <MobileDashboardCard
          unitNumber={unitNumber}
          route={route}
          conductorName={conductorName}
          conductorPhotoUrl={conductorPhotoUrl}
          elapsed={elapsed}
          status={status}
          setStatus={setStatus}
          mobileCardExpanded={mobileCardExpanded}
          setMobileCardExpanded={setMobileCardExpanded}
          total={liveTransactions.total}
          gcash={liveTransactions.gcash}
          cash={liveTransactions.cash}
          onHistoryClick={() => setShowHistory(true)}
          isOnBreak={isOnBreak}
          breakBusy={breakBusy}
          onOpenBreakModal={openBreakModal}
          canOperate={canOperate}
        />
      </div>

      <DesktopDashboardCard
        unitNumber={unitNumber}
        route={route}
        conductorName={conductorName}
        conductorPhotoUrl={conductorPhotoUrl}
        elapsed={elapsed}
        status={status}
        setStatus={setStatus}
        total={liveTransactions.total}
        gcash={liveTransactions.gcash}
        cash={liveTransactions.cash}
        isOnBreak={isOnBreak}
        shiftTimeIn={shift?.timeIn}
        onPaymentClick={() => {
          if (!isOnBreak) {
            window.dispatchEvent(new CustomEvent("conductor:open-payment"));
          }
        }}
        onHistoryClick={() => setShowHistory(true)}
        canOperate={canOperate}
      />

      <DesktopDashboardBar
        unitNumber={unitNumber}
        route={route}
        conductorName={conductorName}
        conductorPhotoUrl={conductorPhotoUrl}
        status={status}
        setStatus={setStatus}
        total={liveTransactions.total}
        gcash={liveTransactions.gcash}
        cash={liveTransactions.cash}
        isOnBreak={isOnBreak}
        breakBusy={breakBusy}
        shiftTimeIn={shift?.timeIn}
        onHistoryClick={() => setShowHistory(true)}
        onOpenBreakModal={openBreakModal}
        canOperate={canOperate}
      />

      <DashboardMapContainer
        unitNumber={unitNumber}
        hails={hails}
        status={status}
        isOnBreak={isOnBreak}
        canOperate={canOperate}
        hailBusyId={hailBusyId}
        hailActionError={hailActionError}
        onHailAction={updateHail}
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
