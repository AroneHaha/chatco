// components/landing/Hero.tsx
"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import heroLaptop from "../../assets/hero-laptop.png";
import heroPhone from "../../assets/hero-phone.png";

export default function Hero() {
  return (
    <header className="relative overflow-hidden bg-[#071A2E] font-sans pt-32 pb-20 lg:pt-0 lg:pb-0 lg:min-h-screen lg:flex lg:items-center">
      {/* Faint structural texture only — no blurred color blobs on the copy side. */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{ backgroundImage: "linear-gradient(rgba(255,255,255,.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.6) 1px, transparent 1px)", backgroundSize: "64px 64px" }}
      />

      {/* Same container as the docked Navbar so the logo, headline and CTA
          share one left edge and the mockups share the Get Started button's
          right edge — the two halves balance around the page's center line. */}
      <div className="relative z-10 w-full max-w-7xl mx-auto px-5 md:px-8 lg:pt-20">
        <div className="grid lg:grid-cols-2 xl:grid-cols-[0.85fr_1.15fr] gap-12 lg:gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            <h1 className="font-sans font-bold text-white leading-[1.02] tracking-[-0.035em] text-5xl sm:text-6xl lg:text-[52px] xl:text-[64px]">
              The Future of <br />
              <span className="text-[#62A0EA]">Jeepney Rides.</span>
            </h1>

            <div className="mt-10 lg:mt-11 h-px w-24 bg-white/15" />

            <p className="mt-8 max-w-md text-lg text-white/60 leading-[1.7]">
              Experience seamless commuting with real-time tracking, cashless QR payments, and smart safety features—all in your pocket.
            </p>

            <div className="mt-8 lg:mt-9 flex items-center gap-8 shrink-0">
              <a
                href="/signup"
                className="inline-flex items-center justify-center px-8 py-4 rounded-full text-base font-semibold bg-[#1A5FB4] text-white hover:bg-[#164A8F] transition-all shadow-xl shadow-[#1A5FB4]/30 hover:shadow-2xl hover:shadow-[#1A5FB4]/40"
              >
                Create Account
              </a>
              <a
                href="#features"
                className="group inline-flex items-center gap-2 text-base font-medium text-white/70 hover:text-white transition-colors"
              >
                Learn more
                <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
              </a>
            </div>

            {/* The real, confirmed pilot corridor (PRODUCT.md). */}
            <div className="mt-14 lg:mt-16 flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.2em] text-white/40">
              <span>Calumpit</span>
              <span className="w-8 h-px bg-white/20" />
              <span>Meycauayan</span>
              <span className="hidden sm:inline text-white/25">— Bulacan, Philippines</span>
            </div>
          </motion.div>

          {/* The real product on both platforms: the commuter web app on a
              laptop with the phone app crossing its right edge. hero-laptop /
              hero-phone are desktop-mockup / phone-mockup trimmed to the
              device (no transparent padding, faint shadow removed) so they
              size and align like ordinary images. Desktop only, as before. */}
          <motion.div
            className="hidden lg:block relative"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 0.3, ease: "easeOut" }}
          >
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-120 h-120 rounded-full bg-[#1A5FB4]/25 blur-[120px]" />

            <div className="relative w-full pt-8 pb-8">
              <Image
                src={heroLaptop}
                alt="CHATCO commuter app on a laptop, showing the live route map and GCash payment"
                priority
                quality={90}
                sizes="(min-width: 1280px) 620px, 50vw"
                className="w-[94%] h-auto"
              />
              <Image
                src={heroPhone}
                alt="CHATCO commuter app on a phone, showing the Pay with GCash card, Share Ride and SOS"
                quality={90}
                sizes="(min-width: 1280px) 240px, 25vw"
                className="absolute right-0 bottom-0 w-[33%] h-auto drop-shadow-2xl"
              />
            </div>
          </motion.div>
        </div>
      </div>
    </header>
  );
}
