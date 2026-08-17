// components/landing/Hero.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";

// Shared by the visible dashed route and the marker's motion path — a single
// gentle S-curve standing in for the Calumpit–Meycauayan corridor. Not a map,
// just the idea of a line a jeepney travels, rendered the way the rest of
// the hero reasons in type and rule rather than illustration.
const ROUTE_D = "M 224 26 C 276 118, 92 156, 146 262 C 200 368, 54 402, 100 528";

export default function Hero() {
  const headerRef = useRef<HTMLElement>(null);
  const [reduceMotion, setReduceMotion] = useState(false);

  const mvX = useMotionValue(0);
  const mvY = useMotionValue(0);
  const springX = useSpring(mvX, { stiffness: 120, damping: 20, mass: 0.4 });
  const springY = useSpring(mvY, { stiffness: 120, damping: 20, mass: 0.4 });
  const rotateY = useTransform(springX, [-1, 1], [-3, 3]);
  const rotateX = useTransform(springY, [-1, 1], [3, -3]);

  useEffect(() => {
    setReduceMotion(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  const handleMouseMove = (e: React.MouseEvent<HTMLElement>) => {
    if (reduceMotion) return;
    const rect = headerRef.current?.getBoundingClientRect();
    if (!rect) return;
    mvX.set(((e.clientX - rect.left) / rect.width) * 2 - 1);
    mvY.set(((e.clientY - rect.top) / rect.height) * 2 - 1);
  };

  const handleMouseLeave = () => {
    mvX.set(0);
    mvY.set(0);
  };

  return (
    <header
      ref={headerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="relative overflow-hidden bg-[#071A2E] pt-32 pb-20 lg:py-24 lg:min-h-screen lg:flex lg:items-center"
      style={{ perspective: 1200 }}
    >
      {/* Faint structural texture only — no blurred color blobs or floating
          shapes; the composition does the work instead. */}
      <div
        className="absolute inset-0 opacity-[0.025] pointer-events-none"
        style={{ backgroundImage: "linear-gradient(rgba(255,255,255,.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.5) 1px, transparent 1px)", backgroundSize: "64px 64px" }}
      />

      <div className="relative z-10 w-full px-6 md:px-10 lg:px-16 xl:px-24 2xl:px-32">
        <div className="grid lg:grid-cols-[1.15fr_0.85fr] lg:gap-16 xl:gap-24 items-center">
          <motion.div
            style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            <h1 className="font-editorial-serif font-bold text-white leading-[0.98] tracking-tight text-5xl sm:text-6xl lg:text-7xl xl:text-8xl">
              The Future of <br />
              <span className="text-[#62A0EA]">Jeepney Rides.</span>
            </h1>

            <div className="mt-10 lg:mt-14 h-px w-24 bg-white/15" />

            <p className="mt-8 lg:mt-10 max-w-md text-lg text-white/50 leading-relaxed">
              Experience seamless commuting with real-time tracking, cashless QR payments, and smart safety features—all in your pocket.
            </p>

            <div className="mt-8 lg:mt-10 flex items-center gap-8 shrink-0">
              <a
                href="/signup"
                className="inline-flex items-center justify-center px-8 py-4 rounded-full text-base font-semibold bg-[#1A5FB4] text-white hover:bg-[#164A8F] transition-all shadow-xl shadow-[#1A5FB4]/30 hover:shadow-2xl hover:shadow-[#1A5FB4]/40"
              >
                Create Account
              </a>
              <a
                href="#features"
                className="group inline-flex items-center gap-2 text-base font-medium text-white/70 hover:text-white transition-colors"
              >
                Learn more
                <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                </svg>
              </a>
            </div>

            {/* Editorial dateline — the real, confirmed pilot corridor
                (PRODUCT.md), grounding the composition in an actual place
                instead of a generic route graphic. */}
            <div className="mt-16 lg:mt-20 flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.2em] text-white/30">
              <span>Calumpit</span>
              <span className="w-8 h-px bg-white/15" />
              <span>Meycauayan</span>
              <span className="hidden sm:inline text-white/15">— Bulacan, Philippines</span>
            </div>
          </motion.div>

          {/* The visual counterweight to the headline — the corridor as a
              live line, not a map screenshot: a jeepney's actual, continuous
              back-and-forth between two real stops. A soft glow and a giant
              quiet word (the same device HowItWorks uses for its step
              numerals) give the line somewhere to sit instead of floating in
              raw negative space. */}
          <motion.div
            aria-hidden
            className="hidden lg:block relative h-[62vh] max-h-155"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 0.3, ease: "easeOut" }}
          >
            <div className="absolute -inset-16 rounded-full bg-[#1A5FB4]/15 blur-[140px]" />

            <span
              className="absolute right-[-8%] top-1/2 -translate-y-1/2 font-editorial-serif font-medium text-white/5 leading-none select-none pointer-events-none whitespace-nowrap"
              style={{ fontSize: "clamp(9rem, 17vw, 17rem)" }}
            >
              Mobility
            </span>

            <svg viewBox="0 0 300 560" className="absolute inset-0 w-full h-full overflow-visible" fill="none">
              <defs>
                <linearGradient id="hero-route-grad" x1="224" y1="26" x2="100" y2="528" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="white" stopOpacity="0.12" />
                  <stop offset="100%" stopColor="#62A0EA" stopOpacity="0.55" />
                </linearGradient>
              </defs>

              <path d={ROUTE_D} stroke="url(#hero-route-grad)" strokeWidth="2" strokeDasharray="1.5 8" strokeLinecap="round" />

              {/* waypoint ticks — rhythm along the line, no fabricated stop names */}
              <circle cx="176" cy="112" r="2" fill="white" fillOpacity="0.25" />
              <circle cx="132" cy="300" r="2" fill="white" fillOpacity="0.25" />
              <circle cx="82" cy="430" r="2" fill="white" fillOpacity="0.25" />

              <circle cx="224" cy="26" r="3.5" fill="white" fillOpacity="0.35" />
              <circle cx="100" cy="528" r="4" fill="#62A0EA" />
              <circle cx="100" cy="528" r="4" fill="#62A0EA" fillOpacity="0.4">
                <animate attributeName="r" values="4;13;4" dur="2.6s" repeatCount="indefinite" />
                <animate attributeName="fill-opacity" values="0.4;0;0.4" dur="2.6s" repeatCount="indefinite" />
              </circle>

              <text x="234" y="22" fill="white" fillOpacity="0.3" fontSize="10" fontFamily="var(--font-editorial-sans)" letterSpacing="0.08em">CALUMPIT</text>
              <text x="60" y="552" fill="#99C1F1" fontSize="10" fontFamily="var(--font-editorial-sans)" letterSpacing="0.08em" fontWeight="600">MEYCAUAYAN</text>

              {!reduceMotion && (
                <>
                  <circle r="11" fill="#62A0EA" fillOpacity="0.35" style={{ filter: "blur(4px)" }}>
                    <animateMotion path={ROUTE_D} dur="10s" repeatCount="indefinite" keyPoints="0;1;0" keyTimes="0;0.5;1" calcMode="linear" />
                  </circle>
                  <circle r="5.5" fill="#62A0EA" style={{ filter: "drop-shadow(0 0 8px #62A0EAcc)" }}>
                    <animateMotion path={ROUTE_D} dur="10s" repeatCount="indefinite" keyPoints="0;1;0" keyTimes="0;0.5;1" calcMode="linear" />
                  </circle>
                </>
              )}
            </svg>
          </motion.div>
        </div>
      </div>
    </header>
  );
}
