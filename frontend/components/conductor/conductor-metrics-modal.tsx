"use client";

import { useState, useEffect } from "react";
import MetricsContent from "@/components/conductor/metrics/metrics-content";
import { usePopoverModal } from "@/components/conductor/modals/use-popover-modal";
import { PopoverTail } from "@/components/conductor/modals/popover-tail";

/**
 * Global Metrics modal listener for the Conductor layout — same pattern as
 * ConductorPaymentModal/ConductorEndOfDayModal. ConductorDock's Metrics
 * button (xl:+ only; see conductor-dock.tsx) dispatches
 * `conductor:open-metrics` instead of navigating, so opening it doesn't
 * take the conductor away from whatever tab they were on. The full page at
 * app/(conductor)/conductor-dashboard/metrics/page.tsx is untouched and
 * still serves phones/tablets (below xl:) and direct links/refreshes —
 * both it and this modal render the same MetricsContent, which owns the
 * actual metrics logic, so there is exactly one implementation of it.
 *
 * The header carries its own "Performance Metrics" title (matching
 * ConductorEndOfDayModal's shell) — MetricsContent is told
 * `showHeader={false}` so its own inline PageHeader doesn't render a
 * second copy of the same title underneath.
 */
export default function ConductorMetricsModal() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handler = () => setIsOpen(true);
    window.addEventListener("conductor:open-metrics", handler);
    return () => window.removeEventListener("conductor:open-metrics", handler);
  }, []);

  // ConductorDock dispatches this on every one of its own item clicks
  // (including this modal's own Metrics button) so switching to a
  // different tab/popover doesn't require closing this one first — see
  // ConductorDock's closePopovers. A same-click reopen (Metrics clicked
  // while already open) still nets out to open: React batches this
  // synchronous close with the conductor:open-metrics handler above that
  // fires right after it in the same click.
  useEffect(() => {
    const handler = () => setIsOpen(false);
    window.addEventListener("conductor:close-popovers", handler);
    return () => window.removeEventListener("conductor:close-popovers", handler);
  }, []);

  // Lets ConductorDock show "Metrics" as the active tab while this modal is
  // open (and revert once it closes) — same decoupled event pattern
  // ConductorPaymentModal/ConductorEndOfDayModal use.
  useEffect(() => {
    window.dispatchEvent(new CustomEvent("conductor:metrics-active-changed", { detail: { active: isOpen } }));
  }, [isOpen]);

  const { isRendered, backdropAnim, panelAnim, panelAnchorStyle, anchorOffset } = usePopoverModal(isOpen, "conductor-metrics-anchor");

  if (!isRendered) return null;

  const close = () => setIsOpen(false);

  return (
    <div className={`fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4 xl:items-end xl:justify-center xl:bg-transparent xl:backdrop-blur-none xl:bottom-24 ${backdropAnim}`}>
      <PopoverTail panelColor="#050F1A" anchorOffsetPx={anchorOffset} />
      {/* xl:h (fixed, not max-h): only at xl:+ does the popover hold one
          constant height across every content state (loading skeleton,
          "no ratings"/"no shift" empty states, full gauge+cards) instead
          of visibly shrinking once data replaces the skeleton — the
          skeleton is sized to resemble the full/normal state, so a short
          empty state would otherwise collapse the whole popover right
          after it opens. Below xl:, the mobile/tablet sheet keeps its
          original content-driven height (max-h only) — a short empty
          state there just makes a short sheet, which reads fine full-width
          and isn't what was reported. */}
      <div
        className={`w-full sm:max-w-lg max-h-[85vh] sm:max-h-[80vh] xl:h-[70vh] overflow-y-auto bg-[#050F1A] sm:rounded-2xl rounded-t-2xl border border-white/10 shadow-2xl modal-scroll ${panelAnim}`}
        style={panelAnchorStyle}
      >
        <div className="sticky top-0 z-10 flex items-center gap-3 px-4 py-3.5 bg-[#050F1A]/95 backdrop-blur-xl border-b border-white/5">
          <div className="flex-1">
            <h1 className="text-white font-bold text-lg leading-tight">Performance Metrics</h1>
            <p className="text-white/40 text-xs mt-0.5">Shift ratings overview</p>
          </div>
          <button
            onClick={close}
            aria-label="Close"
            className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/60 hover:bg-white/10 hover:text-white transition-all active:scale-95"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <MetricsContent showHeader={false} />
      </div>
    </div>
  );
}
