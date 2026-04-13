"use client";
import { useState, useEffect } from "react";

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 30);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${scrolled ? "bg-white/90 backdrop-blur-lg shadow-sm shadow-gray-200/50" : "bg-transparent"}`}>
      <div className="max-w-7xl mx-auto px-5 md:px-8 h-16 flex items-center justify-between">
        <a href="#" className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-lg bg-[#1A5FB4] flex items-center justify-center">
            <span className="text-white font-bold text-sm">C</span>
          </div>
          <span className={`text-xl font-bold tracking-tight transition-colors ${scrolled ? "text-[#071A2E]" : "text-white"}`}>CHATCO</span>
        </a>

        <div className="hidden md:flex items-center gap-8">
          {["Features", "How It Works", "Safety", "Platform"].map((l) => (
            <a key={l} href={`#${l.toLowerCase().replace(/ /g, "-")}`} className={`text-sm font-medium transition-colors ${scrolled ? "text-gray-600 hover:text-[#1A5FB4]" : "text-white/70 hover:text-white"}`}>{l}</a>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <a href="/login" className="hidden sm:inline-flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold bg-[#1A5FB4] text-white hover:bg-[#164A8F] transition-colors shadow-md shadow-[#1A5FB4]/20">Login</a>
          <button onClick={() => setMenuOpen(!menuOpen)} className={`md:hidden p-2 rounded-lg transition-colors ${scrolled ? "text-gray-700" : "text-white"}`} aria-label="Toggle menu">
            {menuOpen ? (
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
            ) : (
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9h16.5m-16.5 6.75h16.5" /></svg>
            )}
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="md:hidden bg-white border-t border-gray-100 shadow-lg">
          <div className="px-5 py-4 space-y-3">
            {["Features", "How It Works", "Safety", "Platform"].map((l) => (
              <a key={l} href={`#${l.toLowerCase().replace(/ /g, "-")}`} onClick={() => setMenuOpen(false)} className="block text-sm font-medium text-gray-700 hover:text-[#1A5FB4]">{l}</a>
            ))}
            <a href="/login" className="block text-center px-5 py-2.5 rounded-lg text-sm font-semibold bg-[#1A5FB4] text-white">Login</a>
          </div>
        </div>
      )}
    </nav>
  );
}