"use client";

import { useEffect, useRef, useState } from "react";
import { Bus } from "lucide-react";
import { useInView } from "@/hooks/useInView";

const STEPS = [
  { num: "1", color: "bg-[#62A0EA]/20", text: "text-[#62A0EA]", desc: "Tap 'Pick Me Up' — your exact GPS location is broadcasted securely" },
  { num: "2", color: "bg-[#FFB800]/20", text: "text-[#FFB800]", desc: "CHATCO's smart network flags your stop as a high-priority pick-up zone" },
  { num: "3", color: "bg-[#FF6D3A]/20", text: "text-[#FF6D3A]", desc: "Drivers will be alerted to avoid missing waiting commuters." },
  { num: "4", color: "bg-emerald-500/20", text: "text-emerald-400", desc: "Your jeepney arrives faster — no more endless waiting in the dark or rain" },
];

const STAGE_COLOR = ["#62A0EA", "#FFB800", "#FF6D3A", "#22C55E"];

// The road the responding jeepney travels, from its starting position down
// to the hail point — shared by the visible route line and the bus marker,
// so the bus always sits exactly on the curve rather than floating free.
const ROUTE_D = "M 84 14 C 68 24, 66 46, 56 58";
const STEP_PROGRESS = [0, 0, 0.55, 1];

export default function HeatmapShowcase() {
  const { ref, visible } = useInView();
  const [step, setStep] = useState(0);
  const pathRef = useRef<SVGPathElement>(null);
  const [totalLen, setTotalLen] = useState(0);
  const [busPoint, setBusPoint] = useState({ x: 84, y: 14 });

  useEffect(() => {
    if (pathRef.current) setTotalLen(pathRef.current.getTotalLength());
  }, []);

  useEffect(() => {
    const path = pathRef.current;
    if (!path || !totalLen) return;
    const pt = path.getPointAtLength(STEP_PROGRESS[step] * totalLen);
    setBusPoint({ x: pt.x, y: pt.y });
  }, [step, totalLen]);

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
            <div
              className="absolute inset-0 opacity-20"
              style={{ backgroundImage: "linear-gradient(rgba(26,95,180,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(26,95,180,0.4) 1px, transparent 1px)", backgroundSize: "48px 48px" }}
            />
            <div className="absolute top-[42%] left-0 right-0 h-0.75 bg-[#1A5FB4]/25" />
            <div className="absolute top-0 bottom-0 left-[38%] w-0.75 bg-[#1A5FB4]/25" />

            {/* Ambient context hotspots */}
            <div className="absolute top-[65%] left-[16%]">
              <div className="w-24 h-24 rounded-full opacity-70" style={{ background: "radial-gradient(circle, rgba(255,107,53,0.4) 0%, rgba(255,184,0,0.18) 40%, transparent 65%)" }} />
              <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[10px] text-white/60 font-semibold whitespace-nowrap bg-black/30 px-2 py-0.5 rounded-full">Marilao</span>
            </div>
            <div className="absolute top-[20%] left-[68%]">
              <div className="w-20 h-20 rounded-full opacity-60" style={{ background: "radial-gradient(circle, rgba(255,184,0,0.35) 0%, rgba(255,184,0,0.12) 45%, transparent 65%)" }} />
              <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[10px] text-white/60 font-semibold whitespace-nowrap bg-black/30 px-2 py-0.5 rounded-full">Calumpit</span>
            </div>

            {/* Route the jeepney travels — a faint full corridor plus an
                accent-colored trail that draws itself in as the driver
                gets alerted and closes in on the hail point. */}
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 w-full h-full pointer-events-none">
              <path d={ROUTE_D} stroke="white" strokeOpacity="0.1" strokeWidth="1.5" strokeDasharray="1.5 3" strokeLinecap="round" fill="none" vectorEffect="non-scaling-stroke" />
              <path
                ref={pathRef}
                d={ROUTE_D}
                stroke={STAGE_COLOR[step]}
                strokeWidth="2"
                strokeLinecap="round"
                fill="none"
                vectorEffect="non-scaling-stroke"
                strokeDasharray={totalLen || 1}
                strokeDashoffset={totalLen ? totalLen * (1 - STEP_PROGRESS[step]) : totalLen}
                style={{ transition: "stroke-dashoffset 700ms ease-out, stroke 500ms" }}
              />
            </svg>

            {/* Interactive hail point — reacts to the selected step */}
            <div
              className="absolute transition-all duration-700 ease-out"
              style={{ top: "58%", left: "56%" }}
            >
              <div
                className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full transition-all duration-700"
                style={{
                  width: step >= 1 ? 150 : 60,
                  height: step >= 1 ? 150 : 60,
                  background: `radial-gradient(circle, ${STAGE_COLOR[step]}66 0%, ${STAGE_COLOR[step]}22 40%, transparent 70%)`,
                }}
              />
              <div
                className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full transition-colors duration-500"
                style={{ width: 14, height: 14, background: STAGE_COLOR[step], boxShadow: `0 0 0 4px ${STAGE_COLOR[step]}33` }}
              />
              {step < 3 && (
                <span
                  className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full animate-ping"
                  style={{ width: 14, height: 14, background: STAGE_COLOR[step], opacity: 0.5 }}
                />
              )}
              {step === 3 && (
                <span className="absolute left-3 top-3 flex items-center gap-1.5 bg-emerald-500 text-[#071A2E] text-[10px] font-bold px-2 py-1 rounded-full whitespace-nowrap shadow-lg">
                  ✓ Picked up
                </span>
              )}
            </div>

            {/* Responding jeepney — travels toward the hail point as the driver gets alerted */}
            <div
              className="absolute w-8 h-8 rounded-lg flex items-center justify-center text-white shadow-lg transition-all duration-700 ease-out"
              style={{
                top: `${busPoint.y}%`,
                left: `${busPoint.x}%`,
                transform: "translate(-50%, -50%)",
                background: step >= 2 ? "#22C55E" : "#3584E4",
                opacity: step >= 1 ? 1 : 0,
              }}
            >
              <Bus size={15} strokeWidth={2.5} />
            </div>

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
              <h2 className="font-editorial-serif font-medium text-2xl md:text-3xl tracking-tight text-white">
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
