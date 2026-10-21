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
    <section id="platform" className="relative overflow-hidden bg-[#F0F7FF] py-24 md:py-32 text-gray-900">
      {/* Ambient glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] bg-[#1A5FB4]/[0.06] rounded-full blur-[160px]" />
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(26,95,180,.4) 1px, transparent 1px), linear-gradient(90deg, rgba(26,95,180,.4) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      <div className="relative max-w-5xl mx-auto px-5 md:px-8 text-center">
        <GsapWords
          as="h2"
          className="font-sans font-semibold text-2xl sm:text-3xl md:text-4xl text-gray-900 leading-[1.2] tracking-tight max-w-4xl mx-auto"
          text="Your everyday jeepney ride, made smarter, safer, and cashless — from finding your ride to reaching your destination."
          accentWords={["smarter", "safer", "cashless"]}
        />

        {/* One-line dataline instead of a stat-tile grid — the facts sit
            inline as a caption under the statement rather than restating it
            as a separate template. */}
        <Reveal>
          <p className="mt-10 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs font-semibold uppercase tracking-wider text-gray-500">
            <span>
              <CountUp end={2} suffix="" grouped={false} className="text-gray-900" /> platforms, one account
            </span>
            <span className="text-gray-300">·</span>
            <span>
              <CountUp end={100} suffix="%" grouped={false} className="text-gray-900" /> cashless-ready fares
            </span>
          </p>
          <p className="mt-3 text-sm text-gray-500">Ride with CHATCO on the web or on Android.</p>
        </Reveal>
      </div>
    </section>
  );
}
