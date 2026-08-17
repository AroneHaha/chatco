"use client";

import { useState } from "react";
import Section from "@/components/ui/Section";
import { Icons } from "@/components/icons";

const FEATURES = [
  {
    icon: Icons.share,
    title: "Share My Ride",
    desc: "Generate a live link for family and friends. They see your jeepney's real-time GPS location on a map — peace of mind for late-night or long commutes.",
  },
  {
    icon: Icons.search,
    title: "Lost & Found Reporter",
    desc: "Report lost items with trip details. Conductors log found items separately. Admin matches both in a centralized dashboard for verification and return.",
  },
  {
    icon: Icons.sparkles,
    title: "Emergency SOS Alert",
    desc: "One-tap panic button sends your location and vehicle details straight to the admin. No manual calls needed — help comes to you.",
  },
];

const BADGES = [
  { icon: Icons.shield, label: "Emergency Panic Button" },
  { icon: Icons.mapPin, label: "Overspeeding Detection" },
];

export default function SafetySupport() {
  const [active, setActive] = useState(0);

  return (
    <Section id="safety">
      <h2 className="font-editorial-serif font-medium text-3xl md:text-4xl tracking-tight text-center">
        Your Safety, Always On
      </h2>

      {/* Desktop — control-panel switches: click or hover to expand */}
      <div className="hidden md:flex mt-14 h-110 gap-3">
        {FEATURES.map((f, i) => {
          const on = active === i;
          return (
            <button
              key={f.title}
              type="button"
              onClick={() => setActive(i)}
              onFocus={() => setActive(i)}
              onMouseEnter={() => setActive(i)}
              aria-expanded={on}
              className={`group relative flex-1 overflow-hidden rounded-3xl border text-left transition-all duration-500 ease-out ${
                on ? "basis-3/5 bg-[#071A2E] border-[#071A2E]" : "basis-1/5 bg-gray-50 border-gray-100 hover:bg-gray-100"
              }`}
            >
              <span
                aria-hidden
                className={`pointer-events-none absolute -right-8 -bottom-10 transition-all duration-500 [&_svg]:w-56 [&_svg]:h-56 ${
                  on ? "text-white/6 scale-110" : "text-gray-900/4.5"
                }`}
              >
                {f.icon}
              </span>

              <div className="relative h-full flex flex-col p-6 md:p-8">
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-colors duration-500 ${
                    on ? "bg-white/10 text-white" : "bg-[#1A5FB4]/10 text-[#1A5FB4]"
                  }`}
                >
                  {f.icon}
                </div>

                <div className="mt-auto">
                  <h3
                    className={`font-bold whitespace-nowrap transition-all duration-500 ${
                      on
                        ? "text-white text-2xl [writing-mode:horizontal-tb]"
                        : "text-gray-800 text-sm tracking-wide [writing-mode:vertical-rl] rotate-180 mb-1"
                    }`}
                  >
                    {f.title}
                  </h3>
                  <p
                    className={`text-sm leading-relaxed text-white/60 transition-all duration-500 overflow-hidden ${
                      on ? "max-h-32 opacity-100 mt-3" : "max-h-0 opacity-0 mt-0"
                    }`}
                  >
                    {f.desc}
                  </p>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Mobile — plain stacked list, everything visible at once */}
      <div className="mt-12 space-y-8 md:hidden">
        {FEATURES.map((f) => (
          <div key={f.title} className="flex gap-4">
            <div className="w-11 h-11 rounded-xl bg-[#1A5FB4]/10 text-[#1A5FB4] flex items-center justify-center shrink-0">
              {f.icon}
            </div>
            <div>
              <h3 className="font-bold text-gray-900">{f.title}</h3>
              <p className="mt-1.5 text-sm text-gray-500 leading-relaxed">{f.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
        {BADGES.map((b) => (
          <div
            key={b.label}
            className="flex items-center gap-2 px-4 py-2 rounded-full border border-gray-200 bg-white text-sm text-gray-600"
          >
            <span className="text-[#1A5FB4]">{b.icon}</span>
            {b.label}
          </div>
        ))}
      </div>
    </Section>
  );
}
