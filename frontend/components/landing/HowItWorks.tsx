"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { useRef, useState } from "react";
import { Hand, QrCode, MapPin, MousePointer2, Bus } from "lucide-react";

gsap.registerPlugin(ScrollTrigger, useGSAP);

const QR = [1,1,1,0,1,1,1, 1,0,1,1,0,0,1, 1,1,1,0,1,1,1, 0,0,0,1,0,1,0, 1,1,0,0,1,0,1, 1,0,1,1,0,1,1, 1,1,1,0,1,0,1];

type Step = {
  step: string;
  title: string;
  short: string;
  desc: string;
  accent: string;
  icon: typeof Hand;
};

const STEPS: Step[] = [
  {
    step: "01",
    title: "Open & Hail",
    short: "Hail",
    desc: "Open CHATCO and tap Hail Me to alert nearby conductors. Your location is sent automatically — no need to flag down a jeep manually.",
    accent: "#3584E4",
    icon: Hand,
  },
  {
    step: "02",
    title: "Show & Pay",
    short: "Pay",
    desc: "Board the jeepney and show your QR to the conductor. They scan it, pick your stops, and fare is paid directly via GCash — no WiFi needed on your end.",
    accent: "#3584E4",
    icon: QrCode,
  },
  {
    step: "03",
    title: "Track & Arrive",
    short: "Arrive",
    desc: "Follow your jeepney in real-time on the map. Share your ride with family for safety, and get a digital receipt instantly after every cashless trip.",
    accent: "#22C55E",
    icon: MapPin,
  },
];

/* ── Per-step illustrative visuals (float as screens on the navy stage) ─ */

function HailVisual() {
  return (
    <div className="relative w-full aspect-square max-w-[420px] rounded-[2rem] bg-[#F0F7FF] border border-white/10 overflow-hidden shadow-2xl shadow-black/40">
      <div className="absolute inset-0 opacity-30" style={{ backgroundImage: "linear-gradient(#1A5FB4 1px, transparent 1px), linear-gradient(90deg, #1A5FB4 1px, transparent 1px)", backgroundSize: "30px 30px" }} />
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2">
        <span className="block w-5 h-5 rounded-full bg-[#1A5FB4] border-4 border-white shadow-lg shadow-[#1A5FB4]/40" />
        <span className="absolute inset-0 -m-3 rounded-full bg-[#1A5FB4]/20 animate-ping" />
      </div>
      <div className="absolute bottom-9 left-1/2 -translate-x-1/2 w-[72%]">
        <div className="relative flex items-center justify-center gap-2 px-6 py-4 rounded-2xl bg-[#1A5FB4] text-white font-bold shadow-xl shadow-[#1A5FB4]/40">
          <Hand size={18} /> Hail Me
          <span className="absolute inset-0 rounded-2xl ring-4 ring-[#1A5FB4]/30 animate-pulse" />
        </div>
      </div>
    </div>
  );
}

function PayVisual() {
  return (
    <div className="relative w-full aspect-square max-w-[420px] rounded-[2rem] bg-white/[0.04] border border-white/15 overflow-hidden shadow-2xl shadow-black/40 backdrop-blur-sm flex items-center justify-center p-8">
      <div className="absolute top-6 right-6 px-3 py-1.5 rounded-full bg-white/10 text-[10px] font-semibold text-white/70">GCash</div>
      <div className="text-center">
        <div className="mx-auto grid grid-cols-7 gap-[3px] w-40 h-40 p-3 bg-white rounded-2xl shadow-2xl">
          {QR.map((v, i) => (
            <div key={i} className={`rounded-[1px] ${v ? "bg-[#071A2E]" : "bg-gray-100"}`} />
          ))}
        </div>
        <div className="mt-6 text-white/40 text-xs uppercase tracking-widest">Fare to pay</div>
        <div className="text-white font-extrabold text-4xl mt-1">₱13.00</div>
        <div className="mt-1 text-[#62A0EA] text-xs font-medium">Calumpit → Meycauayan</div>
      </div>
    </div>
  );
}

