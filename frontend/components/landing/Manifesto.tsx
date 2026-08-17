"use client";

import GsapWords from "./GsapWords";
import CountUp from "./CountUp";
import Reveal from "./Reveal";

/**
 * Editorial statement band. The headline reveals word-by-word as you scroll
 * through it (GsapWords / ScrollTrigger scrub), then a single-line dataline
 * with count-up numbers animates in beneath it. Sits on the same navy as the
 * hero to bookend the page.
 */
export default function Manifesto() {
  return (
    <section id="platform" className="relative overflow-hidden bg-[#071A2E] py-24 md:py-32">
      {/* Ambient glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] bg-[#1A5FB4]/15 rounded-full blur-[160px]" />
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,.4) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.4) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      <div className="relative max-w-5xl mx-auto px-5 md:px-8 text-center">
        <GsapWords
          as="h2"
          className="font-editorial-serif font-medium text-3xl sm:text-4xl md:text-5xl text-white leading-[1.15] tracking-tight max-w-4xl mx-auto"
          text="Every jeepney ride, made smarter, safer, and cashless — for the commuter, the conductor, and the operator alike."
          accentWords={["smarter", "safer", "cashless"]}
        />

        {/* One-line dataline instead of a stat-tile grid — the facts sit
            inline as a caption under the statement rather than restating it
            as a separate template. */}
        <Reveal>
          <p className="mt-10 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs font-semibold uppercase tracking-wider text-white/40">
            <span>
              <CountUp end={3} suffix="" grouped={false} className="text-white" /> platforms, one system
            </span>
            <span className="text-white/15">·</span>
            <span>
              <CountUp end={100} suffix="%" grouped={false} className="text-white" /> cashless-ready fares
            </span>
          </p>
        </Reveal>
      </div>
    </section>
  );
}
