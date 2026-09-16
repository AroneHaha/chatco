// app/(conductor)/conductor-dashboard/end-of-day/page.tsx
"use client";

import { useRouter } from "next/navigation";
import EndOfDayContent from "@/components/conductor/remittance/end-of-day-content";

/**
 * Full-page End-of-Day report — kept for phones/tablets (below xl:) and for
 * anyone linking or refreshing directly into this URL. At xl:+, ConductorDock
 * opens the same report as a popover instead (ConductorEndOfDayModal) so the
 * conductor doesn't navigate away from whatever tab they were on; both
 * shells render the exact same EndOfDayContent, which owns all of the actual
 * report/remit logic.
 */
export default function EndOfDayPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-[#050F1A] pb-28">
      <div className="sticky top-0 z-20 bg-[#050F1A]/90 backdrop-blur-xl border-b border-white/5">
        <div className="flex items-center gap-3 px-4 py-3.5">
          <button onClick={() => router.back()} className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/60 hover:bg-white/10 hover:text-white transition-all active:scale-95">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" /></svg>
          </button>
          <h1 className="text-white font-bold text-lg">End of Day Report</h1>
        </div>
      </div>

      <EndOfDayContent />
    </div>
  );
}
