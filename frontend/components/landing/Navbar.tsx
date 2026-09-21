// components/landing/Navbar.tsx
"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { Bus, Menu, X } from "lucide-react";
import logo from "../../assets/logo-transparent.png";

// In page order, so the active marker slides left to right as you read down.
const LINKS = [
  { label: "How It Works", id: "how-it-works" },
  { label: "Features", id: "features" },
  { label: "Platform", id: "platform" },
  { label: "Safety", id: "safety" },
  { label: "About", id: "about" },
  { label: "Contact", id: "contact" },
];

const MARKER = 18; // px, the jeepney marker's width

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [active, setActive] = useState<string | null>(null);
  const reduce = useReducedMotion();

  // The ride line along the nav's bottom edge: the jeepney travels the page
  // the way it travels the route, so it doubles as the scroll-progress bar.
  const { scrollYProgress } = useScroll();
  const markerLeft = useTransform(scrollYProgress, (v) => `calc((100% - ${MARKER}px) * ${v})`);
  const fillWidth = useTransform(scrollYProgress, (v) => `calc((100% - ${MARKER}px) * ${v} + ${MARKER / 2}px)`);

  useEffect(() => {
    let raf = 0;
    const update = () => {
      raf = 0;
      setScrolled(window.scrollY > 40);
      // "Where you are" is the last linked section whose top has passed 40% of
      // the viewport. It stays lit through sections that have no nav link
      // (Rewards, Hailing), so the underline travels link to link instead of
      // vanishing and reappearing; it clears after the final section ends.
      const probe = window.innerHeight * 0.4;
      let passed = -1;
      LINKS.forEach((l, i) => {
        const r = document.getElementById(l.id)?.getBoundingClientRect();
        if (r && r.top <= probe) passed = i;
      });
      let current: string | null = passed >= 0 ? LINKS[passed].id : null;
      if (passed === LINKS.length - 1) {
        const last = document.getElementById(LINKS[passed].id)?.getBoundingClientRect();
        if (last && last.bottom <= probe) current = null;
      }
      setActive(current);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenuOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  const focus = "focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#62A0EA]";

  return (
    <nav
      aria-label="Main"
      className={`fixed top-0 inset-x-0 z-50 border-b transition-[background-color,border-color,box-shadow] duration-300 ease-out ${
        scrolled || menuOpen
          ? "bg-[#071A2E]/92 backdrop-blur-xl border-white/10 shadow-lg shadow-black/20"
          : "bg-[#071A2E]/20 backdrop-blur-md border-transparent"
      }`}
    >
      <div className={`max-w-7xl mx-auto px-5 md:px-8 flex items-center justify-between lg:grid lg:grid-cols-[auto_1fr_auto] xl:grid-cols-[1fr_auto_1fr] transition-[height] duration-300 ${scrolled ? "h-14" : "h-16"}`}>
        <a href="#" className={`flex items-center gap-3 shrink-0 rounded-md ${focus}`} aria-label="CHATCO, back to top">
          <Image src={logo} alt="" width={40} height={40} className="rounded-lg" priority />
          <span className="text-lg font-bold tracking-tight text-white">CHATCO</span>
        </a>

        <div className="hidden lg:flex items-center gap-1 lg:justify-self-center">
          {LINKS.map((l) => {
            const on = active === l.id;
            return (
              <a
                key={l.id}
                href={`#${l.id}`}
                aria-current={on ? "location" : undefined}
                className={`relative px-3 xl:px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors rounded-md ${focus} ${
                  on ? "text-white" : "text-white/60 hover:text-white"
                }`}
              >
                {l.label}
                {on && (
                  <motion.span
                    layoutId="nav-active"
                    aria-hidden
                    className="absolute inset-x-3 xl:inset-x-4 -bottom-0.5 h-0.5 rounded-full bg-[#62A0EA]"
                    transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 420, damping: 34 }}
                  />
                )}
              </a>
            );
          })}
        </div>

        <div className="flex items-center gap-2 sm:gap-3 lg:justify-self-end">
          <a
            href="/login"
            className={`hidden sm:inline-flex items-center whitespace-nowrap px-3 py-2 rounded-md text-sm font-medium text-white/70 hover:text-white hover:bg-white/5 transition-colors ${focus}`}
          >
            Log in
          </a>
          <a
            href="/signup"
            className={`hidden sm:inline-flex items-center whitespace-nowrap px-4 py-2 rounded-full text-sm font-semibold bg-[#1A5FB4] text-white hover:bg-[#164A8F] shadow-sm shadow-[#1A5FB4]/25 transition-colors ${focus}`}
          >
            Create Account
          </a>
          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            className={`lg:hidden grid place-items-center w-10 h-10 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors ${focus}`}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            aria-controls="mobile-nav"
          >
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Ride line: Calumpit at the left edge, Meycauayan at the right */}
      <div
        aria-hidden
        className={`absolute inset-x-0 bottom-0 h-px transition-opacity duration-300 ${scrolled ? "opacity-100" : "opacity-0"}`}
      >
        <motion.div className="absolute left-0 top-0 h-px bg-[#62A0EA]" style={{ width: fillWidth }} />
        <motion.span
          className="absolute -top-2 grid place-items-center rounded-md bg-[#62A0EA] text-[#071A2E] shadow-md shadow-black/30"
          style={{ left: markerLeft, width: MARKER, height: MARKER }}
        >
          <Bus size={11} strokeWidth={2.6} />
        </motion.span>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            id="mobile-nav"
            className="lg:hidden absolute inset-x-0 top-full overflow-hidden bg-[#071A2E] border-b border-white/10 shadow-2xl shadow-black/40"
            initial={reduce ? false : { height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
          >
            <div className="px-5 pt-3 pb-6">
              <ul>
                {LINKS.map((l) => {
                  const on = active === l.id;
                  return (
                    <li key={l.id} className="border-b border-white/10 last:border-0">
                      <a
                        href={`#${l.id}`}
                        onClick={() => setMenuOpen(false)}
                        aria-current={on ? "location" : undefined}
                        className={`flex items-center justify-between py-4 font-sans text-2xl font-semibold tracking-tight transition-colors ${focus} ${
                          on ? "text-[#62A0EA]" : "text-white"
                        }`}
                      >
                        {l.label}
                        {on && <span className="text-xs font-sans font-medium text-white/50">You are here</span>}
                      </a>
                    </li>
                  );
                })}
              </ul>
              <div className="mt-5 grid grid-cols-2 gap-3">
                <a
                  href="/login"
                  onClick={() => setMenuOpen(false)}
                  className={`text-center py-3.5 rounded-full border border-white/20 text-base font-semibold text-white hover:bg-white/5 transition-colors ${focus}`}
                >
                  Log in
                </a>
                <a
                  href="/signup"
                  onClick={() => setMenuOpen(false)}
                  className={`text-center py-3.5 rounded-full bg-[#1A5FB4] text-base font-bold text-white hover:bg-[#164A8F] transition-colors ${focus}`}
                >
                  Create Account
                </a>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
