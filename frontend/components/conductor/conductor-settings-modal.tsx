"use client";

import { useState, useEffect } from "react";
import SettingsContent from "@/components/conductor/settings/settings-content";
import { usePopoverModal } from "@/components/conductor/modals/use-popover-modal";
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

  // ConductorDock dispatches this on every one of its own item clicks
  // (including this modal's own Settings button) so switching to a
  // different tab/popover doesn't require closing this one first — see
  // ConductorDock's closePopovers. A same-click reopen (Settings clicked
  // while already open) still nets out to open: React batches this
  // synchronous close with the conductor:open-settings handler above that
  // fires right after it in the same click.
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

  if (!isRendered) return null;

  const close = () => setIsOpen(false);

  return (
    <div className={`fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4 xl:items-end xl:justify-center xl:bg-transparent xl:backdrop-blur-none xl:bottom-24 ${backdropAnim}`}>
      <PopoverTail panelColor="#050F1A" anchorOffsetPx={anchorOffset} />
      <div
        className={`w-full sm:max-w-lg max-h-[85vh] sm:max-h-[80vh] xl:h-[70vh] overflow-y-auto bg-[#050F1A] sm:rounded-2xl rounded-t-2xl border border-white/10 shadow-2xl modal-scroll ${panelAnim}`}
        style={panelAnchorStyle}
      >
        <div className="sticky top-0 z-10 flex items-center gap-3 px-4 py-3.5 bg-[#050F1A]/95 backdrop-blur-xl border-b border-white/5">
          <div className="flex-1">
            <h1 className="text-white font-bold text-lg leading-tight">Settings</h1>
            <p className="text-white/40 text-xs mt-0.5">Manage your app preferences and account</p>
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

        <SettingsContent showHeader={false} />
      </div>
    </div>
  );
}
