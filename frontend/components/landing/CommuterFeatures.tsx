"use client";

import { useEffect, useState } from "react";
import {
  QrCode,
  MapPin,
  Calculator,
  Megaphone,
  ShieldCheck,
  Gift,
  Bell,
  type LucideIcon,
} from "lucide-react";

type Feature = {
  icon: LucideIcon;
  title: string;
  desc: string;
  hex: string;
};

const FEATURES: Feature[] = [
  {
    icon: QrCode,
    title: "GCash Cashless Payment",
    desc: "Show your QR to the conductor — they scan it and fare is paid directly via GCash. No wallet needed.",
    hex: "#2563EB",
  },
  {
    icon: MapPin,
    title: "Live GPS Tracking",
    desc: "See nearby jeepneys on the map when they're within 1km. Get a sound alert when one approaches.",
    hex: "#16A34A",
  },
  {
    icon: Calculator,
    title: "Point-Area Fare Calculator",
    desc: "Fares based on 34 official CHATCO stop points — same rates whether you pay GCash or cash.",
    hex: "#9333EA",
  },
  {
    icon: Megaphone,
    title: "Pick Me Up Signal",
    desc: "Waiting in the dark or rain? Tap to send an alert straight to the conductor.",
    hex: "#EA580C",
  },
  {
    icon: Bell,
    title: "Ride Notifications",
    desc: "Get real-time alerts when a CHATCO jeep is nearby, when your ride is confirmed, and when you arrive at your drop-off.",
    hex: "#0891B2",
  },
  {
    icon: ShieldCheck,
    title: "Share My Ride",
    desc: "Generate a live tracking link for family and friends to ensure you arrive safely.",
    hex: "#DC2626",
  },
  {
    icon: Gift,
    title: "Ride & Earn Rewards",
    desc: "Every cashless ride earns points. Hit the threshold and unlock free ride vouchers.",
    hex: "#CA8A04",
  },
];

const AUTOPLAY_MS = 4500;

export default function CommuterFeatures() {
  const [active, setActive] = useState(0);
  const [autoplay, setAutoplay] = useState(true);
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    if (!autoplay || hovered) return;
    const id = setInterval(() => setActive((a) => (a + 1) % FEATURES.length), AUTOPLAY_MS);
    return () => clearInterval(id);
  }, [autoplay, hovered]);

  const select = (i: number) => {
    setActive(i);
    setAutoplay(false);
  };

  const current = FEATURES[active];
  const CurrentIcon = current.icon;

  return (
    <section id="features" className="py-24 bg-white overflow-hidden">
      <div className="max-w-7xl mx-auto px-5 md:px-8">
        <div className="text-center mb-16 max-w-2xl mx-auto">
          <h2 className="font-editorial-serif font-medium text-3xl md:text-5xl tracking-tight text-gray-900">
            Everything you need, <br />
            in one tap.
          </h2>
          <p className="mt-4 text-lg text-gray-500">
            From hailing to payment to safety — we&apos;ve digitized every step of
            your jeepney journey.
          </p>
        </div>

        {/* Desktop — index + detail explorer, auto-advances until you pick one */}
        <div
          className="hidden lg:grid grid-cols-[320px_1fr] gap-8"
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
        >
          <div className="space-y-1">
            {FEATURES.map((f, i) => {
              const on = active === i;
              const Icon = f.icon;
              return (
                <button
                  key={f.title}
                  type="button"
                  onMouseEnter={() => select(i)}
                  onFocus={() => select(i)}
                  className={`w-full flex items-center gap-3 text-left px-4 py-3.5 rounded-xl transition-colors duration-200 ${
                    on ? "bg-gray-50" : "hover:bg-gray-50/70"
                  }`}
                >
                  <span
                    className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 transition-colors duration-300"
                    style={{ background: on ? `${f.hex}17` : "#F3F4F6", color: on ? f.hex : "#6B7280" }}
                  >
                    <Icon size={17} strokeWidth={1.8} />
                  </span>
                  <span className={`text-sm font-semibold transition-colors duration-200 ${on ? "text-gray-900" : "text-gray-500"}`}>
                    {f.title}
                  </span>
                  <span
                    className="ml-auto w-1.5 h-1.5 rounded-full shrink-0 transition-opacity duration-300"
                    style={{ background: f.hex, opacity: on ? 1 : 0 }}
                  />
                </button>
              );
            })}
          </div>

          <div
            className="relative min-h-104 rounded-3xl overflow-hidden p-10 md:p-12 flex flex-col justify-end border border-gray-100 transition-colors duration-500"
            style={{ background: `linear-gradient(150deg, ${current.hex}0d, #FAFAFA 65%)` }}
          >
            <CurrentIcon
              aria-hidden
              className="pointer-events-none absolute -right-8 -top-10 transition-colors duration-500"
              style={{ color: `${current.hex}14`, width: 280, height: 280 }}
              strokeWidth={1}
            />
            <div className="relative">
              <span
                className="inline-flex w-16 h-16 rounded-2xl items-center justify-center transition-colors duration-500"
                style={{ background: `${current.hex}17`, color: current.hex }}
              >
                <CurrentIcon size={30} strokeWidth={1.6} />
              </span>
              <h3 className="mt-7 font-editorial-serif font-medium text-3xl md:text-4xl tracking-tight text-gray-900">
                {current.title}
              </h3>
              <p className="mt-3 max-w-md text-base text-gray-500 leading-relaxed">
                {current.desc}
              </p>
            </div>
          </div>
        </div>

        {/* Mobile — accordion */}
        <div className="lg:hidden space-y-2">
          {FEATURES.map((f, i) => {
            const on = active === i;
            const Icon = f.icon;
            return (
              <div key={f.title} className="rounded-2xl border border-gray-100 overflow-hidden">
                <button
                  type="button"
                  onClick={() => select(on ? -1 : i)}
                  aria-expanded={on}
                  className="w-full flex items-center gap-3 text-left px-4 py-4"
                >
                  <span
                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: `${f.hex}17`, color: f.hex }}
                  >
                    <Icon size={18} strokeWidth={1.8} />
                  </span>
                  <span className="text-sm font-bold text-gray-900">{f.title}</span>
                  <span className={`ml-auto text-gray-300 transition-transform duration-300 ${on ? "rotate-45" : ""}`}>+</span>
                </button>
                <div className={`grid transition-all duration-300 ${on ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
                  <div className="overflow-hidden">
                    <p className="px-4 pb-4 pl-15 text-sm text-gray-500 leading-relaxed">{f.desc}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
