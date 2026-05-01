"use client";

import { useEffect, useRef, useState, useCallback } from "react";

export default function HowItWorks() {
  const steps = [
    { step: "01", title: "Load Your Wallet", desc: "Create your commuter account and top up your digital wallet via GCash or over-the-counter loading. Your unique QR code is generated instantly — works offline." },
    { step: "02", title: "Ride & Scan", desc: "Board the jeepney, show your QR code to the Conductor. They scan it, input the fare, and payment is deducted — even without signal. Pending transactions auto-sync later." },
    { step: "03", title: "Track & Arrive", desc: "Follow your jeepney in real-time on the map. Share your ride with family for safety. Receive a digital receipt instantly after every cashless trip." },
  ];

  const [revealed, setRevealed] = useState([false, false, false]);
  const sectionRef = useRef<HTMLElement>(null);
  const revealedRef = useRef([false, false, false]);

  const checkPositions = useCallback(() => {
    const section = sectionRef.current;
    if (!section) return;

    const rect = section.getBoundingClientRect();
    const viewportCenter = window.innerHeight / 2;

    // How far the section top has scrolled ABOVE the viewport center
    // Positive = section top is above center (user has scrolled past it)
    const scrollPast = viewportCenter - rect.top;

    // Step 1: as soon as section top reaches viewport center
    // Step 2: needs ~250px more scrolling
    // Step 3: needs ~500px more scrolling
    const thresholds = [0, 250, 500];

    thresholds.forEach((threshold, idx) => {
      if (!revealedRef.current[idx] && scrollPast > threshold) {
        revealedRef.current[idx] = true;
        setRevealed((prev) => {
          const next = [...prev];
          next[idx] = true;
          return next;
        });
      }
    });
  }, []);

  useEffect(() => {
    window.addEventListener("scroll", checkPositions, { passive: true });
    checkPositions();
    return () => window.removeEventListener("scroll", checkPositions);
  }, [checkPositions]);

  return (
    <section id="how-it-works" ref={sectionRef} className="py-20 md:py-28 bg-white text-gray-900">
      <div className="max-w-7xl mx-auto px-5 md:px-8">
        <div className="text-center mb-14">
          <span className="text-xs font-semibold text-[#1A5FB4] uppercase tracking-widest">How It Works</span>
          <h2 className="mt-3 text-3xl md:text-4xl font-extrabold tracking-tight">Three Steps to Smarter Commuting</h2>
        </div>
        <div className="relative grid md:grid-cols-3 gap-8">
          <div className="hidden md:block absolute top-12 left-[20%] right-[20%] h-[2px] bg-gradient-to-r from-[#DAEEFF] via-[#1A5FB4]/30 to-[#DAEEFF]" />
          {steps.map((s, idx) => (
            <div
              key={s.step}
              className="relative text-center"
            >
              <div
                className={`inline-flex items-center justify-center w-24 h-24 rounded-2xl mb-5 transition-all duration-700 ease-out ${
                  revealed[idx]
                    ? "bg-green-50 border-2 border-green-400 scale-110 shadow-lg shadow-green-200/50"
                    : "bg-[#F0F7FF] border border-[#DAEEFF]"
                }`}
              >
                {revealed[idx] ? (
                  <svg
                    className="w-10 h-10 text-green-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={3}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                  </svg>
                ) : (
                  <span className="text-3xl font-extrabold text-[#1A5FB4]">{s.step}</span>
                )}
              </div>
              <h3 className={`text-lg font-bold mb-2 transition-colors duration-500 ${revealed[idx] ? "text-green-700" : ""}`}>{s.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed max-w-xs mx-auto">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}