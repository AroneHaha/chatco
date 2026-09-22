"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Bus, Check, Gift, RotateCcw } from "lucide-react";

const GOAL = 10;
// The sample card opens part-way filled so a visitor is a few taps from the reward.
const START = 7;

export default function LoyaltyPerks() {
  const [rides, setRides] = useState(START);
  const reduce = useReducedMotion();
  const completed = rides >= GOAL;

  return (
    <section className="py-20 md:py-28 bg-[#F0F7FF] text-gray-900">
      <div className="max-w-7xl mx-auto px-5 md:px-8 grid lg:grid-cols-[1fr_1.15fr] gap-12 lg:gap-20 items-center">
        <div>
          <h2 className="font-sans font-bold text-3xl sm:text-4xl md:text-5xl tracking-tight leading-[1.05]">
            Ride ten times. <br />
            Ride free once.
          </h2>
          <p className="mt-6 max-w-md text-lg text-gray-500 leading-relaxed">
            Every paid ride is tracked automatically. At 10 rides a Free Ride voucher waives your next fare, with no
            claiming and no forms.
          </p>

          <button
            type="button"
            onClick={() => setRides((r) => (r >= GOAL ? START : r + 1))}
            className="mt-8 inline-flex items-center gap-2 rounded-full bg-[#1A5FB4] px-7 py-3.5 text-base font-semibold text-white shadow-lg shadow-[#1A5FB4]/25 transition-colors hover:bg-[#164A8F] active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#1A5FB4]"
          >
            {completed ? <RotateCcw size={17} /> : <Bus size={17} />}
            {completed ? "Start a new card" : "Take a ride"}
          </button>
          <p className="mt-3 text-sm text-gray-400">Tap to add a ride to the sample card.</p>
        </div>

        <div>
          <div className="rounded-3xl bg-white border border-[#DAEEFF] shadow-xl shadow-[#1A5FB4]/5 p-6 md:p-8">
            <div className="flex items-baseline justify-between gap-4">
              <p className="font-sans text-5xl md:text-6xl font-bold tracking-tight tabular-nums leading-none">
                {rides}
                <span className="text-2xl text-gray-400"> / {GOAL}</span>
              </p>
              <p className={`text-sm font-semibold ${completed ? "text-green-600" : "text-[#1A5FB4]"}`} aria-live="polite">
                {completed ? "Free ride unlocked" : `${GOAL - rides} more to go`}
              </p>
            </div>

            <div className="mt-7 grid grid-cols-5 gap-3 md:gap-4">
              {Array.from({ length: GOAL }).map((_, i) => {
                const filled = i < rides;
                return (
                  <div
                    key={i}
                    className={`relative aspect-square rounded-full flex items-center justify-center border-2 transition-colors duration-300 ${
                      filled ? "border-transparent bg-[#1A5FB4] text-white" : "border-dashed border-[#C9DDF5] text-[#C9DDF5]"
                    }`}
                  >
                    {filled ? (
                      <motion.span
                        key={`stamp-${i}`}
                        initial={reduce ? false : { scale: 0.3, rotate: -20, opacity: 0 }}
                        animate={{ scale: 1, rotate: 0, opacity: 1 }}
                        transition={{ type: "spring", stiffness: 420, damping: 16 }}
                      >
                        <Check size={20} strokeWidth={3} />
                      </motion.span>
                    ) : (
                      <Bus size={18} />
                    )}
                  </div>
                );
              })}
            </div>

            <div className="mt-7 h-1.5 rounded-full bg-[#F0F7FF] overflow-hidden">
              <div className="h-full rounded-full bg-[#1A5FB4] transition-[width] duration-500 ease-out" style={{ width: `${(rides / GOAL) * 100}%` }} />
            </div>
          </div>

          <div className={`grid transition-all duration-500 ease-out ${completed ? "grid-rows-[1fr] opacity-100 mt-4" : "grid-rows-[0fr] opacity-0 mt-0"}`}>
            <div className="overflow-hidden">
              <div className="rounded-2xl bg-white border border-green-200 shadow-lg shadow-green-100 p-5 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-green-100 text-green-600 flex items-center justify-center shrink-0">
                  <Gift size={22} />
                </div>
                <div>
                  <p className="text-sm font-bold text-green-700">Free Ride voucher ready</p>
                  <p className="text-xs text-gray-500 mt-0.5">Valid for 3 days after you unlock it</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