function TrackVisual() {
  return (
    <div className="relative w-full aspect-square max-w-[420px] rounded-[2rem] bg-[#EAF7EE] border border-white/10 overflow-hidden shadow-2xl shadow-black/40">
      <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "linear-gradient(#22C55E 1px, transparent 1px), linear-gradient(90deg, #22C55E 1px, transparent 1px)", backgroundSize: "30px 30px" }} />
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
        <path d="M12,80 C35,70 40,35 60,32 S85,20 90,14" fill="none" stroke="#22C55E" strokeWidth="1.5" strokeDasharray="3 3" strokeLinecap="round" opacity="0.7" />
      </svg>
      <span className="absolute left-[12%] top-[80%] w-3 h-3 rounded-full bg-white border-2 border-[#22C55E]" />
      <div className="absolute left-[58%] top-[30%] -translate-x-1/2 -translate-y-1/2">
        <span className="flex w-6 h-6 rounded-lg bg-[#22C55E] shadow-lg shadow-green-500/40 items-center justify-center text-white">
          <Bus size={13} strokeWidth={2.5} />
        </span>
        <span className="absolute inset-0 -m-2 rounded-full bg-green-500/20 animate-ping" />
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

/* ── Shared panel content (used in both pinned + stacked layouts) ──── */

function StepInner({ s, index }: { s: Step; index: number }) {
  const Icon = s.icon;
  return (
    <div className="mx-auto w-full max-w-6xl px-6 md:px-10 grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
      {/* Text */}
      <div className="order-2 lg:order-1">
        <div className="inline-flex items-center gap-3">
          <span
            className="grid place-items-center w-12 h-12 rounded-xl shrink-0"
            style={{ color: s.accent, background: `${s.accent}22`, boxShadow: `0 0 32px ${s.accent}33` }}
          >
            <Icon size={22} />
          </span>
          <span className="text-sm font-bold uppercase tracking-[0.3em]" style={{ color: s.accent }}>
            Step {s.step}
          </span>
        </div>
        <h3 className="mt-7 font-editorial-serif font-medium text-4xl md:text-5xl xl:text-6xl tracking-tight text-white leading-[1.05]">
          {s.title}
        </h3>
        <span className="mt-6 block h-1 w-16 rounded-full" style={{ background: s.accent }} />
        <p className="mt-7 text-base md:text-lg text-white/55 leading-relaxed max-w-md">
          {s.desc}
        </p>
      </div>
      {/* Visual with accent glow */}
      <div className="order-1 lg:order-2 flex justify-center lg:justify-end">
        <div className="relative w-full max-w-105">
          <div
            className="absolute -inset-8 rounded-full blur-3xl opacity-60"
            style={{ background: `radial-gradient(circle, ${s.accent}55, transparent 70%)` }}
          />
          <StepVisual index={index} />
        </div>
      </div>
    </div>
  );
}

/* ── Component ─────────────────────────────────────────────────────── */

