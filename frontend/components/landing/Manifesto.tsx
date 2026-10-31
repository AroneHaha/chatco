"use client";

import GsapWords from "./GsapWords";
import CountUp from "./CountUp";
import Reveal from "./Reveal";

/**
 * Editorial statement band. The headline reveals word-by-word as you scroll
 * through it (GsapWords / ScrollTrigger scrub), then a single-line dataline
 * with count-up numbers animates in beneath it.
 */
export default function Manifesto() {
  return (
    // Navy band (How It Works' field) so the light Features and Download sections either side read as separate.
    <section id="platform" className="relative overflow-hidden bg-[#0C2A52] py-24 md:py-32 text-white">
      {/* Same faint structural grid as the hero. */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.6) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
        }}
      />

      <div className="relative max-w-5xl mx-auto px-5 md:px-8 text-center">
        <GsapWords
          as="h2"
          className="font-sans font-semibold text-2xl sm:text-3xl md:text-4xl text-white leading-[1.2] tracking-tight max-w-4xl mx-auto"
          text="Your everyday jeepney ride, made smarter, safer, and cashless — from finding your ride to reaching your destination."
          accentWords={["smarter", "safer", "cashless"]}
        />

        {/* One-line dataline instead of a stat-tile grid — the facts sit
            inline as a caption under the statement rather than restating it
            as a separate template. */}
        <Reveal>
          <p className="mt-10 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs font-semibold uppercase tracking-wider text-white/50">
            <span>
              <CountUp end={2} suffix="" grouped={false} className="text-white" /> platforms, one account
            </span>
            <span className="text-white/25">·</span>
            <span>
              <CountUp end={100} suffix="%" grouped={false} className="text-white" /> cashless-ready fares
            </span>
          </p>
          <p className="mt-3 text-sm text-white/50">Ride with CHATCO on the web or on Android.</p>
        </Reveal>
      </div>
    </section>
  );
}
