// components/landing/Navbar.tsx
"use client";
import { useState, useEffect } from "react";
import Image from "next/image";
import logo from "../../assets/logo-transparent.png";

const LINKS = ["Features", "How It Works", "Safety", "Platform"];

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      {/* Docked instrument bar, not a floating pill — the control room's
          chrome stays put and stays dark regardless of what scrolls beneath
          it, rather than chameleoning to match the page like a typical
          SaaS nav. */}
      <nav
        className={`fixed top-0 inset-x-0 z-50 border-b transition-all duration-300 ease-out ${
          scrolled
            ? "bg-[#071A2E]/90 backdrop-blur-xl border-white/10 shadow-lg shadow-black/20"
            : "bg-[#071A2E]/20 backdrop-blur-md border-transparent"
        }`}
      >
        <div className="max-w-7xl mx-auto px-5 md:px-8 h-18 flex items-center justify-between">
          <a href="#" className="flex items-center gap-3 shrink-0">
            <Image src={logo} alt="CHATCO" width={40} height={40} className="rounded-lg" priority />
            <span className="text-lg font-extrabold tracking-tight text-white">CHATCO</span>
          </a>

          <div className="hidden md:flex items-center gap-1">
            {LINKS.map((l) => (
              <a
                key={l}
                href={`#${l.toLowerCase().replace(/ /g, "-")}`}
                className="group relative px-4 py-2 text-sm font-medium text-white/60 hover:text-white transition-colors"
              >
                {l}
                <span className="absolute left-1/2 bottom-0 -translate-x-1/2 w-1 h-1 rounded-full bg-[#62A0EA] opacity-0 group-hover:opacity-100 transition-opacity" />
              </a>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <a
              href="/login"
              className="hidden sm:inline-flex items-center px-6 py-2.5 rounded-full text-sm font-bold bg-[#1A5FB4] text-white hover:bg-[#164A8F] shadow-md shadow-[#1A5FB4]/30 transition-colors"
            >
              Get Started
            </a>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="md:hidden p-2 rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-colors"
              aria-label="Toggle menu"
            >
              {menuOpen ? (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
              ) : (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9h16.5m-16.5 6.75h16.5" /></svg>
              )}
            </button>
          </div>
        </div>
      </nav>

      {menuOpen && (
        <div className="fixed inset-x-0 top-22 z-40 mx-4 md:hidden">
          <div className="bg-[#0B1120] border border-white/10 rounded-2xl shadow-2xl shadow-black/40 p-5 space-y-1.5">
            {LINKS.map((l) => (
              <a
                key={l}
                href={`#${l.toLowerCase().replace(/ /g, "-")}`}
                onClick={() => setMenuOpen(false)}
                className="block px-5 py-3.5 rounded-xl text-base font-medium text-white/70 hover:bg-white/5 hover:text-white"
              >
                {l}
              </a>
            ))}
            <a href="/login" className="block text-center mt-3 px-5 py-3.5 rounded-full text-base font-bold bg-[#1A5FB4] text-white hover:bg-[#164A8F]">Get Started</a>
          </div>
        </div>
      )}
    </>
  );
}
