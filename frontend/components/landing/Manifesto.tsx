"use client";

import GsapWords from "./GsapWords";
import CountUp from "./CountUp";
import Reveal from "./Reveal";

const STATS = [
  { end: 3, suffix: "", label: "Platforms in one system", sub: "Commuter · Conductor · Admin" },
  { end: 100, suffix: "%", label: "Cashless-ready fares", sub: "Paid directly via GCash" },
  { end: 4, suffix: "+", label: "Languages supported", sub: "EN · FIL · Regional" },
];

/**
 * Editorial statement band. The headline reveals word-by-word as you scroll
 * through it (GsapWords / ScrollTrigger scrub), then a row of count-up stats
 * animates in. Sits on the same navy as the hero to bookend the page.
 */
export default function Manifesto() {
  return (
    <section className="relative overflow-hidden bg-[#071A2E] py-24 md:py-32">
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
        <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-medium text-white/60 mb-8">
          <span className="w-1.5 h-1.5 rounded-full bg-[#62A0EA] animate-pulse" />
          Why CHATCO
        </span>

        <GsapWords
          as="h2"
          className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white leading-[1.15] tracking-tight max-w-4xl mx-auto"
          text="Every jeepney ride, made smarter, safer, and cashless — for the commuter, the conductor, and the operator alike."
          accentWords={["smarter", "safer", "cashless"]}
        />

        {/* Count-up stats */}
        <Reveal
          stagger
          className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-8 md:gap-6 max-w-3xl mx-auto"
        >
          {STATS.map((s) => (
            <div key={s.label} className="text-center">
              <div className="text-4xl md:text-5xl font-extrabold bg-gradient-to-r from-[#62A0EA] to-[#99C1F1] bg-clip-text text-transparent">
                <CountUp end={s.end} suffix={s.suffix} grouped={false} />
              </div>
              <div className="mt-2 text-sm font-semibold text-white">{s.label}</div>
              <div className="mt-1 text-xs text-white/40">{s.sub}</div>
            </div>
          ))}
        </Reveal>
      </div>
    </section>
  );
}