export default function HowItWorks() {
  const stageRef = useRef<HTMLDivElement>(null);
  const panelsRef = useRef<HTMLDivElement[]>([]);
  const [active, setActive] = useState(0);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(min-width: 1024px) and (prefers-reduced-motion: no-preference)", () => {
        const panels = panelsRef.current.filter(Boolean);
        if (panels.length === 0) return;

        gsap.set(panels, { autoAlpha: 0, yPercent: 6 });
        gsap.set(panels[0], { autoAlpha: 1, yPercent: 0 });

        const steps = panels.length - 1;
        let index = 0;
        let anim: gsap.core.Timeline | null = null;

        const go = (target: number) => {
          if (target === index) return;
          const dir = target > index ? 1 : -1;
          const from = index;
          index = target;
          setActive(target);

          anim?.kill();
          panels.forEach((p, i) => {
            if (i !== from && i !== target) gsap.set(p, { autoAlpha: 0 });
          });
          if (gsap.getProperty(panels[target], "opacity") === 0) {
            gsap.set(panels[target], { yPercent: 6 * dir });
          }
          anim = gsap
            .timeline()
            .to(panels[from], { autoAlpha: 0, yPercent: -6 * dir, duration: 0.4, ease: "power3.inOut" }, 0)
            .to(panels[target], { autoAlpha: 1, yPercent: 0, duration: 0.4, ease: "power3.inOut" }, 0);
        };

        const st = ScrollTrigger.create({
          trigger: stageRef.current,
          start: "top top",
          end: () => "+=" + window.innerHeight * steps * 0.9,
          pin: true,
          anticipatePin: 1,
          invalidateOnRefresh: true,
          snap: {
            snapTo: 1 / steps,
            duration: { min: 0.15, max: 0.3 },
            ease: "power2.inOut",
          },
          onUpdate: (self) => {
            const target = Math.max(0, Math.min(steps, Math.round(self.progress * steps)));
            go(target);
          },
        });

        return () => {
          st.kill();
          anim?.kill();
        };
      });
    },
    { scope: stageRef }
  );

  const activeAccent = STEPS[active].accent;

  return (
    <section id="how-it-works" className="relative bg-[#0C2A52] text-white">
      {/* ── Desktop: pinned sequential showcase (motion-safe only) ── */}
      <div ref={stageRef} className="hidden motion-safe:lg:block relative h-screen overflow-hidden">
        {/* A brighter, more saturated blue than the Hero's deep navy — same
            family, clearly a different room. The active step's own color
            still lights the stage as a spotlight, and the edges fall back
            to this base tone rather than to black. No grid texture either;
            that pattern stays the Hero's signature. */}
        <div
          className="absolute inset-0 transition-[background] duration-700"
          style={{ background: `radial-gradient(ellipse 70% 60% at 78% 45%, ${activeAccent}55 0%, transparent 60%)` }}
        />
        <div
          className="absolute inset-0 opacity-70"
          style={{ background: "radial-gradient(ellipse 90% 70% at 50% 50%, transparent 40%, #0C2A52 100%)" }}
        />

        {/* top bar: kicker/title + counter */}
        <div className="absolute top-0 inset-x-0 z-20 flex items-center justify-between max-w-6xl mx-auto px-10 pt-28">
          <h2 className="font-editorial-serif font-medium text-2xl tracking-tight">Three steps to smarter commuting</h2>
          <span className="font-extrabold tabular-nums text-lg">
            <span style={{ color: activeAccent }}>{STEPS[active].step}</span>
            <span className="text-white/25"> / {String(STEPS.length).padStart(2, "0")}</span>
          </span>
        </div>

        {/* giant ghost step number watermark */}
        {STEPS.map((s, i) => (
          <span
            key={`ghost-${s.step}`}
            aria-hidden
            className="pointer-events-none absolute right-[-3%] top-1/2 -translate-y-1/2 font-black leading-none select-none transition-opacity duration-500 text-[30rem]"
            style={{ color: s.accent, opacity: i === active ? 0.07 : 0 }}
          >
            {s.step}
          </span>
        ))}

        {/* panels */}
        {STEPS.map((s, i) => (
          <div
            key={s.step}
            ref={(el) => {
              if (el) panelsRef.current[i] = el;
            }}
            className={`absolute inset-0 flex items-center ${i === 0 ? "opacity-100 visible" : "opacity-0 invisible"}`}
          >
            <StepInner s={s} index={i} />
          </div>
        ))}

        {/* bottom segmented step-nav */}
        <div className="absolute bottom-9 inset-x-0 z-20 flex justify-center">
          <div className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 backdrop-blur-md p-1.5">
            {STEPS.map((s, i) => {
              const on = i === active;
              return (
                <div
                  key={s.step}
                  className="flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-all duration-500"
                  style={
                    on
                      ? { background: s.accent, color: "#fff", boxShadow: `0 6px 20px ${s.accent}55` }
                      : { color: "rgba(255,255,255,0.45)" }
                  }
                >
                  <span className="tabular-nums text-xs opacity-70">{s.step}</span>
                  {s.title}
                </div>
              );
            })}
          </div>
        </div>

        {/* scroll hint */}
        <div className="absolute bottom-11 right-10 xl:right-16 z-20 hidden xl:flex items-center gap-2 text-xs uppercase tracking-widest text-white/40 font-semibold">
          <MousePointer2 size={14} className="text-white/50" /> Scroll to explore
        </div>
      </div>

      {/* ── Mobile + reduced-motion: stacked ── */}
      <div className="motion-safe:lg:hidden py-20 md:py-28">
        <div className="text-center px-6">
          <span className="text-xs font-semibold uppercase tracking-[0.3em] text-white/50">How It Works</span>
          <h2 className="mt-3 font-editorial-serif font-medium text-3xl md:text-4xl tracking-tight">Three steps to smarter commuting</h2>
        </div>
        <div className="mt-16 space-y-24">
          {STEPS.map((s, i) => (
            <StepInner key={s.step} s={s} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
