"use client";

import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type MouseEvent, type PointerEvent } from "react";

/**
 * Spread onto a popover's backdrop element to close it when the user clicks
 * outside the panel. Only a press that both started AND ended on the
 * backdrop itself counts — a drag that starts inside the panel (selecting
 * text, say) and releases over the backdrop must not dismiss it, and a click
 * that bubbles up from the panel has a different `target` anyway. Pass
 * `undefined` to disable dismissal (e.g. mid-payment steps).
 *
 * Uses click, not pointerdown, so below xl: (where the backdrop unmounts
 * instantly) the tap can't fall through onto whatever sits underneath.
 */
export function useBackdropDismiss(onDismiss?: () => void) {
  const pressStartedOnBackdrop = useRef(false);
  return {
    onPointerDown: (e: PointerEvent<HTMLElement>) => {
      pressStartedOnBackdrop.current = e.target === e.currentTarget;
    },
    onClick: (e: MouseEvent<HTMLElement>) => {
      const shouldDismiss = pressStartedOnBackdrop.current && e.target === e.currentTarget;
      pressStartedOnBackdrop.current = false;
      if (shouldDismiss) onDismiss?.();
    },
  };
}

interface UsePopoverModalResult {
  /** false once the close (below xl:, instant; xl:+, after the exit
   *  animation) has actually finished — gate the component's `return null`
   *  on this, not on the raw `isOpen` prop. */
  isRendered: boolean;
  /** Apply to the backdrop element's className. */
  backdropAnim: string;
  /** Apply to the panel element's className. */
  panelAnim: string;
  /** Spread onto the panel element's `style` — carries the anchor offset
   *  into the popover-panel-in/out keyframes (see globals.css). */
  panelAnchorStyle: CSSProperties;
  /** Passed straight through to <PopoverTail anchorOffsetPx={...} />. */
  anchorOffset: number | null;
}

/**
 * Shared open/close + xl:+ popover-anchoring lifecycle for conductor modals
 * that render as an ordinary bottom-sheet/dialog below xl: and a bubble
 * anchored to a ConductorDock button at xl:+ (payment, end-of-day, ...).
 * See globals.css's "Modal entrance" / "Payment modal popover" comments for
 * the CSS half of this pattern — this hook owns only the JS half:
 *
 *   - Exit-animation timing, xl:+ only. Below 1280px, isOpen -> false still
 *     unmounts instantly (checked via matchMedia at the moment of closing),
 *     exactly as every one of these modals behaved before this pattern
 *     existed — only xl:+ gets the extra 220ms for its close transition to
 *     actually play before the DOM node disappears.
 *   - Measuring the real trigger button (`anchorElementId`, an id on some
 *     ConductorDock item) so the popover and its PopoverTail can sit under
 *     it instead of the viewport's horizontal center, which is wrong the
 *     moment the dock isn't symmetric around that button.
 *
 * Two independent call sites (FareCalcModal for Payment, EndOfDayModal for
 * End-of-Day) share this hook rather than each re-implementing the same
 * timers/measurement — see either for the exact usage.
 */
export function usePopoverModal(isOpen: boolean, anchorElementId: string): UsePopoverModalResult {
  const [isRendered, setIsRendered] = useState(isOpen);
  const [isClosing, setIsClosing] = useState(false);
  const [anchorOffset, setAnchorOffset] = useState<number | null>(null);

  useEffect(() => {
    if (isOpen) {
      setIsRendered(true);
      setIsClosing(false);
      return;
    }
    if (!isRendered) return;
    const isLargeScreen = typeof window !== "undefined" && window.matchMedia("(min-width: 1280px)").matches;
    if (!isLargeScreen) {
      setIsRendered(false);
      return;
    }
    setIsClosing(true);
    const timer = window.setTimeout(() => {
      setIsRendered(false);
      setIsClosing(false);
    }, 220);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- isRendered is a guard, not a dependency to re-fire on
  }, [isOpen]);

  // Layout effect (not a plain effect) so the offset is already correct on
  // the very first painted frame of the entrance animation instead of
  // snapping into place a tick later.
  useLayoutEffect(() => {
    if (!isRendered) return;

    const measure = () => {
      const isLargeScreen = window.matchMedia("(min-width: 1280px)").matches;
      const button = isLargeScreen ? document.getElementById(anchorElementId) : null;
      if (!button) {
        setAnchorOffset(null);
        return;
      }
      const rect = button.getBoundingClientRect();
      setAnchorOffset(rect.left + rect.width / 2 - window.innerWidth / 2);
    };

    measure();
    // Re-measure on resize too — "different large screen sizes" can change
    // both the viewport center AND the button's own x position (the dock's
    // content-driven width scales with it).
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [isRendered, anchorElementId]);

  const backdropAnim = isClosing ? "animate-modal-backdrop-out" : "animate-modal-backdrop-in";
  const panelAnim = isClosing
    ? "animate-modal-panel-out popover-panel-out"
    : "animate-modal-panel-in popover-panel-in";
  const panelAnchorStyle = { "--popover-anchor-offset": `${anchorOffset ?? 0}px` } as CSSProperties;

  return { isRendered, backdropAnim, panelAnim, panelAnchorStyle, anchorOffset };
}
