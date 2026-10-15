"use client";

import { useEffect, useRef, useState } from "react";
import { UserRound } from "lucide-react";
import { usePathname } from "next/navigation";
import ProfileContent from "@/components/commuter/profile/profile-content";
import AccountMenu, { type SignOutControl } from "@/components/commuter/profile/account-menu";
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
  const [signOutControl, setSignOutControl] = useState<SignOutControl | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
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

  useEffect(() => {
    if (!isOpen || !isRendered) return;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const panel = panelRef.current;
    const controls = () => Array.from(panel?.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), a[href], [tabindex="0"]') ?? []);
    controls()[0]?.focus();
    const handleKey = (event: KeyboardEvent) => {
      if (document.querySelector("[data-profile-subdialog]")) return;
      if (event.key === "Escape") setIsOpen(false);
      if (event.key !== "Tab") return;
      const items = controls();
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault(); last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault(); first?.focus();
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("keydown", handleKey);
      previous?.focus();
    };
  }, [isOpen, isRendered]);

  if (!isRendered) return null;

  return (
    <div className={`fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4 xl:items-end xl:justify-center xl:bg-transparent xl:backdrop-blur-none xl:bottom-24 ${backdropAnim}`} {...backdropDismiss}>
      <PopoverTail panelColor="#071A2E" anchorOffsetPx={anchorOffset} />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="commuter-profile-title"
        className={`flex w-full flex-col sm:max-w-xl xl:max-w-2xl max-h-[85dvh] sm:max-h-[80dvh] xl:h-[min(720px,calc(100dvh-8rem))] xl:max-h-none overflow-hidden bg-[#071A2E] sm:rounded-2xl rounded-t-2xl border border-[#62A0EA]/20 shadow-2xl shadow-black/40 ${panelAnim}`}
        style={panelAnchorStyle}
      >
        <div className="shrink-0 border-b border-white/10 bg-gradient-to-r from-[#102844] to-[#071A2E] px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#62A0EA]/20 bg-[#62A0EA]/10 text-[#99C1F1]"><UserRound size={20} aria-hidden="true" /></span>
              <div className="min-w-0">
                <h2 id="commuter-profile-title" className="text-lg font-bold tracking-tight text-white">Profile</h2>
                <p className="mt-0.5 text-xs text-white/50">Your details and account settings</p>
              </div>
            </div>
            <AccountMenu signOut={signOutControl} />
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto modal-scroll">
          <ProfileContent variant="modal" onSignOutControl={setSignOutControl} />
        </div>
      </div>
    </div>
  );
}
