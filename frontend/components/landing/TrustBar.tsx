"use client";

import { WifiOff, BadgeCheck, Layers, type LucideIcon } from "lucide-react";

type Item = { icon: LucideIcon; label: string; sub: string };

const ITEMS: Item[] = [
  { icon: WifiOff, label: "No WiFi Needed", sub: "QR works without internet" },
  { icon: BadgeCheck, label: "LTFRB Compliant", sub: "Accurate fare rates" },
  { icon: Layers, label: "3 Platforms", sub: "Commuter · Conductor · Admin" },
];

export default function TrustBar() {
  const loop = [...ITEMS, ...ITEMS, ...ITEMS, ...ITEMS];

  return (
    <section className="relative bg-[#F0F7FF] border-y border-[#DAEEFF] overflow-hidden">
      <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-16 md:w-32 z-10 bg-linear-to-r from-[#F0F7FF] to-transparent" />
      <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-16 md:w-32 z-10 bg-linear-to-l from-[#F0F7FF] to-transparent" />

      <div className="group py-6 overflow-hidden">
        <div className="flex w-max items-center gap-10 md:gap-14 ticker-track motion-reduce:animate-none group-hover:[animation-play-state:paused]">
          {loop.map((t, i) => {
            const Icon = t.icon;
            return (
              <div key={i} className="flex items-center gap-10 md:gap-14 shrink-0">
                <div className="flex items-center gap-3 shrink-0">
                  <span className="w-8 h-8 rounded-lg bg-[#1A5FB4]/10 text-[#1A5FB4] flex items-center justify-center shrink-0">
                    <Icon size={15} strokeWidth={2} />
                  </span>
                  <span className="text-sm font-bold text-[#1A5FB4] whitespace-nowrap">{t.label}</span>
                  <span className="text-xs text-gray-400 whitespace-nowrap">{t.sub}</span>
                </div>
                {i < loop.length - 1 && <span className="w-px h-5 bg-[#DAEEFF] shrink-0" />}
              </div>
            );
          })}
        </div>
      </div>

      <style jsx>{`
        .ticker-track {
          animation: trust-ticker 30s linear infinite;
        }
        @keyframes trust-ticker {
          0% { transform: translateX(0); }
          100% { transform: translateX(-25%); }
        }
      `}</style>
    </section>
  );
}
