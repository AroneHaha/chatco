"use client";

import { useState, useEffect } from "react";
import EndOfDayContent from "@/components/conductor/remittance/end-of-day-content";
import { usePopoverModal } from "@/components/conductor/modals/use-popover-modal";
import { PopoverTail } from "@/components/conductor/modals/popover-tail";

/**
 * Global End-of-Day modal listener for the Conductor layout — same pattern
 * as ConductorPaymentModal. ConductorDock's End-of-Day button (xl:+ only;
 * see conductor-dock.tsx) dispatches `conductor:open-end-of-day` instead of
 * navigating, so opening the report doesn't take the conductor away from
 * whatever tab they were on. The full page at
 * app/(conductor)/conductor-dashboard/end-of-day/page.tsx is untouched and
 * still serves phones/tablets (below xl:) and direct links/refreshes — both
 * it and this modal render the same EndOfDayContent, which owns the actual
 * report/remit logic, so there is exactly one implementation of it.
 *
 * Lives in the conductor layout (next to ConductorPaymentModal) so it's
 * reachable from every tab, not just the dashboard.
 */
export default function ConductorEndOfDayModal() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handler = () => setIsOpen(true);
    window.addEventListener("conductor:open-end-of-day", handler);
    return () => window.removeEventListener("conductor:open-end-of-day", handler);
  }, []);

  // ConductorDock dispatches this on every one of its own item clicks
  // (including this modal's own End-of-Day button) so switching to a
  // different tab/popover doesn't require closing this one first — see
  // ConductorDock's closePopovers. A same-click reopen (End-of-Day clicked
  // while already open) still nets out to open: React batches this
  // synchronous close with the conductor:open-end-of-day handler above
  // that fires right after it in the same click.
  useEffect(() => {
    const handler = () => setIsOpen(false);
    window.addEventListener("conductor:close-popovers", handler);
    return () => window.removeEventListener("conductor:close-popovers", handler);
  }, []);

  // Lets ConductorDock show "End-of-Day" as the active tab while this modal
  // is open (and revert once it closes) — same decoupled event pattern
  // ConductorPaymentModal uses for conductor:payment-active-changed.
  useEffect(() => {
    window.dispatchEvent(new CustomEvent("conductor:end-of-day-active-changed", { detail: { active: isOpen } }));
  }, [isOpen]);

  const { isRendered, backdropAnim, panelAnim, panelAnchorStyle, anchorOffset } = usePopoverModal(isOpen, "conductor-end-of-day-anchor");

  if (!isRendered) return null;

  const close = () => setIsOpen(false);

  return (
    <div className={`fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4 xl:items-end xl:justify-center xl:bg-transparent xl:backdrop-blur-none xl:bottom-24 ${backdropAnim}`}>
      <PopoverTail panelColor="#050F1A" anchorOffsetPx={anchorOffset} />
      <div
        className={`w-full sm:max-w-lg max-h-[85vh] sm:max-h-[80vh] xl:max-h-[70vh] overflow-y-auto bg-[#050F1A] sm:rounded-2xl rounded-t-2xl border border-white/10 shadow-2xl modal-scroll ${panelAnim}`}
        style={panelAnchorStyle}
      >
        <div className="sticky top-0 z-10 bg-[#050F1A]/95 backdrop-blur-xl border-b border-white/5 flex items-center gap-3 px-4 py-3.5">
          <h1 className="text-white font-bold text-lg flex-1">End of Day Report</h1>
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

        <EndOfDayContent />
      </div>
    </div>
  );
}
