import Link from "next/link";
import Image from "next/image";
import logo from "../../../assets/logo-transparent.png";
import LoginForm from "@/components/auth/login-form";
import Footer from "@/components/landing/Footer";

// Every line here is backed by the shipped product (PRODUCT.md / TrustBar):
// unit tracking within 1 km with ETA, QR + GCash fares, per-trip receipts,
// Share My Ride and SOS, and the 34-stop Calumpit–Meycauayan route.
const CAPABILITIES = [
  "Live unit tracking within 1 km, with ETA",
  "QR and GCash fares, a receipt after every cashless trip",
  "Share My Ride and one-tap SOS",
];

export default function LoginPage() {
  return (
    <div className="min-h-screen flex flex-col bg-white">

      {/* Main Content Area */}
      <div className="flex-1 flex">

        {/* Left Side - Branding (Hidden on mobile). Same navy field, faint grid
            and editorial type as the landing Hero: no glow blobs, no cards. */}
        <div className="hidden lg:flex lg:w-1/2 relative bg-[#071A2E] overflow-hidden flex-col min-h-180">
          <div
            className="absolute inset-0 opacity-[0.03] pointer-events-none"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.6) 1px, transparent 1px)",
              backgroundSize: "64px 64px",
            }}
          />

          {/* Top Section - Logo (Acts as the ONLY back button on L screens) */}
          <div className="relative z-10 pt-12 px-12 xl:px-16">
            <Link
              href="/"
              className="inline-flex items-center gap-4 hover:opacity-80 transition-opacity"
            >
              <Image
                src={logo}
                alt="CHATCO"
                width={64}
                height={64}
                className="rounded-full"
              />
              <span className="text-3xl font-bold tracking-tight text-white">
                CHATCO
              </span>
            </Link>
          </div>

          {/* Headline */}
          <div className="relative z-10 px-12 xl:px-16 pt-16 xl:pt-20">
            <h1 className="font-bold text-white leading-[1.02] tracking-[-0.035em] text-5xl xl:text-6xl">
              Know where
              <br />
              your <span className="text-[#62A0EA]">jeepney is.</span>
            </h1>

            <div className="mt-9 h-px w-24 bg-white/15" />

            <p className="mt-8 max-w-md text-lg text-white/60 leading-[1.7]">
              Sign in to track units on the route, pay your fare cashlessly, and stay covered on every ride.
            </p>
          </div>

          {/* Bottom Section - what the route actually offers */}
          <div className="relative z-10 mt-auto pt-14 px-12 xl:px-16 pb-12">
            <div className="max-w-md">
              <div className="flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.2em] text-white/40">
                <span>Calumpit</span>
                <span className="w-6 h-px bg-white/20" />
                <span>Meycauayan</span>
              </div>
              <p className="mt-2 text-xs text-white/40">34 official stop points, Bulacan</p>

              <ul className="mt-6 border-t border-white/10">
                {CAPABILITIES.map((item) => (
                  <li key={item} className="py-3 border-b border-white/10 text-sm text-white/70">
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Right Side - Form */}
        <div className="relative w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 pt-10 lg:pt-12 bg-white">
          <div className="w-full max-w-md">

            {/* Mobile: brand + way back to the home page (hidden on L, where the navy panel carries both) */}
            <div className="lg:hidden flex items-center justify-between mb-10">
              <Link href="/" className="inline-flex items-center gap-3">
                <Image
                  src={logo}
                  alt="CHATCO"
                  width={44}
                  height={44}
                  className="rounded-full"
                />
                <span className="text-xl font-bold tracking-tight text-[#071A2E]">CHATCO</span>
              </Link>
              <Link
                href="/"
                className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-[#1A5FB4] transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
                </svg>
                Home
              </Link>
            </div>

            <LoginForm />
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
