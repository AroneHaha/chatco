import Image from "next/image";
import Link from "next/link";
import logo from "../../assets/logo-transparent.png";

const linkClass = "rounded-sm transition-colors hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#62A0EA]";

export default function Footer({ compact = false }: { compact?: boolean }) {
  // --- COMPACT MODE (For Login / Signup pages) ---
  if (compact) {
    return (
      <footer className="bg-[#071A2E] border-t border-white/5">
        <div className="max-w-7xl mx-auto px-5 md:px-8 py-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-[10px] text-white/30">
          <span>&copy; {new Date().getFullYear()} CHATCO. All rights reserved.</span>
          <nav aria-label="Footer policies" className="flex items-center gap-4 text-white/50">
            <Link href="/privacy-policy" className={linkClass}>Privacy Policy</Link>
            <Link href="/terms-of-service" className={linkClass}>Terms of Service</Link>
          </nav>
        </div>
      </footer>
    );
  }

  // --- FULL MODE (For Landing Page) ---
  return (
    <footer className="bg-[#071A2E] text-white/40">
      <div className="max-w-7xl mx-auto px-5 md:px-8 py-12">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="sm:col-span-2 lg:col-span-1">
            <Link href="/" aria-label="CHATCO home" className={`mb-4 inline-flex items-center gap-2 ${linkClass}`}>
              <Image
                src={logo}
                alt=""
                width={57}
                height={57}
                className="rounded-lg"
              />
              <span className="text-lg font-bold text-white">CHATCO</span>
            </Link>
            <p className="text-sm leading-relaxed">
              Cashless payments, live jeepney tracking, and ride safety for your everyday commute.
            </p>
            <p className="mt-4 text-xs leading-relaxed text-white/60">Calumpit–Meycauayan<br />Bulacan, Philippines</p>
          </div>

          <nav aria-label="Footer explore">
            <h2 className="text-sm font-semibold text-white/70 uppercase tracking-wider mb-4">Explore</h2>
            <ul className="space-y-2 text-sm">
              <li><Link href="/#how-it-works" className={linkClass}>How It Works</Link></li>
              <li><Link href="/#features" className={linkClass}>Commuter Features</Link></li>
              <li><Link href="/#platform" className={linkClass}>Why CHATCO</Link></li>
              <li><Link href="/#safety" className={linkClass}>Safety & Support</Link></li>
              <li><Link href="/#smart-hailing" className={linkClass}>Smart Hailing</Link></li>
            </ul>
          </nav>

          <nav aria-label="Footer get started">
            <h2 className="text-sm font-semibold text-white/70 uppercase tracking-wider mb-4">Get Started</h2>
            <ul className="space-y-2 text-sm">
              <li><Link href="/signup" scroll={false} className={linkClass}>Create Account</Link></li>
              <li><Link href="/login" scroll={false} className={linkClass}>Log in</Link></li>
              <li>
                <Link href="/#download" className={`inline-flex flex-wrap items-center gap-x-2 gap-y-1 ${linkClass}`}>
                  Android App{" "}
                  <span className="rounded-full border border-[#62A0EA]/20 bg-[#1A5FB4]/15 px-2 py-0.5 text-[10px] font-medium text-[#62A0EA]">Coming soon</span>
                </Link>
              </li>
            </ul>
          </nav>

          <nav aria-label="Footer help and policies">
            <h2 className="text-sm font-semibold text-white/70 uppercase tracking-wider mb-4">Help & Policies</h2>
            <ul className="space-y-2 text-sm">
              <li><Link href="/#about" className={linkClass}>About CHATCO</Link></li>
              <li><Link href="/#contact" className={linkClass}>Contact & Support</Link></li>
              <li><Link href="/privacy-policy" className={linkClass}>Privacy Policy</Link></li>
              <li><Link href="/terms-of-service" className={linkClass}>Terms of Service</Link></li>
            </ul>
          </nav>
        </div>

        <div className="mt-12 pt-8 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
          <span>&copy; {new Date().getFullYear()} CHATCO. All rights reserved.</span>
          <span className="text-white/20">Built for Philippine jeepney transport</span>
        </div>
      </div>
    </footer>
  );
}
