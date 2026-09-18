"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useConductorShift } from "@/app/(conductor)/hooks/use-conductor-shift";

// Full sidebar labels for the dock's own accessible names / tooltips; the
// dock shows a shorter on-screen label for the two long ones (matching the
// abbreviation ConductorBottomNav already uses on mobile — "Report" for
// End-of-Day, "Metrics" for Driver Performance) so the bar stays compact
// without dropping any destination or icon.
const navItems = [
  {
    href: "/conductor-dashboard",
    label: "Dashboard",
    fullLabel: "Dashboard",
    icon: "M2.25 12l8.954-8.955a1.126 1.126 0 0 1 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25",
  },
  {
    href: "/conductor-dashboard/end-of-day",
    label: "End-of-Day",
    fullLabel: "End-of-Day Tally & Report",
    icon: "M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z",
  },
  {
    href: "/conductor-dashboard/metrics",
    label: "Metrics",
    fullLabel: "Driver Performance Metrics",
    icon: "M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z",
  },
  {
    href: "/conductor-dashboard/conductor-settings",
    label: "Settings",
    fullLabel: "Settings",
    icon: "M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28ZM15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z",
  },
];

const paymentIconPath =
  "M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z";

/**
 * xl:+ (1280px) counterpart to ConductorSidebar — the same nav destinations,
 * logo, and user identity, reflowed from a full-height 256px rail into a
 * compact floating dock docked to the bottom of the viewport. Below xl:,
 * ConductorSidebar still renders as the ordinary vertical rail (see
 * (conductor)/layout.tsx) — this is an additive breakpoint, not a
 * replacement, so 768–1279px is untouched.
 *
 * Deliberately not a scaled-down copy of ConductorBottomNav's mobile pattern
 * (icon stacked over a tiny label, edge-to-edge, raised center FAB): a
 * pointer-driven large screen doesn't need thumb-sized targets or a raised
 * FAB, so this reads as one continuous instrument strip — icon beside label,
 * inline, margined off the viewport edge — with the logo and the conductor's
 * own identity folded into the same bar instead of living only in the rail.
 */
