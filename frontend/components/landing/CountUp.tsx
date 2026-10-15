"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";

const motionQuery = "(prefers-reduced-motion: reduce)";
const subscribeMotion = (notify: () => void) => {
  const media = window.matchMedia(motionQuery);
  media.addEventListener("change", notify);
  return () => media.removeEventListener("change", notify);
};
const getReducedMotion = () => window.matchMedia(motionQuery).matches;
const getServerReducedMotion = () => false;

interface CountUpProps {
  end: number;
  suffix?: string;
  prefix?: string;
  duration?: number;
  /** Group thousands with separators (e.g. 2,019). */
  grouped?: boolean;
  className?: string;
}

/** Animates from 0 to `end` when scrolled into view (once). Honours reduced motion. */
export default function CountUp({
  end,
  suffix = "",
  prefix = "",
  duration = 1800,
  grouped = true,
  className,
}: CountUpProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const started = useRef(false);
  const [val, setVal] = useState(0);
  const reducedMotion = useSyncExternalStore(subscribeMotion, getReducedMotion, getServerReducedMotion);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    if (reducedMotion) return;
    let frame = 0;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true;
          const t0 = performance.now();
          const tick = (t: number) => {
            const p = Math.min((t - t0) / duration, 1);
            const eased = 1 - Math.pow(1 - p, 3);
            setVal(Math.round(end * eased));
            if (p < 1) frame = requestAnimationFrame(tick);
          };
          frame = requestAnimationFrame(tick);
          observer.disconnect();
        }
      },
      { threshold: 0.4 }
    );

    observer.observe(node);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
      started.current = false;
    };
  }, [end, duration, reducedMotion]);

  const displayed = reducedMotion ? end : val;

  return (
    <span ref={ref} className={className}>
      {prefix}
      {grouped ? displayed.toLocaleString() : String(displayed)}
      {suffix}
    </span>
  );
}
