"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Hand, QrCode, MapPin, Bus } from "lucide-react";

export const QR = [1,1,1,0,1,1,1, 1,0,1,1,0,0,1, 1,1,1,0,1,1,1, 0,0,0,1,0,1,0, 1,1,0,0,1,0,1, 1,0,1,1,0,1,1, 1,1,1,0,1,0,1];

type Step = {
  step: string;
  title: string;
  desc: string;
  accent: string;
  icon: typeof Hand;
};

const STEPS: Step[] = [
  {
    step: "01",
    title: "Open & Hail",
    desc: "Open CHATCO and tap Hail Me to alert nearby conductors. Your location is sent automatically — no need to flag down a jeep manually.",
    accent: "#3584E4",
    icon: Hand,
  },
  {
    step: "02",
    title: "Show & Pay",
    desc: "Board the jeepney and show your QR to the conductor. They scan it, pick your stops, and fare is paid directly via GCash — no WiFi needed on your end.",
    accent: "#3584E4",
    icon: QrCode,
  },
  {
    step: "03",
    title: "Track & Arrive",
    desc: "Follow your jeepney in real-time on the map. Share your ride with family for safety, and get a digital receipt instantly after every cashless trip.",
    accent: "#22C55E",
    icon: MapPin,
  },
];

/* Illustrations shared by the three steps. */

function HailVisual() {
  return (
    <div className="relative w-full aspect-4/3 min-h-60 rounded-2xl bg-[#F0F7FF] border border-white/10 overflow-hidden">
      <div className="absolute inset-0 opacity-30" style={{ backgroundImage: "linear-gradient(#1A5FB4 1px, transparent 1px), linear-gradient(90deg, #1A5FB4 1px, transparent 1px)", backgroundSize: "30px 30px" }} />
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2">
        <span className="block w-5 h-5 rounded-full bg-[#1A5FB4] border-4 border-white shadow-lg shadow-[#1A5FB4]/40" />
        <span className="absolute inset-0 -m-3 rounded-full bg-[#1A5FB4]/20 motion-safe:animate-ping" />
      </div>
      <div className="absolute bottom-9 left-1/2 -translate-x-1/2 w-[72%]">
        <div className="relative flex items-center justify-center gap-2 px-6 py-4 rounded-2xl bg-[#1A5FB4] text-white font-bold shadow-xl shadow-[#1A5FB4]/40">
          <Hand size={18} /> Hail Me
          <span className="absolute inset-0 rounded-2xl ring-4 ring-[#1A5FB4]/30 motion-safe:animate-pulse" />
        </div>
      </div>
    </div>
  );
}

function PayVisual() {
  return (
    <div className="relative w-full aspect-4/3 min-h-60 rounded-2xl bg-white/[0.04] border border-white/15 overflow-hidden flex items-center justify-center p-6">
      <div className="text-center">
        <div className="mx-auto grid grid-cols-7 gap-0.5 w-24 h-24 p-2 bg-white rounded-xl shadow-xl">
          {QR.map((v, i) => (
            <div key={i} className={`rounded-[1px] ${v ? "bg-[#071A2E]" : "bg-gray-100"}`} />
          ))}
        </div>
        <div className="mt-4 flex items-center justify-center gap-2">
          <span className="text-white/50 text-xs uppercase tracking-widest">Fare to pay</span>
          <span className="rounded-full bg-white/10 px-2 py-1 text-[10px] font-semibold text-white/70">GCash</span>
        </div>
        <div className="text-white font-extrabold text-3xl mt-1">₱13.00</div>
        <div className="mt-1 text-[#62A0EA] text-xs font-medium">Calumpit → Meycauayan</div>
      </div>
    </div>
  );
}

