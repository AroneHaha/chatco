"use client";

import { useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { Bus, Check } from "lucide-react";
import { Icons } from "@/components/icons";

gsap.registerPlugin(ScrollTrigger, useGSAP);

const GOAL = 10;

export default function LoyaltyPerks() {
  const [rides, setRides] = useState(0);
  const cardRef = useRef<HTMLDivElement>(null);
  const completed = rides >= GOAL;

  useGSAP(
    () => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        setRides(GOAL);
        return;
      }

      const st = ScrollTrigger.create({
        trigger: cardRef.current,
        start: "top 85%",
        end: "bottom 55%",
        scrub: 0.4,
        onUpdate: (self) => setRides(Math.round(self.progress * GOAL)),
      });

      return () => st.kill();
    },
    { scope: cardRef }
  );

  return (
    <section className="py-20 md:py-28 bg-[#F0F7FF] text-gray-900">
      <div className="max-w-5xl mx-auto px-5 md:px-8 text-center">
        <h2 className="font-editorial-serif font-medium text-3xl md:text-4xl tracking-tight">
          Ride More, <span className="text-[#1A5FB4]">Earn Free Rides</span>
        </h2>
        <p className="mt-4 max-w-xl mx-auto text-gray-500 leading-relaxed">
          Every paid ride is automatically tracked. Hit 10 rides and unlock a
          &ldquo;Free Ride&rdquo; voucher that fully waives your next fare — no manual
          claiming. Scroll to watch it fill up.
        </p>

        {/* Punch card */}
        <div ref={cardRef} className="mt-12 mx-auto max-w-2xl rounded-4xl bg-white border border-[#DAEEFF] shadow-xl shadow-[#1A5FB4]/5 p-6 md:p-8">
          <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-gray-400">
            <span>CHATCO Ride Pass</span>
            <span className={completed ? "text-green-600" : "text-[#1A5FB4]"}>
              {completed ? "Free ride unlocked!" : `${GOAL - rides} more to go`}
            </span>
          </div>

          <div className="mt-5 grid grid-cols-5 sm:grid-cols-10 gap-2.5 md:gap-3">
            {Array.from({ length: GOAL }).map((_, i) => {
              const filled = i < rides;
              return (
                <div
                  key={i}
                  className={`aspect-square rounded-full border-2 border-dashed flex items-center justify-center transition-all duration-300 ${
                    filled
                      ? "border-transparent bg-linear-to-br from-[#1A5FB4] to-[#3584E4] text-white scale-100 shadow-md shadow-[#1A5FB4]/30"
                      : "border-[#DAEEFF] text-[#DAEEFF] scale-95"
                  }`}
                >
                  {filled ? <Check size={16} strokeWidth={3} /> : <Bus size={15} />}
                </div>
              );
            })}
          </div>

          <div className="mt-6">
            <div className="h-1.5 rounded-full bg-[#F0F7FF] overflow-hidden">
              <div
                className="h-full rounded-full bg-linear-to-r from-[#1A5FB4] to-[#3584E4] transition-all duration-300 ease-out"
                style={{ width: `${(rides / GOAL) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* Voucher reveal */}
        <div
          className={`mx-auto mt-6 max-w-sm overflow-hidden transition-all duration-500 ease-out ${
            completed ? "max-h-40 opacity-100 translate-y-0" : "max-h-0 opacity-0 translate-y-3"
          }`}
        >
          <div className="rounded-2xl bg-white border border-green-200 shadow-lg shadow-green-100 p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-green-100 text-green-600 flex items-center justify-center shrink-0">
              {Icons.gift}
            </div>
            <div className="text-left">
              <p className="text-sm font-bold text-green-700">Free Ride voucher ready</p>
              <p className="text-xs text-gray-400 mt-0.5">Code FREE-10X-A7K2 · Valid 3 days after unlock</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
