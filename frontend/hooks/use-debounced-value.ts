"use client";

import { useEffect, useState } from "react";

/**
 * Returns a copy of `value` that only updates after `delayMs` has passed
 * without `value` changing. Use this to delay expensive side effects (API
 * calls, DB queries) that key off fast-changing input (e.g. a search box)
 * without touching the input's own state — bind the input to the original
 * value for instant feedback, and key the side effect off the debounced one.
 */
export function useDebouncedValue<T>(value: T, delayMs: number = 400): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debouncedValue;
}
