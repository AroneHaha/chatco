"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import ConductorSidebar from "@/components/conductor/conductor-sidebar";
import ConductorBottomNav from "@/components/conductor/conductor-bottom-nav";
import ConductorPaymentModal from "@/components/conductor/conductor-payment-modal";
import ConductorLocationBroadcaster from "@/components/conductor/conductor-location-broadcaster";

export default function ConductorLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Hide navigation on unit-verification page (pre-shift unit selection)
  const isUnitVerification = pathname === "/unit-verification";

  return (
<div className={`fixed inset-0 flex flex-col font-sans md:flex-row ${isUnitVerification ? "bg-[#050F1A]" : "bg-gray-50"}`}>

      {/* Desktop Sidebar (Hidden on Mobile & Unit Verification) */}
      {!isUnitVerification && (
        <div className="hidden md:flex md:flex-shrink-0">
          <ConductorSidebar pathname={pathname} />
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto relative">
          {children}
      </main>

      {/* Mobile Bottom Navigation (Hidden on Desktop & Unit Verification) */}
      {!isUnitVerification && (
        <div className="md:hidden">
          <ConductorBottomNav pathname={pathname} />
        </div>
      )}

      {/* Global Payment Modal — accessible from ALL tabs */}
      {!isUnitVerification && <ConductorPaymentModal />}

      {/* Broadcast conductor GPS while on shift (so commuters see the vehicle) */}
      {!isUnitVerification && <ConductorLocationBroadcaster />}
      
    </div>
  );
}