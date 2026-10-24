"use client";

import { useState, useEffect } from "react";
import EndOfDayContent from "@/components/conductor/remittance/end-of-day-content";
import { usePopoverModal, useBackdropDismiss } from "@/components/conductor/modals/use-popover-modal";
import { PopoverTail } from "@/components/conductor/modals/popover-tail";
import { useCommuterTheme } from "@/contexts/commuter-theme-context";

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
  const isLight = useCommuterTheme() === "light";

  useEffect(() => {
    const handler = () => setIsOpen(true);
    window.addEventListener("conductor:open-end-of-day", handler);
    return () => window.removeEventListener("conductor:open-end-of-day", handler);
  }, []);

  // ConductorDock dispatches this on every one of its own item clicks so
  // switching to a different tab/popover doesn't require closing this one
  // first — see ConductorDock's closePopovers. Clicking this modal's own
  // End-of-Day button while it's open closes it: the dock checks its active
  // state and only dispatches this, skipping the open event.
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
  const backdropDismiss = useBackdropDismiss(() => setIsOpen(false));

  if (!isRendered) return null;

  const close = () => setIsOpen(false);

  return (
    <div className={`fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4 xl:items-end xl:justify-center xl:bg-transparent xl:backdrop-blur-none xl:bottom-24 ${backdropAnim}`} {...backdropDismiss}>
      <PopoverTail panelColor={isLight ? "#FFFFFF" : "#071A2E"} anchorOffsetPx={anchorOffset} className="light:border-gray-200" />
      <div
        className={`w-full sm:max-w-lg max-h-[85vh] sm:max-h-[80vh] xl:max-h-[70vh] overflow-y-auto bg-[#071A2E] light:bg-white sm:rounded-2xl rounded-t-2xl border border-white/10 light:border-gray-200 shadow-2xl modal-scroll popover-surface popover-surface-light ${panelAnim}`}
        style={panelAnchorStyle}
      >
        {/* Header mirrors the Payment popover's (FareCalcModal "method" step):
            p-5, divider, title + subtitle, bare close icon. Sticky with a
            solid bg because this panel scrolls, unlike Payment's. */}
        <div className="popover-header sticky top-0 z-10 bg-[#071A2E] light:bg-white p-5 border-b border-white/10 light:border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white light:text-gray-900">End of Day Report</h2>
            <button
              onClick={close}
              aria-label="Close"
              className="xl:hidden text-white/40 light:text-gray-500 hover:text-white light:hover:text-gray-900 transition-colors cursor-pointer"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <p className="text-sm text-white/40 light:text-gray-500 mt-1">Review your shift collections and remittance</p>
        </div>

        <EndOfDayContent />
      </div>
    </div>
  );
}
