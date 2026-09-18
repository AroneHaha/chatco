"use client";

import { useState, useEffect } from "react";
import SettingsContent from "@/components/conductor/settings/settings-content";
import { usePopoverModal, useBackdropDismiss } from "@/components/conductor/modals/use-popover-modal";
import { PopoverTail } from "@/components/conductor/modals/popover-tail";

/**
 * Global Settings modal listener for the Conductor layout — same pattern as
 * ConductorPaymentModal/ConductorEndOfDayModal/ConductorMetricsModal.
 * ConductorDock's Settings button (xl:+ only; see conductor-dock.tsx)
 * dispatches `conductor:open-settings` instead of navigating, so opening it
 * doesn't take the conductor away from whatever tab they were on. The full
 * page at app/(conductor)/conductor-dashboard/conductor-settings/page.tsx
 * is untouched and still serves phones/tablets (below xl:) and direct
 * links/refreshes — both it and this modal render the same
 * SettingsContent, which owns the actual settings/logout logic, so there
 * is exactly one implementation of it.
 *
 * The header carries its own "Settings" title (matching
 * ConductorEndOfDayModal/ConductorMetricsModal's shells) — SettingsContent
 * is told `showHeader={false}` so its own inline header doesn't render a
 * second copy of the same title underneath.
 *
 * xl:h (fixed, not max-h) on the panel: same fix as ConductorMetricsModal —
 * without it, the loading skeleton (tall) and the loaded content (varies —
 * shorter with no active shift, taller with one) would visibly resize the
 * popover the instant data replaces the skeleton.
 */
export default function ConductorSettingsModal() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handler = () => setIsOpen(true);
    window.addEventListener("conductor:open-settings", handler);
    return () => window.removeEventListener("conductor:open-settings", handler);
  }, []);

  // ConductorDock dispatches this on every one of its own item clicks so
  // switching to a different tab/popover doesn't require closing this one
  // first — see ConductorDock's closePopovers. Clicking this modal's own
  // Settings button while it's open closes it: the dock checks its active
  // state and only dispatches this, skipping the open event.
  useEffect(() => {
    const handler = () => setIsOpen(false);
    window.addEventListener("conductor:close-popovers", handler);
    return () => window.removeEventListener("conductor:close-popovers", handler);
  }, []);

  // Lets ConductorDock show "Settings" as the active tab while this modal
  // is open (and revert once it closes) — same decoupled event pattern
  // ConductorPaymentModal/ConductorEndOfDayModal/ConductorMetricsModal use.
  useEffect(() => {
    window.dispatchEvent(new CustomEvent("conductor:settings-active-changed", { detail: { active: isOpen } }));
  }, [isOpen]);

  const { isRendered, backdropAnim, panelAnim, panelAnchorStyle, anchorOffset } = usePopoverModal(isOpen, "conductor-settings-anchor");
  const backdropDismiss = useBackdropDismiss(() => setIsOpen(false));

  if (!isRendered) return null;

  const close = () => setIsOpen(false);

  return (
    <div className={`fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4 xl:items-end xl:justify-center xl:bg-transparent xl:backdrop-blur-none xl:bottom-24 ${backdropAnim}`} {...backdropDismiss}>
      <PopoverTail panelColor="#071A2E" anchorOffsetPx={anchorOffset} />
      <div
        className={`w-full sm:max-w-lg max-h-[85vh] sm:max-h-[80vh] xl:h-[70vh] overflow-y-auto bg-[#071A2E] sm:rounded-2xl rounded-t-2xl border border-white/10 shadow-2xl modal-scroll popover-surface ${panelAnim}`}
        style={panelAnchorStyle}
      >
        {/* Header mirrors the Payment popover's — see ConductorEndOfDayModal. */}
        <div className="popover-header sticky top-0 z-10 bg-[#071A2E] p-5 border-b border-white/10">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white">Settings</h2>
            <button
              onClick={close}
              aria-label="Close"
              className="text-white/40 hover:text-white transition-colors cursor-pointer"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <p className="text-sm text-white/40 mt-1">Manage your app preferences and account</p>
        </div>

        <SettingsContent showHeader={false} />
      </div>
    </div>
  );
}
