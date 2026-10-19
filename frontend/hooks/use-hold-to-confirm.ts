"use client";

import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type MouseEvent, type PointerEvent } from "react";

/**
 * Press-and-hold confirmation for a button: `onConfirm` fires only after the
 * pointer (or Space/Enter) has been held for `holdMs`. Letting go earlier
 * cancels and sets `releasedEarly` briefly so the UI can say "Keep holding".
 *
 * The fill animation is meant to be a CSS transition keyed off `isHolding`
 * (e.g. `scale-0` -> `scale-100` over `holdMs`), so a hold costs two renders
 * instead of one per animation frame.
 */
export function useHoldToConfirm(onConfirm: () => void, enabled: boolean, holdMs = 600) {
  const [isHolding, setIsHolding] = useState(false);
  const [releasedEarly, setReleasedEarly] = useState(false);
  const holdTimerRef = useRef<number | null>(null);
  const hintTimerRef = useRef<number | null>(null);
  const onConfirmRef = useRef(onConfirm);
  const enabledRef = useRef(enabled);

  useEffect(() => {
    onConfirmRef.current = onConfirm;
    enabledRef.current = enabled;
  });

  useEffect(() => () => {
    if (holdTimerRef.current !== null) window.clearTimeout(holdTimerRef.current);
    if (hintTimerRef.current !== null) window.clearTimeout(hintTimerRef.current);
  }, []);

  const begin = useCallback(() => {
    if (!enabledRef.current || holdTimerRef.current !== null) return;
    if (hintTimerRef.current !== null) window.clearTimeout(hintTimerRef.current);
    setReleasedEarly(false);
    setIsHolding(true);
    holdTimerRef.current = window.setTimeout(() => {
      holdTimerRef.current = null;
      setIsHolding(false);
      // The button may have become unavailable mid-hold (left range, a hail
      // already started) — only confirm if it is still allowed.
      if (enabledRef.current) onConfirmRef.current();
    }, holdMs);
  }, [holdMs]);

  const end = useCallback(() => {
    // Null means the hold already completed (or never started): nothing to cancel.
    if (holdTimerRef.current === null) return;
    window.clearTimeout(holdTimerRef.current);
    holdTimerRef.current = null;
    setIsHolding(false);
    setReleasedEarly(true);
    hintTimerRef.current = window.setTimeout(() => {
      hintTimerRef.current = null;
      setReleasedEarly(false);
    }, 1600);
  }, []);

  const handlers = {
    onPointerDown: (event: PointerEvent<HTMLElement>) => {
      if (event.pointerType === "mouse" && event.button !== 0) return;
      // Capture so a finger drifting off the button mid-hold doesn't cancel it;
      // only lifting the finger ends the hold.
      event.currentTarget.setPointerCapture?.(event.pointerId);
      begin();
    },
    onPointerUp: end,
    onPointerCancel: end,
    // Stop the long-press context menu / callout on mobile from hijacking the hold.
    onContextMenu: (event: MouseEvent<HTMLElement>) => event.preventDefault(),
    onKeyDown: (event: KeyboardEvent<HTMLElement>) => {
      if ((event.key === " " || event.key === "Enter") && !event.repeat) {
        event.preventDefault();
        begin();
      }
    },
    onKeyUp: (event: KeyboardEvent<HTMLElement>) => {
      if (event.key === " " || event.key === "Enter") end();
    },
  };

  return { isHolding, releasedEarly, handlers };
}
