"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import ProfileContent from "@/components/commuter/profile/profile-content";
import { usePopoverModal, useBackdropDismiss } from "@/components/conductor/modals/use-popover-modal";
import { PopoverTail } from "@/components/conductor/modals/popover-tail";

/** Id on CommuterDock's Profile button — the popover and its tail anchor to it. */
export const PROFILE_ANCHOR_ID = "commuter-profile-anchor";

/**
 * xl:+ Profile popover for the commuter layout — the commuter counterpart of
 * ConductorSettingsModal, reusing the same popover lifecycle hook and tail.
 * CommuterDock's Profile button dispatches `commuter:open-profile` instead of
 * navigating, so the commuter stays on whatever tab they were on. The full
 * page (app/(commuter)/profile/page.tsx) still serves below xl:, the lg:
 * sidebar, and direct links; both render ProfileContent.
 *
 * Events (same decoupled pattern as the conductor dock/modals):
 *   - commuter:open-profile      → open
 *   - commuter:close-popovers    → close (the dock fires it on every item click)
 *   - commuter:profile-active-changed { active } → lets the dock highlight
 *     Profile while this is open and revert when it closes.
 */
export default function CommuterProfileModal() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const open = () => setIsOpen(true);
    const close = () => setIsOpen(false);
    window.addEventListener("commuter:open-profile", open);
    window.addEventListener("commuter:close-popovers", close);
    return () => {
      window.removeEventListener("commuter:open-profile", open);
      window.removeEventListener("commuter:close-popovers", close);
    };
  }, []);

  // Anything inside the profile that navigates (e.g. logging out) takes the
  // commuter somewhere else — don't leave the popover open over it. Adjusted
  // during render (React's pattern for resetting state on a prop change)
  // rather than in an effect, to avoid an extra cascading render.
  const [lastPathname, setLastPathname] = useState(pathname);
  if (lastPathname !== pathname) {
    setLastPathname(pathname);
    setIsOpen(false);
  }

  useEffect(() => {
    window.dispatchEvent(new CustomEvent("commuter:profile-active-changed", { detail: { active: isOpen } }));
  }, [isOpen]);

  const { isRendered, backdropAnim, panelAnim, panelAnchorStyle, anchorOffset } = usePopoverModal(isOpen, PROFILE_ANCHOR_ID);
  const backdropDismiss = useBackdropDismiss(() => setIsOpen(false));

  if (!isRendered) return null;

  const close = () => setIsOpen(false);

  return (
    <div className={`fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4 xl:items-end xl:justify-center xl:bg-transparent xl:backdrop-blur-none xl:bottom-24 ${backdropAnim}`} {...backdropDismiss}>
      <PopoverTail panelColor="#071A2E" anchorOffsetPx={anchorOffset} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="commuter-profile-title"
        className={`w-full sm:max-w-lg max-h-[85vh] sm:max-h-[80vh] xl:h-[70vh] overflow-y-auto bg-[#071A2E] sm:rounded-2xl rounded-t-2xl border border-white/10 shadow-2xl modal-scroll ${panelAnim}`}
        style={panelAnchorStyle}
      >
        <div className="sticky top-0 z-10 bg-[#071A2E] p-5 border-b border-white/10">
          <div className="flex items-center justify-between">
            <h2 id="commuter-profile-title" className="text-lg font-bold text-white">Profile</h2>
            <button
              onClick={close}
              aria-label="Close profile"
              className="text-white/40 hover:text-white transition-colors cursor-pointer"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <p className="text-sm text-white/40 mt-1">Your account details and sign-in settings</p>
        </div>

        <ProfileContent variant="modal" />
      </div>
    </div>
  );
}
