"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ComponentType } from "react";
import { PROFILE_ANCHOR_ID } from "@/components/commuter/commuter-profile-modal";
import { FARE_ANCHOR_ID } from "@/components/commuter/commuter-fare-modal";
import { CommuterAvatar } from "@/components/commuter/commuter-avatar";

export interface CommuterDockItem {
  href: string;
  /** Full name — the dock's accessible name / tooltip. */
  label: string;
  /** Compact on-screen label (matches what the mobile tab bar already shows). */
  shortLabel?: string;
  icon: ComponentType<{ className?: string }>;
  badge: number;
  badgeLabel: string;
}

interface CommuterDockProps {
  items: CommuterDockItem[];
  pathname: string;
  /** Feedback opens the QR scanner overlay instead of routing — same as the sidebar/tab bar. */
  onFeedbackClick: () => void;
  /** Public R2 URL of the commuter's photo; null shows the default image. */
  userPhotoUrl: string | null;
  userName: string;
  userTypeLabel: string;
}

/**
 * xl:+ (1280px) counterpart to the commuter layout's sidebar — the same six
 * destinations, logo, and user identity, reflowed from a full-height rail
 * into a compact floating dock at the bottom of the viewport, mirroring
 * ConductorDock. Below xl: the ordinary sidebar (lg:) and bottom tab bar
 * (below lg:) still render — this is an additive breakpoint, so 1024–1279px
 * is untouched.
 *
 * Layout only: every item routes/opens exactly what the sidebar's does (the
 * layout passes the same badge-augmented list to both), so there is no
 * second source of truth for what the commuter nav contains. The
 * exceptions are Profile and Fare, which open their respective popovers here
 * instead of navigating, the same way ConductorDock opens Settings.
 */
