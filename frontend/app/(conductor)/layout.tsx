"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import ConductorSidebar from "@/components/conductor/conductor-sidebar";
import ConductorBottomNav from "@/components/conductor/conductor-bottom-nav";

export default function ConductorLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
<div className="fixed inset-0 bg-gray-50 flex flex-col font-sans md:flex-row">
        
      {/* Desktop Sidebar (Hidden on Mobile) */}
      <div className="hidden md:flex md:flex-shrink-0">
        <ConductorSidebar pathname={pathname} />
      </div>


      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto relative pb-20 md:pb-0">
        {children}
      </main>

      {/* Mobile Bottom Navigation (Hidden on Desktop) */}
      <div className="md:hidden">
        <ConductorBottomNav pathname={pathname} />
      </div>
      
    </div>
  );
}



