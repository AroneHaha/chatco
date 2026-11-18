// app/(conductor)/conductor-dashboard/end-of-day/page.tsx
"use client";

import EndOfDayContent from "@/components/conductor/remittance/end-of-day-content";

/**
 * Full-page End-of-Day report — kept for phones/tablets (below xl:) and for
 * anyone linking or refreshing directly into this URL. At xl:+, ConductorDock
 * opens the same report as a popover instead (ConductorEndOfDayModal) so the
 * conductor doesn't navigate away from whatever tab they were on; both
 * shells render the exact same EndOfDayContent, which owns all of the actual
 * report/remit logic. The page chrome lives in EndOfDayContent (fullPage),
 * because settling an earlier day's shift swaps it for the no-nav portal shell.
 */
export default function EndOfDayPage() {
  return <EndOfDayContent fullPage />;
}
