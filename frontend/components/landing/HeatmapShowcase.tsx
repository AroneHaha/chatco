"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { useInView } from "@/hooks/useInView";

// Leaflet touches `window`, so the map is client-only; it also mounts only once
// the section scrolls into view so its tiles don't load with the first paint.
const HailMap = dynamic(() => import("./HailMap"), { ssr: false });

const STEPS = [
  { num: "1", color: "bg-[#62A0EA]/20", text: "text-[#62A0EA]", desc: "Tap 'Pick Me Up' — your exact GPS location is broadcasted securely" },
  { num: "2", color: "bg-[#FFB800]/20", text: "text-[#FFB800]", desc: "CHATCO's smart network flags your stop as a high-priority pick-up zone" },
  { num: "3", color: "bg-[#FF6D3A]/20", text: "text-[#FF6D3A]", desc: "Drivers will be alerted to avoid missing waiting commuters." },
  { num: "4", color: "bg-emerald-500/20", text: "text-emerald-400", desc: "Your jeepney arrives faster — no more endless waiting in the dark or rain" },
];

const STAGE_COLOR = ["#62A0EA", "#FFB800", "#FF6D3A", "#22C55E"];

// How far the responding jeepney has driven toward the hail point at each step.
const STEP_PROGRESS = [0, 0, 0.55, 1];

export default function HeatmapShowcase() {
  const { ref, visible } = useInView();
  const [step, setStep] = useState(0);

  return (
    <section
      id="smart-hailing"
      ref={ref}
      className={`py-20 md:py-28 bg-[#071A2E] text-white transition-all duration-700 ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
      }`}
    >
      <div className="max-w-7xl mx-auto px-5 md:px-8">
        <div className="relative">
          {/* Stage */}
          <div className="relative w-full aspect-4/3 sm:aspect-video lg:aspect-16/8 bg-[#050F1A] rounded-3xl overflow-hidden border border-white/5">
            {visible && <HailMap step={step} color={STAGE_COLOR[step]} progress={STEP_PROGRESS[step]} />}

            {/* Legend & live badge */}
            <div className="absolute bottom-3 right-3 bg-black/50 backdrop-blur-md rounded-lg px-3 py-2 border border-white/5">
              <div className="text-[10px] text-white/50 font-medium uppercase tracking-wider mb-1.5">Pick-up Activity</div>
              <div className="flex items-center gap-3">
                {[{ c: "bg-[#62A0EA]", l: "Hailed" }, { c: "bg-[#FF6D3A]", l: "Alerted" }, { c: "bg-emerald-500", l: "Arriving" }].map((i) => (
                  <div key={i.l} className="flex items-center gap-1"><div className={`w-2.5 h-2.5 rounded-full ${i.c}`} /><span className="text-[10px] text-white/40">{i.l}</span></div>
                ))}
              </div>
            </div>
            <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-black/50 backdrop-blur-md rounded-full px-2.5 py-1 border border-white/5">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              <span className="text-[10px] text-white/60 font-medium">HAILING</span>
            </div>
          </div>

          {/* Floating control panel */}
          <div className="relative -mt-10 mx-4 sm:mx-8 lg:absolute lg:mt-0 lg:top-1/2 lg:left-8 lg:-translate-y-1/2 lg:mx-0 lg:w-95">
            <div className="rounded-3xl bg-[#071A2E]/90 backdrop-blur-xl border border-white/10 shadow-2xl shadow-black/40 p-6 md:p-7">
              <h2 className="font-sans font-bold text-2xl md:text-3xl tracking-tight text-white">
                Stop Waiting.<br /><span className="text-[#FF6D3A]">Start Hailing.</span>
              </h2>
              <p className="mt-3 text-sm text-white/50 leading-relaxed">
                One tap signals nearby drivers exactly where you are. Step through what happens next.
              </p>

              <div className="mt-6 space-y-1.5">
                {STEPS.map((s, i) => {
                  const on = step === i;
                  return (
                    <button
                      key={s.num}
                      type="button"
                      onClick={() => setStep(i)}
                      className={`w-full flex items-start gap-3 text-left rounded-xl px-3 py-2.5 transition-colors duration-300 ${
                        on ? "bg-white/8" : "hover:bg-white/5"
                      }`}
                    >
                      <span className={`shrink-0 mt-0.5 w-6 h-6 rounded-md ${s.color} flex items-center justify-center ${s.text} text-xs font-bold`}>
                        {s.num}
                      </span>
                      <p className={`text-sm leading-relaxed transition-colors duration-300 ${on ? "text-white" : "text-white/50"}`}>
                        {s.desc}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