export default function ConductorDock({ pathname }: { pathname: string }) {
  const { shift } = useConductorShift();
  const conductorName = shift?.conductorName ?? "Conductor";
  const conductorInitial = conductorName.charAt(0).toUpperCase();
  const statusLabel = shift?.isActive ? "Shift Active" : "No Active Shift";

  // Payment, End-of-Day, Metrics, and Settings are all buttons, not
  // routes — opening any of them doesn't change `pathname`, so without
  // this none could ever show as the active tab, and closing them
  // couldn't restore whichever tab the route actually points at. Set by
  // ConductorPaymentModal's conductor:payment-active-changed /
  // ConductorEndOfDayModal's conductor:end-of-day-active-changed /
  // ConductorMetricsModal's conductor:metrics-active-changed /
  // ConductorSettingsModal's conductor:settings-active-changed events
  // (fired for every tab, not just this dock) whenever any of those
  // modals' own isOpen flips.
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  useEffect(() => {
    const handler = (e: Event) => setIsPaymentOpen((e as CustomEvent<{ active: boolean }>).detail.active);
    window.addEventListener("conductor:payment-active-changed", handler);
    return () => window.removeEventListener("conductor:payment-active-changed", handler);
  }, []);

  const [isEndOfDayOpen, setIsEndOfDayOpen] = useState(false);
  useEffect(() => {
    const handler = (e: Event) => setIsEndOfDayOpen((e as CustomEvent<{ active: boolean }>).detail.active);
    window.addEventListener("conductor:end-of-day-active-changed", handler);
    return () => window.removeEventListener("conductor:end-of-day-active-changed", handler);
  }, []);

  const [isMetricsOpen, setIsMetricsOpen] = useState(false);
  useEffect(() => {
    const handler = (e: Event) => setIsMetricsOpen((e as CustomEvent<{ active: boolean }>).detail.active);
    window.addEventListener("conductor:metrics-active-changed", handler);
    return () => window.removeEventListener("conductor:metrics-active-changed", handler);
  }, []);

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  useEffect(() => {
    const handler = (e: Event) => setIsSettingsOpen((e as CustomEvent<{ active: boolean }>).detail.active);
    window.addEventListener("conductor:settings-active-changed", handler);
    return () => window.removeEventListener("conductor:settings-active-changed", handler);
  }, []);

  // Whichever popover's open overrides whatever the route says; otherwise
  // the active tab is just whichever nav item matches the route.
  const activeKey = isPaymentOpen
    ? "payment"
    : isEndOfDayOpen
      ? navItems[1].href
      : isMetricsOpen
        ? navItems[2].href
        : isSettingsOpen
          ? navItems[3].href
          : pathname;

  // ─── Sliding active-tab highlight ──────────────────────────────────
  // A single pill that slides/resizes to sit behind whichever item is
  // active, instead of each item cross-fading its own background — reads
  // as one indicator moving between positions rather than two unrelated
  // color changes. Same pattern as AdminBottomNav's indicator: mutate the
  // pill's own style directly from a ref rather than routing the measured
  // position through React state, since the DOM is the source of truth
  // here and a state round-trip would just cost an extra render.
  const pillRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef(new Map<string, HTMLElement>());

  useEffect(() => {
    const applyPillPosition = () => {
      const activeEl = itemRefs.current.get(activeKey);
      if (!pillRef.current || !activeEl) return;
      pillRef.current.style.width = `${activeEl.offsetWidth}px`;
      pillRef.current.style.transform = `translateX(${activeEl.offsetLeft}px)`;
      pillRef.current.style.opacity = "1";
    };

    applyPillPosition();
    // Re-measure on resize too — the dock's width (and each label's) is
    // content-driven, so the active item's position can shift without
    // activeKey itself changing.
    window.addEventListener("resize", applyPillPosition);
    return () => window.removeEventListener("resize", applyPillPosition);
  }, [activeKey]);

  const navItemClass = (isActive: boolean) =>
    `relative z-10 flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-colors whitespace-nowrap cursor-pointer ${
      isActive ? "text-white" : "text-white/50 hover:text-white hover:bg-white/5"
    }`;

  // Every dock item fires this on click, whether it navigates (Dashboard/
  // Metrics/Settings) or opens its own popover (Payment/End-of-Day):
  // ConductorPaymentModal/ConductorEndOfDayModal both close themselves the
  // instant they hear it. Without this, clicking a different tab while a
  // popover was open required closing that popover first — the click
  // itself now does both in one action instead of two.
  const closePopovers = () => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("conductor:close-popovers"));
    }
  };

  return (
    <nav className="hidden xl:flex fixed inset-x-0 bottom-4 z-40 justify-center pointer-events-none">
      <div className="flex items-stretch divide-x divide-white/10 bg-[#071A2E]/95 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl shadow-black/10 overflow-hidden pointer-events-auto">
        {/* Logo */}
        <div className="flex items-center px-4">
          <span className="text-white font-bold text-sm tracking-tight whitespace-nowrap">
            CHATCO<span className="text-[#62A0EA]">.</span>
          </span>
        </div>

        {/* Nav */}
        <div className="relative flex items-center gap-1 px-2 py-2">
          {/* The sliding highlight itself — see the effect above. Starts at
              width:0/opacity:0 so it never flashes at the wrong size/position
              before the first measurement lands. */}
          <div
            ref={pillRef}
            aria-hidden="true"
            className="absolute inset-y-2 left-0 z-0 w-0 rounded-xl bg-[#1A5FB4] shadow-lg shadow-[#1A5FB4]/30 opacity-0 transition-[transform,width,opacity] duration-300 ease-out"
          />

          <Link
            ref={(el) => { if (el) itemRefs.current.set(navItems[0].href, el); }}
            href={navItems[0].href}
            onClick={closePopovers}
            title={navItems[0].fullLabel}
            className={navItemClass(activeKey === navItems[0].href)}
          >
            <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d={navItems[0].icon} />
            </svg>
            {navItems[0].label}
          </Link>

          {/* id read by fare-calculator-modal.tsx's xl:+ popover to anchor
              itself (and its connector tail) to this button's real x
              position instead of the viewport's horizontal center — the
              dock isn't symmetric around Payment (Logo+Dashboard before it,
              End-of-Day/Metrics/Settings/user after), so a center-of-
              viewport anchor visibly points at the wrong button. */}
          <button
            ref={(el) => { if (el) itemRefs.current.set("payment", el); }}
            id="conductor-payment-anchor"
            onClick={() => {
              closePopovers();
              // Already open -> this click is the toggle-off: closePopovers()
              // above is the whole action, don't reopen it.
              if (isPaymentOpen) return;
              if (typeof window !== "undefined") {
                window.dispatchEvent(new CustomEvent("conductor:open-payment"));
              }
            }}
            title="Payment"
            className={navItemClass(activeKey === "payment")}
          >
            <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d={paymentIconPath} />
            </svg>
            Payment
          </button>

          {/* End-of-Day opens as a popover (ConductorEndOfDayModal) instead
              of navigating, same reasoning as Payment above — keeps the
              conductor on whatever tab they were on. The full page at
              conductor-dashboard/end-of-day still exists for phones/tablets
              and direct links; only this xl:+ dock button skips it. */}
          <button
            ref={(el) => { if (el) itemRefs.current.set(navItems[1].href, el); }}
            id="conductor-end-of-day-anchor"
            onClick={() => {
              closePopovers();
              if (isEndOfDayOpen) return;
              if (typeof window !== "undefined") {
                window.dispatchEvent(new CustomEvent("conductor:open-end-of-day"));
              }
            }}
            title={navItems[1].fullLabel}
            className={navItemClass(activeKey === navItems[1].href)}
          >
            <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d={navItems[1].icon} />
            </svg>
            {navItems[1].label}
          </button>

          {/* Metrics opens as a popover (ConductorMetricsModal) instead of
              navigating, same reasoning as Payment/End-of-Day above. The
              full page at conductor-dashboard/metrics still exists for
              phones/tablets and direct links; only this xl:+ dock button
              skips it. */}
          <button
            ref={(el) => { if (el) itemRefs.current.set(navItems[2].href, el); }}
            id="conductor-metrics-anchor"
            onClick={() => {
              closePopovers();
              if (isMetricsOpen) return;
              if (typeof window !== "undefined") {
                window.dispatchEvent(new CustomEvent("conductor:open-metrics"));
              }
            }}
            title={navItems[2].fullLabel}
            className={navItemClass(activeKey === navItems[2].href)}
          >
            <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d={navItems[2].icon} />
            </svg>
            {navItems[2].label}
          </button>

          {/* Settings opens as a popover (ConductorSettingsModal) instead
              of navigating, same reasoning as Payment/End-of-Day/Metrics
              above. The full page at conductor-dashboard/conductor-settings
              still exists for phones/tablets and direct links; only this
              xl:+ dock button skips it. */}
          <button
            ref={(el) => { if (el) itemRefs.current.set(navItems[3].href, el); }}
            id="conductor-settings-anchor"
            onClick={() => {
              closePopovers();
              if (isSettingsOpen) return;
              if (typeof window !== "undefined") {
                window.dispatchEvent(new CustomEvent("conductor:open-settings"));
              }
            }}
            title={navItems[3].fullLabel}
            className={navItemClass(activeKey === navItems[3].href)}
          >
            <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d={navItems[3].icon} />
            </svg>
            {navItems[3].label}
          </button>
        </div>

        {/* User identity */}
        <div className="flex items-center gap-2.5 px-4">
          <div className="w-8 h-8 rounded-full bg-[#1A5FB4] flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
            {conductorInitial}
          </div>
          <div className="min-w-0 max-w-[110px]">
            <p className="text-white text-xs font-semibold truncate leading-tight">{conductorName}</p>
            <p className="text-white/40 text-[10px] leading-tight truncate">{statusLabel}</p>
          </div>
        </div>
      </div>
    </nav>
  );
}
