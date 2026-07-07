"use client";

import { useEffect, useRef, useState } from "react";
import { Icons } from "@/components/icons";

export default function LoyaltyPerks() {
  const [inView, setInView] = useState(false);
  const [currentRides, setCurrentRides] = useState(0);
  const [completed, setCompleted] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);

  // Detect when section is visible
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setInView(true);
          obs.disconnect();
        }
      },
      { threshold: 0.3 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // Animate counter from 0 to 10 over 1.8 seconds
  useEffect(() => {
    if (!inView) return;
    const totalDuration = 1800;
    const steps = 10;
    const interval = totalDuration / steps;
    let count = 0;

    const timer = setInterval(() => {
      count++;
      setCurrentRides(count);
      if (count >= steps) {
        clearInterval(timer);
        setTimeout(() => setCompleted(true), 200);
      }
    }, interval);

    return () => clearInterval(timer);
  }, [inView]);

  const progressPct = (currentRides / 10) * 100;

  return (
    <section className="py-20 md:py-28 bg-[#F0F7FF] text-gray-900">
      <div className="max-w-7xl mx-auto px-5 md:px-8" ref={sectionRef}>
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <span className="text-xs font-semibold text-[#1A5FB4] uppercase tracking-widest">
              Commuter Perks
            </span>
            <h2 className="mt-3 text-3xl md:text-4xl font-extrabold tracking-tight">
              Ride More,
              <br />
              <span className="text-[#1A5FB4]">Earn Free Rides</span>
            </h2>
            <p className="mt-5 text-gray-500 leading-relaxed">
              Every paid ride is automatically tracked. Hit 10 rides and unlock a
              &ldquo;Free Ride&rdquo; voucher that fully waives your next fare. No
              manual claiming, no hassle — it just works.
            </p>

            {/* Progress bar with animated counter */}
            <div className="mt-6 flex items-center gap-4">
              <div className="flex-1">
                <div className="flex items-center justify-between text-sm mb-1.5">
                  <span className={`font-medium transition-colors duration-500 ${completed ? "text-green-600" : "text-gray-700"}`}>
                    {currentRides} / 10 rides
                  </span>
                  <span className={`font-semibold text-xs transition-all duration-500 ${completed ? "text-green-600" : "text-[#1A5FB4]"}`}>
                    {completed ? "Free ride unlocked!" : `${10 - currentRides} more to go`}
                  </span>
                </div>
                <div className="h-3 rounded-full bg-white border border-[#DAEEFF] overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-200 ease-out ${
                      completed
                        ? "bg-gradient-to-r from-green-400 to-green-500"
                        : "bg-gradient-to-r from-[#1A5FB4] to-[#3584E4]"
                    }`}
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
              </div>
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 transition-all duration-500 ${completed ? "bg-green-100 text-green-600 scale-110" : "bg-[#1A5FB4]/10 text-[#1A5FB4]"}`}>
                {completed ? (
                  <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                  </svg>
                ) : (
                  Icons.gift
                )}
              </div>
            </div>
          </div>

          {/* Voucher card */}
          <div className="flex justify-center">
            <div
              className={`w-80 bg-white rounded-2xl shadow-xl overflow-hidden border transition-all duration-700 ${
                completed
                  ? "shadow-green-200/60 border-green-300 scale-[1.02]"
                  : "shadow-gray-200/50 border-gray-100"
              }`}
            >
              <div className={`h-2 transition-all duration-700 ${completed ? "bg-gradient-to-r from-green-400 via-emerald-400 to-green-500" : "bg-gradient-to-r from-[#1A5FB4] via-[#3584E4] to-[#62A0EA]"}`} />
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Reward Voucher
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold transition-all duration-500 ${
                    completed
                      ? "bg-green-100 text-green-700"
                      : "bg-gray-100 text-gray-400"
                  }`}>
                    {completed ? "UNLOCKED" : "LOCKED"}
                  </span>
                </div>
                <div className={`text-3xl font-extrabold mb-1 transition-colors duration-500 ${completed ? "text-green-600" : "text-[#1A5FB4]"}`}>
                  Free Ride
                </div>
                <div className="text-sm text-gray-400 mb-4">
                  Valid for any CHATCO jeepney route
                </div>
                <div className="border-t border-dashed border-gray-200 pt-4 flex items-center justify-between">
                  <div className="text-[11px] text-gray-400">
                    Code:{" "}
                    <span className="font-mono font-bold text-gray-600">
                      FREE-10X-A7K2
                    </span>
                  </div>
                  <div className="text-[11px] text-gray-400">
                    Expires: Dec 31, 2025
                  </div>
                </div>

                {/* Celebration burst */}
                {completed && (
                  <div className="mt-4 flex items-center justify-center gap-2 animate-bounce-slow">
                    <span className="text-sm font-bold text-green-600">Your free ride is ready!</span>
                    <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                    </svg>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
