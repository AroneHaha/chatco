"use client";

import dynamic from "next/dynamic";
import { ArrowUpRight } from "lucide-react";
import { useInView } from "@/hooks/useInView";

// Leaflet touches `window`, so the map is client-only and mounts once in view.
const ContactMap = dynamic(() => import("./ContactMap"), { ssr: false });

const OFFICE = { name: "Jed's Island Resort", coords: [14.9241871, 120.7659402] as [number, number] };
const DIRECTIONS_URL = `https://www.google.com/maps/dir/?api=1&destination=${OFFICE.coords.join(",")}`;

const CONTACTS = [
  { label: "Facebook", value: "CHATCO on Facebook", href: "https://www.facebook.com/Chatco201494", external: true },
  { label: "Phone", value: "0956 710 3081", href: "tel:+639567103081", external: false },
  { label: "Email", value: "eric.chatco@gmail.com", href: "mailto:eric.chatco@gmail.com", external: false },
];

const row = "py-5 border-b border-[#DAEEFF] sm:grid sm:grid-cols-[7rem_1fr] sm:items-baseline sm:gap-6";
const label = "text-xs font-semibold uppercase tracking-[0.1em] text-[#1A5FB4]";
const focus = "focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#1A5FB4] rounded-sm";

export default function Contact() {
  const { ref, visible } = useInView();

  return (
    <section
      id="contact"
      ref={ref}
      className={`py-20 md:py-28 bg-[#F0F7FF] text-gray-900 transition-all duration-700 ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
      }`}
    >
      <div className="max-w-7xl mx-auto px-5 md:px-8 grid lg:grid-cols-[0.9fr_1.1fr] gap-x-16 gap-y-12">
        <div>
          <p className={label}>Contact</p>
          <h2 className="mt-5 font-sans font-bold text-3xl sm:text-4xl md:text-5xl tracking-tight leading-[1.05]">
            Get in touch.
          </h2>
          <p className="mt-6 max-w-md text-lg text-gray-600 leading-relaxed">
            Questions about rides, fares, or working with CHATCO? Reach us any of these ways.
          </p>

          <div className="mt-10 border-t border-[#DAEEFF]">
            {CONTACTS.map((c) => (
              <div key={c.label} className={row}>
                <p className={label}>{c.label}</p>
                <a
                  href={c.href}
                  {...(c.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                  className={`group mt-1 sm:mt-0 inline-flex items-center gap-2 text-base sm:text-lg font-medium text-gray-900 hover:text-[#1A5FB4] transition-colors break-all ${focus}`}
                >
                  {c.value}
                  {c.external && (
                    <ArrowUpRight size={16} className="shrink-0 text-gray-400 group-hover:text-[#1A5FB4] transition-colors" aria-hidden />
                  )}
                </a>
              </div>
            ))}
            <div className={row}>
              <p className={label}>Location</p>
              <p className="mt-1 sm:mt-0 text-base sm:text-lg font-medium text-gray-900">
                {OFFICE.name}
                <span className="block mt-1 text-sm font-normal text-gray-500">Bulacan, Philippines</span>
              </p>
            </div>
          </div>
        </div>

        <div className="relative min-h-96 lg:min-h-0 rounded-2xl overflow-hidden bg-[#050F1A] border border-[#071A2E]/10 shadow-2xl shadow-black/10">
          {visible && <ContactMap position={OFFICE.coords} label={OFFICE.name} />}

          <a
            href={DIRECTIONS_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="absolute top-4 left-4 z-10 inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold bg-[#1A5FB4] text-white hover:bg-[#164A8F] shadow-lg shadow-black/30 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            Get directions
            <ArrowUpRight size={16} aria-hidden />
          </a>
        </div>
      </div>
    </section>
  );
}
