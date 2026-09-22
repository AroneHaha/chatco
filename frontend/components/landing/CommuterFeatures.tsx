"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
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
import {
  GcashScene,
  TrackingScene,
  FareScene,
  HailScene,
  NotifyScene,
  ShareScene,
  RewardsScene,
} from "./FeatureScenes";

type Feature = {
  icon: LucideIcon;
  title: string;
  desc: string;
  scene: () => React.ReactElement;
};

const FEATURES: Feature[] = [
  {
    icon: QrCode,
    title: "GCash Cashless Payment",
    desc: "Show your QR to the conductor — they scan it and fare is paid directly via GCash. No wallet needed.",
    scene: () => <GcashScene />,
  },
  {
    icon: MapPin,
    title: "Live GPS Tracking",
    desc: "See nearby jeepneys on the map when they're within 1km. Get a sound alert when one approaches.",
    scene: () => <TrackingScene />,
  },
  {
    icon: Calculator,
    title: "Point-Area Fare Calculator",
    desc: "Fares based on 34 official CHATCO stop points — same rates whether you pay GCash or cash.",
    scene: () => <FareScene />,
  },
  {
    icon: Megaphone,
    title: "Pick Me Up Signal",
    desc: "Waiting in the dark or rain? Tap to send an alert straight to the conductor.",
    scene: () => <HailScene />,
  },
  {
    icon: Bell,
    title: "Ride Notifications",
    desc: "Get real-time alerts when a CHATCO jeep is nearby, when your ride is confirmed, and when you arrive at your drop-off.",
    scene: () => <NotifyScene />,
  },
  {
    icon: ShieldCheck,
    title: "Share My Ride",
    desc: "Generate a live tracking link for family and friends to ensure you arrive safely.",
    scene: () => <ShareScene />,
  },
  {
    icon: Gift,
    title: "Ride & Earn Rewards",
    desc: "Every cashless ride earns points. Hit the threshold and unlock free ride vouchers.",
    scene: () => <RewardsScene />,
  },
];

const AUTOPLAY_MS = 7000;

export default function CommuterFeatures() {
  const [active, setActive] = useState(0);
  const [autoplay, setAutoplay] = useState(true);
  // Pointer over the explorer or focus inside it pauses the rotation, so the
  // interactive scenes (fare slider, Pick Me Up) never swap out mid-use.
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (!autoplay || paused) return;
    const id = setInterval(() => setActive((a) => (a + 1) % FEATURES.length), AUTOPLAY_MS);
    return () => clearInterval(id);
  }, [autoplay, paused]);

  const select = (i: number) => {
    setActive(i);
    setAutoplay(false);
  };

  const current = FEATURES[active];

  return (
    <section id="features" className="py-24 bg-white overflow-hidden">
      <div className="max-w-7xl mx-auto px-5 md:px-8">
        <div className="mb-14 grid lg:grid-cols-[1fr_22rem] gap-x-16 gap-y-4 items-end">
          <h2 className="font-sans font-bold text-3xl sm:text-4xl md:text-5xl tracking-tight text-gray-900 leading-[1.05]">
            Everything you need, <br />
            in one tap.
          </h2>
          <p className="text-lg text-gray-500 leading-relaxed">
            From hailing to payment to safety, every step of the ride is in the app. Try each one.
          </p>
        </div>

        {/* Desktop: index + live demo, rotates until you pick one */}
        <div
          className="hidden lg:grid grid-cols-[300px_1fr] gap-8"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          onFocus={() => setPaused(true)}
          onBlur={() => setPaused(false)}
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
                  aria-current={on}
                  className={`relative w-full flex items-center gap-3 text-left px-4 py-3.5 rounded-xl transition-colors duration-200 ${
                    on ? "bg-[#F0F7FF]" : "hover:bg-gray-50"
                  }`}
                >
                  <span
                    aria-hidden
                    className="absolute left-0 top-3 bottom-3 w-0.75 rounded-full bg-[#1A5FB4] transition-opacity duration-300"
                    style={{ opacity: on ? 1 : 0 }}
                  />
                  <span
                    className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 transition-colors duration-300 ${
                      on ? "bg-[#1A5FB4] text-white" : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    <Icon size={17} strokeWidth={1.8} />
                  </span>
                  <span className={`text-sm font-semibold transition-colors duration-200 ${on ? "text-gray-900" : "text-gray-500"}`}>
                    {f.title}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="rounded-3xl overflow-hidden border border-[#DAEEFF] bg-[#F0F7FF] min-h-136 flex flex-col">
            <div className="flex-1 min-h-0 px-10 pt-8">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={active}
                  className="h-full"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.25 }}
                >
                  {current.scene()}
                </motion.div>
              </AnimatePresence>
            </div>
            <div className="px-10 pb-10 pt-6">
              <h3 className="font-sans font-bold text-3xl md:text-4xl tracking-tight text-gray-900">
                {current.title}
              </h3>
              <p className="mt-3 max-w-lg text-base text-gray-500 leading-relaxed">{current.desc}</p>
            </div>
          </div>
        </div>

        {/* Mobile: accordion, each opens its demo */}
        <div className="lg:hidden space-y-2">
          {FEATURES.map((f, i) => {
            const on = active === i;
            const Icon = f.icon;
            return (
              <div key={f.title} className={`rounded-2xl border overflow-hidden transition-colors ${on ? "border-[#DAEEFF] bg-[#F0F7FF]" : "border-gray-100"}`}>
                <button
                  type="button"
                  onClick={() => select(on ? -1 : i)}
                  aria-expanded={on}
                  className="w-full flex items-center gap-3 text-left px-4 py-4"
                >
                  <span className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-[#1A5FB4]/10 text-[#1A5FB4]">
                    <Icon size={18} strokeWidth={1.8} />
                  </span>
                  <span className="text-sm font-bold text-gray-900">{f.title}</span>
                  <span className={`ml-auto text-gray-400 transition-transform duration-300 ${on ? "rotate-45" : ""}`}>+</span>
                </button>
                <div className={`grid transition-all duration-300 ${on ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
                  <div className="overflow-hidden">
                    <p className="px-4 pb-3 text-sm text-gray-500 leading-relaxed">{f.desc}</p>
                    {on && <div className="h-72 px-4 pb-5">{f.scene()}</div>}
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
