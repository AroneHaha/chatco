"use client";

import type { ReactNode } from "react";
import { RefreshCw, ScanLine, UserX } from "lucide-react";
import { FeedbackModalContent, FeedbackModalFrame } from "./feedback-modal";

export interface NoCrewProps {
  unitNumber: string | null;
  plateNumber: string | null;
  onCheckAgain: () => void;
  onScanAnother: () => void;
  onClose: () => void;
}

/** Modal header copy for the no-crew result, shared by both modal hosts. */
export const NO_CREW_TITLE = "No crew on duty today";
export const NO_CREW_SUBTITLE = "Feedback opens once a shift starts";

/**
 * The no-crew result as the /feedback page renders it (in-page scanner
 * path). Below lg it fills the page like the page's other states; at lg+
 * it opens in the feedback modal shell instead. Scans started from the
 * nav-bar modal never reach this — FeedbackScanModal shows the result in
 * place over whatever page was open.
 */
export function NoCrewOnDuty(props: NoCrewProps) {
  return (
    <>
      {/* --- Below lg: full screen --- */}
      <div className="lg:hidden h-full w-full overflow-y-auto scrollbar-themed bg-[#050F1A] light:bg-[#F8FAFC]">
        {/* pb-28 clears the mobile bottom nav overlay, as on the other states. */}
        <div
          role="status"
          aria-live="polite"
          className="max-w-md mx-auto min-h-full flex flex-col justify-center px-4 pt-8 pb-28 animate-fade-in"
        >
          <NoCrewBody
            {...props}
            heading={
              <h1 className="mt-6 text-xl font-bold text-white leading-snug light:text-gray-900">
                {NO_CREW_TITLE}
              </h1>
            }
          />
        </div>
      </div>

      {/* --- lg+: modal --- */}
      <div className="hidden lg:block">
        <FeedbackModalFrame label={NO_CREW_TITLE}>
          <FeedbackModalContent
            icon={UserX}
            title={NO_CREW_TITLE}
            subtitle={NO_CREW_SUBTITLE}
            onClose={props.onClose}
          >
            <NoCrewBody {...props} />
          </FeedbackModalContent>
        </FeedbackModalFrame>
      </div>
    </>
  );
}

/**
 * Scanned a unit nobody is on shift for today. Neutral rather than the red
 * error treatment: the scan worked, so it leads with the unit it read, then
 * shows the same Driver / Conductor roster the rating form would, left
 * vacant, so the reason is visible at a glance.
 *
 * `heading` sits between the unit plate and the explanation on the
 * full-screen layout; in a modal the title lives in the header instead.
 */
export function NoCrewBody({
  unitNumber,
  plateNumber,
  onCheckAgain,
  onScanAnother,
  heading,
}: Omit<NoCrewProps, "onClose"> & { heading?: ReactNode }) {
  return (
    <>
      {/* Unit plate — confirms the QR was read and which jeepney it was. */}
      <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-white/40 light:text-gray-500">
        Scanned unit
      </p>
      <div className="mt-2 flex items-baseline justify-between gap-4 pb-4 border-b border-white/10 light:border-gray-200">
        <span className="text-3xl font-bold tracking-tight text-white light:text-gray-900 truncate">
          {unitNumber ? `Unit ${unitNumber}` : "This unit"}
        </span>
        {plateNumber && (
          <span className="font-mono text-sm text-white/60 light:text-gray-600 flex-shrink-0">
            {plateNumber}
          </span>
        )}
      </div>

      {heading}
      <p className={`${heading ? "mt-2" : "mt-5"} text-sm text-white/50 leading-relaxed light:text-gray-500`}>
        Ratings go to the driver and conductor on today&apos;s shift. No one has
        started a shift on this unit yet, so there&apos;s no one to rate.
      </p>

      <div className="mt-6 rounded-xl border border-white/10 bg-[#071A2E] divide-y divide-white/5 light:bg-white light:border-gray-200 light:divide-gray-100">
        <VacantCrewRow role="Driver" />
        <VacantCrewRow role="Conductor" />
      </div>

      <p className="mt-4 text-xs text-white/40 leading-relaxed light:text-gray-500">
        On board right now? The conductor may not have started the shift yet.
        Check again in a few minutes.
      </p>

      <div className={`${heading ? "mt-8" : "mt-6"} grid gap-2.5`}>
        <button
          type="button"
          onClick={onCheckAgain}
          className="flex items-center justify-center gap-2 py-3.5 rounded-xl bg-[#1A5FB4] hover:bg-[#164A8F] text-white text-sm font-semibold transition-[background-color,transform] active:scale-[0.98] shadow-lg shadow-[#1A5FB4]/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#62A0EA] focus-visible:ring-offset-2 focus-visible:ring-offset-[#050F1A] light:focus-visible:ring-offset-white"
        >
          <RefreshCw size={15} />
          Check again
        </button>
        <button
          type="button"
          onClick={onScanAnother}
          className="flex items-center justify-center gap-2 py-3.5 rounded-xl bg-[#0B1E33] hover:bg-[#10263F] border border-white/10 text-white text-sm font-semibold transition-[background-color,transform] active:scale-[0.98] light:bg-white light:hover:bg-gray-100 light:border-gray-200 light:text-gray-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#62A0EA]"
        >
          <ScanLine size={15} />
          Scan another unit
        </button>
      </div>
    </>
  );
}

/** An empty roster slot — the vacant counterpart of the page's CrewMemberRow. */
function VacantCrewRow({ role }: { role: string }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <div
        aria-hidden="true"
        className="w-9 h-9 rounded-full border border-dashed border-white/20 flex-shrink-0 light:border-gray-300"
      />
      <div className="min-w-0 flex-1">
        <p className="text-white/70 text-sm font-semibold light:text-gray-700">{role}</p>
        <p className="text-white/30 text-[11px] light:text-gray-500">Not on shift today</p>
      </div>
    </div>
  );
}
