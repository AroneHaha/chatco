"use client";

import { usePathname } from "next/navigation";
import ConductorSidebar from "@/components/conductor/conductor-sidebar";
import ConductorDock from "@/components/conductor/conductor-dock";
import ConductorBottomNav from "@/components/conductor/conductor-bottom-nav";
import ConductorPaymentModal from "@/components/conductor/conductor-payment-modal";
import ConductorEndOfDayModal from "@/components/conductor/conductor-end-of-day-modal";
import ConductorMetricsModal from "@/components/conductor/conductor-metrics-modal";
import ConductorSettingsModal from "@/components/conductor/conductor-settings-modal";
import ConductorLocationBroadcaster from "@/components/conductor/conductor-location-broadcaster";
import MaintenanceGate from "@/components/shared/maintenance-gate";
import ConductorConnectivityBanner from "@/components/conductor/conductor-connectivity-banner";
import ConductorDeviceGuard from "@/components/conductor/conductor-device-guard";
import { ConductorShiftProvider } from "@/app/(conductor)/hooks/use-conductor-shift";

export default function ConductorLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Hide navigation on unit-verification page (pre-shift unit selection)
  const isUnitVerification = pathname === "/unit-verification";

  // The dashboard home is a full-bleed fixed map with a floating card on top
  // (like the commuter home screen), not a scrolling document. Letting <main>
  // scroll here desyncs the card (in-flow) from the map (position: fixed,
  // which ignores an ancestor's scroll entirely) — the card visibly drifts
  // away from the top until a scroll gesture resets <main> back to 0. Other
  // conductor routes (metrics, settings, end-of-day) are normal scrolling
  // pages and keep the default overflow.
  const isDashboardHome = pathname === "/conductor-dashboard";

  return (
    <MaintenanceGate>
      <ConductorShiftProvider>
<div className={`fixed inset-0 flex flex-col font-sans md:flex-row ${isUnitVerification ? "bg-[#050F1A]" : "bg-gray-50"}`}>

      {/* Desktop Sidebar — the 768–1279px range only. At xl:+ (1280px),
          ConductorDock takes over as a floating bottom dock instead of a
          space-reserving rail (hidden entirely there, not just visually). */}
      {!isUnitVerification && (
        <div className="hidden md:flex xl:hidden md:flex-shrink-0">
          <ConductorSidebar pathname={pathname} />
        </div>
      )}

      {/* Main Content Area. xl:pb-28 clears the floating ConductorDock on
          scrolling pages (metrics/settings/end-of-day) so its last content
          isn't hidden behind the dock; the dashboard home doesn't scroll
          here (see isDashboardHome above) so the padding is inert there. */}
      <main className={`flex-1 relative xl:pb-28 ${isDashboardHome ? "overflow-hidden" : "overflow-y-auto"}`}>
          {/* The dashboard home renders these itself, floated above its fixed
              full-bleed map — as normal flow content here they'd push its
              h-full box taller than main and get clipped by overflow-hidden. */}
          {!isUnitVerification && !isDashboardHome && <ConductorConnectivityBanner />}
          {!isUnitVerification && !isDashboardHome && <ConductorDeviceGuard />}
          {children}
      </main>

      {/* Mobile Bottom Navigation (Hidden on Desktop & Unit Verification) */}
      {!isUnitVerification && (
        <div className="md:hidden">
          <ConductorBottomNav pathname={pathname} />
        </div>
      )}

      {/* Large-screen floating dock (xl:+ only — see ConductorDock) */}
      {!isUnitVerification && <ConductorDock pathname={pathname} />}

      {/* Global Payment Modal — accessible from ALL tabs */}
      {!isUnitVerification && <ConductorPaymentModal />}

      {/* Global End-of-Day Modal (xl:+ trigger; see ConductorDock) — full page still exists for smaller screens */}
      {!isUnitVerification && <ConductorEndOfDayModal />}

      {/* Global Metrics Modal (xl:+ trigger; see ConductorDock) — full page still exists for smaller screens */}
      {!isUnitVerification && <ConductorMetricsModal />}

      {/* Global Settings Modal (xl:+ trigger; see ConductorDock) — full page still exists for smaller screens */}
      {!isUnitVerification && <ConductorSettingsModal />}

      {/* Broadcast conductor GPS while on shift (so commuters see the vehicle) */}
      {!isUnitVerification && <ConductorLocationBroadcaster />}

    </div>
      </ConductorShiftProvider>
    </MaintenanceGate>
  );
}
