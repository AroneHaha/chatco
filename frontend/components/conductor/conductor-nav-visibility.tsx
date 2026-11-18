"use client";

import { createContext, useContext, useEffect } from "react";

/**
 * Lets a page ask the conductor layout to drop its navigation (bottom nav,
 * tablet sidebar, xl dock). Provided by app/(conductor)/layout.tsx. A context
 * setter rather than a window event: the End-of-Day report can know its state
 * from cache on the first render, before the layout's own effects would have
 * attached an event listener.
 */
export const HideConductorNavContext = createContext<(hide: boolean) => void>(() => {});

export function useHideConductorNav(hide: boolean) {
  const setHidden = useContext(HideConductorNavContext);
  useEffect(() => {
    setHidden(hide);
    return () => setHidden(false);
  }, [setHidden, hide]);
}
