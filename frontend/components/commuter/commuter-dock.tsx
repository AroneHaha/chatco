"use client";

import Link from "next/link";
import { useEffect, useRef, type ComponentType } from "react";

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
  userInitial: string;
  userName: string;
  userTypeLabel: string;
}

/**
 * xl:+ (1280px) counterpart to the commuter layout's sidebar — the same five
 * destinations, logo, and user identity, reflowed from a full-height rail
 * into a compact floating dock at the bottom of the viewport, mirroring
 * ConductorDock. Below xl: the ordinary sidebar (lg:) and bottom tab bar
 * (below lg:) still render — this is an additive breakpoint, so 1024–1279px
 * is untouched.
 *
 * Layout only: every item routes/opens exactly what the sidebar's does (the
 * layout passes the same badge-augmented list to both), so there is no
 * second source of truth for what the commuter nav contains.
 */
export default function CommuterDock({
  items,
  pathname,
  onFeedbackClick,
  userInitial,
  userName,
  userTypeLabel,
}: CommuterDockProps) {
  // Sliding active-tab highlight — same pattern as ConductorDock: one pill
  // that slides/resizes behind the active item, positioned by mutating its
  // style from a ref (the DOM is the source of truth; routing the measurement
  // through React state would only cost an extra render).
  const pillRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef(new Map<string, HTMLElement>());

  useEffect(() => {
    const applyPillPosition = () => {
      const pill = pillRef.current;
      if (!pill) return;
      const activeEl = itemRefs.current.get(pathname);
      // On a route that isn't one of the five tabs, hide the pill rather
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
  }, [pathname, items]);

  const itemClass = (isActive: boolean) =>
    `relative z-10 flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-colors whitespace-nowrap cursor-pointer ${
      isActive ? "text-white" : "text-white/50 hover:text-white hover:bg-white/5"
    }`;

  return (
    <nav className="hidden xl:flex fixed inset-x-0 bottom-4 z-40 justify-center pointer-events-none">
      <div className="flex items-stretch divide-x divide-white/10 bg-[#071A2E]/95 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl shadow-black/10 overflow-hidden pointer-events-auto">
        {/* Logo */}
        <div className="flex items-center gap-2 px-4">
          <img src="/logo-transparent.png" alt="" className="w-7 h-7 rounded-lg object-contain" />
          <span className="text-white font-extrabold text-sm tracking-tight whitespace-nowrap">CHATCO</span>
        </div>

        {/* Nav */}
        <div className="relative flex items-center gap-1 px-2 py-2">
          <div
            ref={pillRef}
            aria-hidden="true"
            className="absolute inset-y-2 left-0 z-0 w-0 rounded-xl bg-[#1A5FB4] shadow-lg shadow-[#1A5FB4]/30 opacity-0 transition-[transform,width,opacity] duration-300 ease-out"
          />

          {items.map((item) => {
            const isActive = pathname === item.href;
            const ariaLabel = item.badge > 0 ? `${item.label} — ${item.badgeLabel}` : undefined;
            const content = (
              <>
                <div className="relative flex-shrink-0">
                  <item.icon className="w-4 h-4" />
                  {item.badge > 0 && (
                    <span
                      aria-hidden="true"
                      className="absolute -top-2 -right-2 min-w-4 h-4 px-1 bg-[#FF6D3A] rounded-full text-[9px] font-bold text-white flex items-center justify-center ring-2 ring-[#071A2E] tabular-nums"
                    >
                      {item.badge > 99 ? "99+" : item.badge}
                    </span>
                  )}
                </div>
                {item.shortLabel ?? item.label}
              </>
            );

            return item.href === "/feedback" ? (
              <button
                key={item.href}
                ref={(el) => { if (el) itemRefs.current.set(item.href, el); }}
                type="button"
                onClick={onFeedbackClick}
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
          <div className="w-8 h-8 rounded-full bg-[#1A5FB4] flex items-center justify-center text-white text-sm font-bold flex-shrink-0 border-2 border-white/20">
            {userInitial}
          </div>
          <div className="min-w-0 max-w-[130px]">
            <p className="text-white text-xs font-semibold truncate leading-tight">{userName}</p>
            {userTypeLabel && <p className="text-white/40 text-[10px] leading-tight truncate">{userTypeLabel}</p>}
          </div>
        </div>
      </div>
    </nav>
  );
}
