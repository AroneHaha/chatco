"use client";

import { useEffect } from "react";
import Lenis from "lenis";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

/**
 * Global Lenis smooth-scroll layer for the landing page, driven by GSAP's
 * ticker so it stays in lockstep with every ScrollTrigger (the word reveals +
 * section reveals). Disabled when the user prefers reduced motion. In-page nav
 * anchors are smooth-scrolled with an offset for the fixed navbar, without
 * writing the #hash to the URL — otherwise a reload (or the address bar's
 * autocomplete) reopens the page at that section instead of the top.
 *
 * Mounted only on the marketing landing route — the app dashboards keep native
 * scrolling.
 */
export default function SmoothScroll() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const lenis = new Lenis({
      duration: 1.1,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    });

    const onAnchorClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = (event.target as Element | null)?.closest<HTMLAnchorElement>('a[href^="#"]');
      const hash = link?.getAttribute("href") ?? "";
      if (hash === "#") {
        event.preventDefault();
        lenis.scrollTo(0);
        return;
      }
      const target = hash.length > 1 ? document.getElementById(hash.slice(1)) : null;
      if (!target) return;
      event.preventDefault();
      lenis.scrollTo(target, { offset: -80 });
    };
    document.addEventListener("click", onAnchorClick);

    // Keep ScrollTrigger's cached positions in sync with Lenis.
    lenis.on("scroll", ScrollTrigger.update);

    const onTick = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(onTick);
    gsap.ticker.lagSmoothing(0);

    return () => {
      document.removeEventListener("click", onAnchorClick);
      gsap.ticker.remove(onTick);
      lenis.destroy();
    };
  }, []);

  return null;
}