export default function CommuterDock({
  items,
  pathname,
  onFeedbackClick,
  userPhotoUrl,
  userName,
  userTypeLabel,
}: CommuterDockProps) {
  // Sliding active-tab highlight — same pattern as ConductorDock: one pill
  // that slides/resizes behind the active item, positioned by mutating its
  // style from a ref (the DOM is the source of truth; routing the measurement
  // through React state would only cost an extra render).
  const pillRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef(new Map<string, HTMLElement>());

  // The popovers report their open state so the dock highlights their tab
  // while open and returns to the underlying route when they close.
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isFareOpen, setIsFareOpen] = useState(false);
  useEffect(() => {
    const handler = (e: Event) => setIsProfileOpen((e as CustomEvent<{ active: boolean }>).detail.active);
    const fareHandler = (e: Event) => setIsFareOpen((e as CustomEvent<{ active: boolean }>).detail.active);
    window.addEventListener("commuter:profile-active-changed", handler);
    window.addEventListener("commuter:fare-active-changed", fareHandler);
    return () => {
      window.removeEventListener("commuter:profile-active-changed", handler);
      window.removeEventListener("commuter:fare-active-changed", fareHandler);
    };
  }, []);
  const activeKey = isFareOpen ? "/fare" : isProfileOpen ? "/profile" : pathname;

  // Every dock click closes an open popover first, so moving to another tab
  // never leaves the profile floating over it.
  const closePopovers = () => window.dispatchEvent(new CustomEvent("commuter:close-popovers"));

  useEffect(() => {
    const applyPillPosition = () => {
      const pill = pillRef.current;
      if (!pill) return;
      const activeEl = itemRefs.current.get(activeKey);
      // On a route that isn't one of the six tabs, hide the pill rather
      // than leaving it parked on whichever tab was active last.
      if (!activeEl) {
        pill.style.opacity = "0";
        return;
      }
      pill.style.width = `${activeEl.offsetWidth}px`;
      pill.style.transform = `translateX(${activeEl.offsetLeft}px)`;
      pill.style.opacity = "1";
    };

    applyPillPosition();
    // Item widths are content-driven (labels, badges), so the active item's
    // position can shift without the route changing.
    window.addEventListener("resize", applyPillPosition);
    return () => window.removeEventListener("resize", applyPillPosition);
  }, [activeKey, items]);

  const itemClass = (isActive: boolean) =>
    `relative z-10 flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-colors whitespace-nowrap cursor-pointer ${
      isActive ? "text-white" : "text-white/50 hover:text-white hover:bg-white/5 light:text-gray-500 light:hover:text-gray-900 light:hover:bg-gray-100"
    }`;

  return (
    <nav className="hidden xl:flex fixed inset-x-0 bottom-4 z-40 justify-center pointer-events-none">
      <div className="flex items-stretch divide-x divide-white/10 bg-[#071A2E]/95 backdrop-blur-xl rounded-2xl border border-white/10 light:divide-gray-200 light:bg-white/95 light:border-gray-200 shadow-2xl shadow-black/10 overflow-hidden pointer-events-auto">
        {/* Logo */}
        <div className="flex items-center gap-2 px-4">
          <img src="/logo-transparent.png" alt="" className="w-7 h-7 rounded-lg object-contain" />
          <span className="text-white light:text-gray-900 font-extrabold text-sm tracking-tight whitespace-nowrap">CHATCO</span>
        </div>

        {/* Nav */}
        <div className="relative flex items-center gap-1 px-2 py-2">
          <div
            ref={pillRef}
            aria-hidden="true"
            className="absolute inset-y-2 left-0 z-0 w-0 rounded-xl bg-[#1A5FB4] shadow-lg shadow-[#1A5FB4]/30 opacity-0 transition-[transform,width,opacity] duration-300 ease-out"
          />

          {items.map((item) => {
            const isActive = activeKey === item.href;
            const ariaLabel = item.badge > 0 ? `${item.label} — ${item.badgeLabel}` : undefined;
            const content = (
              <>
                <div className="relative flex-shrink-0">
                  <item.icon className="w-4 h-4" />
                  {item.badge > 0 && (
                    <span
                      aria-hidden="true"
                      className="absolute -top-2 -right-2 min-w-4 h-4 px-1 bg-[#FF6D3A] rounded-full text-[9px] font-bold text-white flex items-center justify-center ring-2 ring-[#071A2E] light:ring-white tabular-nums"
                    >
                      {item.badge > 99 ? "99+" : item.badge}
                    </span>
                  )}
                </div>
                {item.shortLabel ?? item.label}
              </>
            );

            if (item.href === "/profile" || item.href === "/fare") {
              const isProfile = item.href === "/profile";
              const isOpen = isProfile ? isProfileOpen : isFareOpen;
              return (
                <button
                  key={item.href}
                  ref={(el) => { if (el) itemRefs.current.set(item.href, el); }}
                  id={isProfile ? PROFILE_ANCHOR_ID : FARE_ANCHOR_ID}
                  type="button"
                  onClick={() => {
                    closePopovers();
                    // Clicking the active popover's tab closes it.
                    if (isOpen) return;
                    window.dispatchEvent(new CustomEvent(isProfile ? "commuter:open-profile" : "commuter:open-fare"));
                  }}
                  aria-label={ariaLabel}
                  aria-haspopup="dialog"
                  aria-expanded={isOpen}
                  title={item.label}
                  className={itemClass(isActive)}
                >
                  {content}
                </button>
              );
            }

            return item.href === "/feedback" ? (
              <button
                key={item.href}
                ref={(el) => { if (el) itemRefs.current.set(item.href, el); }}
                type="button"
                onClick={() => {
                  closePopovers();
                  onFeedbackClick();
                }}
                aria-label={ariaLabel}
                title={item.label}
                className={itemClass(isActive)}
              >
                {content}
              </button>
            ) : (
              <Link
                key={item.href}
                ref={(el) => { if (el) itemRefs.current.set(item.href, el); }}
                href={item.href}
                onClick={closePopovers}
                aria-label={ariaLabel}
                title={item.label}
                className={itemClass(isActive)}
              >
                {content}
              </Link>
            );
          })}
        </div>

        {/* User identity */}
        <div className="flex items-center gap-2.5 px-4">
          <CommuterAvatar src={userPhotoUrl} className="w-8 h-8" iconClassName="w-4 h-4" sizes="32px" />
          <div className="min-w-0 max-w-[130px]">
            <p className="text-white light:text-gray-900 text-xs font-semibold truncate leading-tight">{userName}</p>
            {userTypeLabel && <p className="text-white/40 light:text-gray-500 text-[10px] leading-tight truncate">{userTypeLabel}</p>}
          </div>
        </div>
      </div>
    </nav>
  );
}
