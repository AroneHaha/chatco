"use client";

import { useEffect, useRef, type RefObject } from "react";

export function useMobileNavHighlight(activeHref: string) {
  const navRowRef = useRef<HTMLDivElement>(null);
  const highlightRef = useRef<HTMLDivElement>(null);
  const iconRefs = useRef(new Map<string, HTMLDivElement>());

  useEffect(() => {
    const positionHighlight = () => {
      const row = navRowRef.current;
      const highlight = highlightRef.current;
      const activeIcon = iconRefs.current.get(activeHref);
      if (!row || !highlight) return;
      if (!activeIcon) {
        highlight.style.opacity = "0";
        return;
      }

      const rowBounds = row.getBoundingClientRect();
      const iconBounds = activeIcon.getBoundingClientRect();
      highlight.style.transform = `translate(${iconBounds.left - rowBounds.left}px, ${iconBounds.top - rowBounds.top}px)`;
      highlight.style.opacity = "1";
    };

    positionHighlight();
    const observer = new ResizeObserver(positionHighlight);
    if (navRowRef.current) observer.observe(navRowRef.current);
    return () => observer.disconnect();
  }, [activeHref]);

  return { navRowRef, highlightRef, iconRefs };
}

export default function MobileNavHighlight({ highlightRef }: {
  highlightRef: RefObject<HTMLDivElement | null>;
}) {
  return (
    <div
      ref={highlightRef}
      aria-hidden="true"
      className="absolute left-0 top-0 z-0 w-9 h-9 md:w-10 md:h-10 rounded-full bg-[#1A5FB4] shadow-lg shadow-[#1A5FB4]/25 opacity-0 pointer-events-none transition-[transform,opacity] duration-300 ease-out motion-reduce:duration-0"
    />
  );
}
