"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { useRef } from "react";

gsap.registerPlugin(ScrollTrigger, useGSAP);

interface RevealProps {
  children: React.ReactNode;
  className?: string;
  /** Stagger the wrapper's direct children instead of animating it as one block. */
  stagger?: boolean;
  /** Rise distance in px. */
  y?: number;
}

/**
 * Scroll-triggered entrance. Fades + rises the wrapped content (or, with
 * `stagger`, each direct child in sequence) as it enters the viewport. Uses a
 * one-shot trigger (not scrub) so content settles and stays put.
 *
 * Honours reduced motion by leaving content at its natural visible state.
 */
export default function Reveal({
  children,
  className,
  stagger = false,
  y = 28,
}: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      const el = ref.current;
      if (!el) return;

      const targets = stagger ? (Array.from(el.children) as HTMLElement[]) : el;

      gsap.fromTo(
        targets,
        { opacity: 0, y },
        {
          opacity: 1,
          y: 0,
          duration: 0.8,
          ease: "power3.out",
          stagger: stagger ? 0.12 : 0,
          scrollTrigger: {
            trigger: el,
            start: "top 85%",
            toggleActions: "play none none none",
          },
        }
      );
    },
    { scope: ref }
  );

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
