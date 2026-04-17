// components/landing/Navbar.tsx
"use client";
import { useState, useEffect } from "react";

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      <nav className={`fixed top-0 inset-x-0 z-50 transition-all duration-700 ease-in-out ${scrolled ? "py-3" : "py-6"}`}>
        <div className={`max-w-4xl mx-auto px-4 flex items-center justify-between transition-all duration-700 ease-in-out ${scrolled ? "bg-white/95 backdrop-blur-xl rounded-full shadow-xl shadow-black/5 border border-white/20" : "bg-transparent"}`}>
          
          <a href="#" className="flex items-center gap-2.5 pl-3">
            <div className="w-9 h-9 rounded-xl bg-[#1A5FB4] flex items-center justify-center shadow-lg shadow-[#1A5FB4]/30">
              <span className="text-white font-bold text-sm">C</span>
            </div>
            <span className={`text-xl font-bold tracking-tight transition-colors duration-500 ${scrolled ? "text-[#071A2E]" : "text-white"}`}>CHATCO</span>
          </a>

          <div className="hidden md:flex items-center gap-1">
            {["Features", "How It Works", "Safety", "Platform"].map((l) => (
              <a key={l} href={`#${l.toLowerCase().replace(/ /g, "-")}`} className={`px-4 py-2 rounded-full text-sm font-medium transition-colors duration-300 ${scrolled ? "text-gray-600 hover:bg-gray-100 hover:text-[#1A5FB4]" : "text-white/80 hover:text-white hover:bg-white/10"}`}>{l}</a>
            ))}
          </div>

          <div className="flex items-center gap-2 pr-2">
            <a href="/login" className={`hidden sm:inline-flex items-center px-5 py-2 rounded-full text-sm font-semibold transition-all duration-300 ${scrolled ? "bg-[#1A5FB4] text-white hover:bg-[#164A8F] shadow-md shadow-[#1A5FB4]/20" : "bg-white text-[#071A2E] hover:bg-gray-100 shadow-lg"}`}>
              Get Started
            </a>
            <button onClick={() => setMenuOpen(!menuOpen)} className={`md:hidden p-2 rounded-full transition-colors duration-300 ${scrolled ? "text-gray-700 hover:bg-gray-100" : "text-white hover:bg-white/10"}`} aria-label="Toggle menu">
              {menuOpen ? (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
              ) : (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9h16.5m-16.5 6.75h16.5" /></svg>
              )}
            </button>
          </div>
        </div>
      </nav>

      {menuOpen && (
        <div className="fixed inset-x-0 top-24 z-40 mx-4 md:hidden">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 p-4 space-y-1">
            {["Features", "How It Works", "Safety", "Platform"].map((l) => (
              <a key={l} href={`#${l.toLowerCase().replace(/ /g, "-")}`} onClick={() => setMenuOpen(false)} className="block px-4 py-3 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-[#1A5FB4]">{l}</a>
            ))}
            <a href="/login" className="block text-center mt-2 px-4 py-3 rounded-xl text-sm font-semibold bg-[#1A5FB4] text-white">Get Started</a>
          </div>
        </div>
      )}
    </>
  );
}