"use client";

import { useState } from "react";
import { Gauge, Search, Share2, ShieldCheck, TriangleAlert, type LucideIcon } from "lucide-react";
import Section from "@/components/ui/Section";
import { LostFoundScene, ShareScene, SosScene } from "./FeatureScenes";

type Feature = {
  icon: LucideIcon;
  title: string;
  desc: string;
  scene: () => React.ReactElement;
};

const FEATURES: Feature[] = [
  {
    icon: Share2,
    title: "Share My Ride",
    desc: "Generate a live link for family and friends. They see your jeepney's real-time GPS location on a map — peace of mind for late-night or long commutes.",
    scene: () => <ShareScene tone="dark" />,
  },
  {
    icon: Search,
    title: "Lost & Found Reporter",
    desc: "Report lost items with trip details. Conductors log found items separately. Admin matches both in a centralized dashboard for verification and return.",
    scene: () => <LostFoundScene tone="dark" />,
  },
  {
    icon: TriangleAlert,
    title: "Emergency SOS Alert",
    desc: "A double tap sends your location and vehicle details straight to the admin. No manual calls needed — help comes to you.",
    scene: () => <SosScene tone="dark" />,
  },
];

const ALSO: { icon: LucideIcon; label: string }[] = [
  { icon: ShieldCheck, label: "Emergency panic button" },
  { icon: Gauge, label: "Overspeeding detection" },
];

export default function SafetySupport() {
  const [active, setActive] = useState(0);

  return (
    <Section id="safety">
      <div className="grid lg:grid-cols-[1fr_22rem] gap-x-16 gap-y-6 items-end">
        <h2 className="font-sans font-bold text-3xl sm:text-4xl md:text-5xl tracking-tight leading-[1.05]">
          Your safety, <br />
          always on.
        </h2>
        <ul className="space-y-2.5">
          {ALSO.map((a) => {
            const Icon = a.icon;
            return (
              <li key={a.label} className="flex items-center gap-3 text-gray-600">
                <Icon size={18} className="text-[#1A5FB4] shrink-0" />
                {a.label}
              </li>
            );
          })}
        </ul>
      </div>

      {/* Desktop: the open panel is a working demo; the others fold to a spine */}
      <div className="hidden md:flex mt-14 h-130 gap-3">
        {FEATURES.map((f, i) => {
          const on = active === i;
          const Icon = f.icon;
          return (
            <div
              key={f.title}
              onMouseEnter={() => setActive(i)}
              onClick={() => setActive(i)}
              className={`relative overflow-hidden rounded-3xl border text-left transition-all duration-500 ease-out ${
                on ? "basis-3/5 bg-[#071A2E] border-[#071A2E]" : "basis-1/5 bg-gray-50 border-gray-100 hover:bg-gray-100 cursor-pointer"
              }`}
            >
              <div className="relative h-full flex flex-col p-6 md:p-8">
                <div
                  className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-colors duration-500 ${
                    on ? "bg-white/10 text-white" : "bg-[#1A5FB4]/10 text-[#1A5FB4]"
                  }`}
                >
                  <Icon size={20} />
                </div>

                {on ? (
                  <>
                    <div className="flex-1 min-h-0 py-4">{f.scene()}</div>
                    <div>
                      <h3 className="font-sans font-bold text-3xl tracking-tight text-white">{f.title}</h3>
                      <p className="mt-2 max-w-lg text-sm leading-relaxed text-white/60">{f.desc}</p>
                    </div>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => setActive(i)}
                    onFocus={() => setActive(i)}
                    aria-expanded={false}
                    className="mt-auto self-start rounded-md text-gray-800 text-sm font-bold whitespace-nowrap tracking-wide [writing-mode:vertical-rl] rotate-180 mb-1 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#1A5FB4]"
                  >
                    {f.title}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Mobile: every feature open, each with its demo */}
      <div className="mt-12 space-y-10 md:hidden">
        {FEATURES.map((f) => (
          <div key={f.title}>
            <div className="h-64 rounded-2xl bg-[#071A2E] px-5 py-4">{f.scene()}</div>
            <h3 className="mt-5 font-sans font-bold text-2xl tracking-tight text-gray-900">{f.title}</h3>
            <p className="mt-1.5 text-sm text-gray-500 leading-relaxed">{f.desc}</p>
          </div>
        ))}
      </div>
    </Section>
  );
}
