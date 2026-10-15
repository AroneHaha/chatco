"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import FareContent from "@/components/commuter/fare/fare-content";
import { usePopoverModal, useBackdropDismiss } from "@/components/conductor/modals/use-popover-modal";
import { PopoverTail } from "@/components/conductor/modals/popover-tail";
import { useCommuterTheme } from "@/contexts/commuter-theme-context";

export const FARE_ANCHOR_ID = "commuter-fare-anchor";

export default function CommuterFareModal() {
  const [isOpen, setIsOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const theme = useCommuterTheme();

  useEffect(() => {
    const open = () => setIsOpen(true);
    const close = () => setIsOpen(false);
    window.addEventListener("commuter:open-fare", open);
    window.addEventListener("commuter:close-popovers", close);
    return () => {
      window.removeEventListener("commuter:open-fare", open);
      window.removeEventListener("commuter:close-popovers", close);
    };
  }, []);

  const [lastPathname, setLastPathname] = useState(pathname);
  if (lastPathname !== pathname) {
    setLastPathname(pathname);
    setIsOpen(false);
  }

  useEffect(() => {
    window.dispatchEvent(new CustomEvent("commuter:fare-active-changed", { detail: { active: isOpen } }));
  }, [isOpen]);

  const { isRendered, backdropAnim, panelAnim, panelAnchorStyle, anchorOffset } = usePopoverModal(isOpen, FARE_ANCHOR_ID);
  const backdropDismiss = useBackdropDismiss(() => setIsOpen(false));

  useEffect(() => {
    if (!isOpen || !isRendered) return;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const panel = panelRef.current;
    const controls = () => Array.from(panel?.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), a[href], [tabindex="0"]') ?? []);
    controls()[0]?.focus();
    const handleKey = (event: KeyboardEvent) => {
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
    <div className={`fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 xl:items-end xl:bg-transparent xl:backdrop-blur-none xl:bottom-24 ${backdropAnim}`} {...backdropDismiss}>
      {/* The tail sits against the fare summary footer, so it takes that
          footer's fill: #050F1A dark, white light. */}
      <PopoverTail panelColor={theme === "light" ? "#FFFFFF" : "#050F1A"} anchorOffsetPx={anchorOffset} className="light:border-gray-200" />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="commuter-fare-title"
        className={`flex h-[min(85dvh,calc(100dvh-8rem))] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#050F1A] light:border-gray-200 light:bg-[#F8FAFC] shadow-2xl shadow-black/40 ${panelAnim}`}
        style={panelAnchorStyle}
      >
        <FareContent variant="modal" />
      </div>
    </div>
  );
}