function TrackVisual() {
  return (
    <div className="relative w-full aspect-4/3 min-h-60 rounded-2xl bg-[#EAF7EE] border border-white/10 overflow-hidden">
      <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "linear-gradient(#22C55E 1px, transparent 1px), linear-gradient(90deg, #22C55E 1px, transparent 1px)", backgroundSize: "30px 30px" }} />
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
        <path d="M12,80 C35,70 40,35 60,32 S85,20 90,14" fill="none" stroke="#22C55E" strokeWidth="1.5" strokeDasharray="3 3" strokeLinecap="round" opacity="0.7" />
      </svg>
      <span className="absolute left-[12%] top-[80%] w-3 h-3 rounded-full bg-white border-2 border-[#22C55E]" />
      <div className="absolute left-[58%] top-[30%] -translate-x-1/2 -translate-y-1/2">
        <span className="flex w-6 h-6 rounded-lg bg-[#22C55E] shadow-lg shadow-green-500/40 items-center justify-center text-white">
          <Bus size={13} strokeWidth={2.5} />
        </span>
        <span className="absolute inset-0 -m-2 rounded-full bg-green-500/20 motion-safe:animate-ping" />
      </div>
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-[82%] bg-white rounded-2xl shadow-xl p-3 flex items-center justify-between border border-green-100">
        <div className="flex items-center gap-2">
          <span className="w-8 h-8 rounded-lg bg-green-50 text-green-600 flex items-center justify-center">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>
          </span>
          <div>
            <p className="text-[10px] font-bold text-gray-800">Payment Success</p>
            <p className="text-[10px] text-gray-400">Digital receipt sent</p>
          </div>
        </div>
        <span className="text-sm font-extrabold text-gray-900">₱13.00</span>
      </div>
    </div>
  );
}

function StepVisual({ index }: { index: number }) {
  if (index === 0) return <HailVisual />;
  if (index === 1) return <PayVisual />;
  return <TrackVisual />;
}

export default function HowItWorks() {
  const reduce = useReducedMotion();

  return (
    <section
      id="how-it-works"
      aria-labelledby="how-it-works-heading"
      className="overflow-x-clip bg-[#0C2A52] py-20 text-white md:py-28"
    >
      <div className="mx-auto max-w-7xl px-5 md:px-8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: reduce ? 0 : 0.5 }}
          className="mx-auto max-w-2xl text-center motion-reduce:opacity-100! motion-reduce:transform-none!"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[#62A0EA]">
            How It Works
          </p>
          <h2
            id="how-it-works-heading"
            className="mt-5 font-sans text-3xl font-bold leading-[1.1] tracking-tight sm:text-4xl md:text-5xl"
          >
            Three steps to smarter commuting
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-white/60 md:text-lg">
            From your first hail to your final stop, a simpler ride with CHATCO.
          </p>
        </motion.div>

        <ol className="mt-12 grid gap-12 md:mt-16 md:grid-cols-3 md:gap-6 lg:gap-8">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            return (
              <motion.li
                key={s.step}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: reduce ? 0 : 0.5, delay: reduce ? 0 : i * 0.12 }}
                className="min-w-0 motion-reduce:opacity-100! motion-reduce:transform-none!"
              >
                <div aria-hidden="true">
                  <StepVisual index={i} />
                </div>
                <div className="relative mt-7 flex h-11 items-center justify-center">
                  {i < STEPS.length - 1 && (
                    <div aria-hidden="true" className="absolute inset-y-0 left-1/2 hidden w-[calc(100%+1.5rem)] items-center md:flex lg:w-[calc(100%+2rem)]">
                      <div className="relative h-px w-full bg-white/15">
                        <motion.div
                          initial={{ scaleX: 0 }}
                          whileInView={{ scaleX: 1 }}
                          viewport={{ once: true, amount: 0.5 }}
                          transition={{ duration: reduce ? 0 : 0.8, delay: reduce ? 0 : 0.3 + i * 0.2, ease: "easeOut" }}
                          className="absolute inset-0 origin-left bg-[#62A0EA]/70 motion-reduce:transform-none!"
                        />
                      </div>
                    </div>
                  )}
                  <span
                    aria-hidden="true"
                    className="relative z-10 grid h-11 w-11 place-items-center rounded-full border bg-[#0C2A52] text-sm font-bold tabular-nums"
                    style={{ borderColor: s.accent, color: s.accent }}
                  >
                    {s.step}
                  </span>
                </div>
                <h3 className="mt-5 flex items-center justify-center gap-3 text-center font-sans text-2xl font-bold tracking-tight">
                  <Icon aria-hidden="true" size={20} className="shrink-0" style={{ color: s.accent }} />
                  {s.title}
                </h3>
                <p className="mt-3 text-center text-sm leading-relaxed text-white/65 lg:text-base">
                  {s.desc}
                </p>
              </motion.li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
