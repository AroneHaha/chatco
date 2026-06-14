"use client";

import { useEffect, useRef, useState } from "react";
import {
  Wallet,
  QrCode,
  MapPin,
  Calculator,
  Megaphone,
  ShieldCheck,
  Gift,
  Bell,
} from "lucide-react";

const row1 = [
  {
    icon: QrCode,
    title: "GCash Cashless Payment",
    desc: "Show your QR to the conductor — they scan it and fare is paid directly via GCash. No wallet needed.",
    color: "bg-blue-50 text-blue-600",
  },
  {
    icon: MapPin,
    title: "Live GPS Tracking",
    desc: "See nearby jeepneys on the map when they're within 1km. Get a sound alert when one approaches.",
    color: "bg-green-50 text-green-600",
  },
  {
    icon: Calculator,
    title: "Point-Area Fare Calculator",
    desc: "Fares based on 34 official CHATCO stop points — same rates whether you pay GCash or cash.",
    color: "bg-purple-50 text-purple-600",
  },
  {
    icon: Megaphone,
    title: "Pick Me Up Signal",
    desc: "Waiting in the dark or rain? Tap to send an alert straight to the conductor.",
    color: "bg-orange-50 text-orange-600",
  },
];

const row2 = [
  {
    icon: Bell,
    title: "Ride Notifications",
    desc: "Get real-time alerts when a CHATCO jeep is nearby, when your ride is confirmed, and when you arrive at your drop-off.",
    color: "bg-cyan-50 text-cyan-600",
  },
  {
    icon: ShieldCheck,
    title: "Share My Ride",
    desc: "Generate a live tracking link for family and friends to ensure you arrive safely.",
    color: "bg-red-50 text-red-600",
  },
  {
    icon: Gift,
    title: "Ride & Earn Rewards",
    desc: "Every cashless ride earns points. Hit the threshold and unlock free ride vouchers.",
    color: "bg-yellow-50 text-yellow-600",
  },
];

function FeatureCard({ f }: { f: any }) {
  const Icon = f.icon;

  return (
    <div className="group flex-shrink-0 w-[280px] p-6 rounded-2xl border border-gray-100 bg-white transition-all duration-300 hover:-translate-y-1 hover:border-[#1A5FB4]/30 hover:shadow-[0_0_20px_rgba(26,95,180,0.12),0_8px_30px_rgba(0,0,0,0.06)]">
      <div
        className={`w-14 h-14 rounded-2xl ${f.color} flex items-center justify-center mb-5 transition-transform group-hover:scale-110`}
      >
        <Icon size={24} strokeWidth={1.5} />
      </div>
      <h3 className="text-lg font-bold text-gray-900 mb-2">{f.title}</h3>
      <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
    </div>
  );
}

function MarqueeRow({
  items,
  direction,
}: {
  items: any[];
  direction: "left" | "right";
}) {
  const [isVisible, setIsVisible] = useState(false);
  const rowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = rowRef.current;
    if (!el) return;

    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          obs.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const loopItems = [...items, ...items, ...items];

  return (
    <div
      ref={rowRef}
      className="relative mb-6"
      style={{
        transform:
          direction === "left" ? "rotate(-1.5deg)" : "rotate(1.5deg)",
      }}
    >
      <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-24 z-10 bg-gradient-to-r from-white to-transparent" />
      <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-24 z-10 bg-gradient-to-l from-white to-transparent" />

      <div className="overflow-hidden">
        <div
          className="flex gap-6 w-max"
          style={{
            animation: isVisible
              ? direction === "left"
                ? "marquee-left 22s linear infinite"
                : "marquee-right 22s linear infinite"
              : "none",
            willChange: "transform",
          }}
        >
          {loopItems.map((f, i) => (
            <FeatureCard key={`${direction}-${i}`} f={f} />
          ))}
        </div>
      </div>

      <style jsx>{`
        @keyframes marquee-left {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-33.333%);
          }
        }

        @keyframes marquee-right {
          0% {
            transform: translateX(-33.333%);
          }
          100% {
            transform: translateX(0);
          }
        }
      `}</style>
    </div>
  );
}

export default function CommuterFeatures() {
  return (
    <section className="py-24 bg-white overflow-hidden">
      <div className="max-w-7xl mx-auto px-5 md:px-8">
        <div className="text-center mb-16 max-w-2xl mx-auto">
          <span className="text-xs font-bold text-[#1A5FB4] uppercase tracking-widest">
            Built for Commuters
          </span>
          <h2 className="mt-4 text-3xl md:text-5xl font-extrabold tracking-tight text-gray-900">
            Everything you need, <br />
            in one tap.
          </h2>
          <p className="mt-4 text-lg text-gray-500">
            From hailing to payment to safety — we've digitized every step of
            your jeepney journey.
          </p>
        </div>
      </div>

      <MarqueeRow items={row1} direction="left" />
      <MarqueeRow items={row2} direction="right" />
    </section>
  );
}