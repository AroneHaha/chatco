import Link from "next/link";
import Image from "next/image";
import logo from "../../../assets/logo-transparent.png";
import LoginForm from "@/components/auth/login-form";
import Footer from "@/components/landing/Footer";

export default function LoginPage() {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      
      {/* Main Content Area */}
      <div className="flex-1 flex">
        
        {/* Left Side - Branding (Hidden on mobile) */}
        <div className="hidden lg:flex lg:w-1/2 relative hero-bg overflow-hidden flex-col">
          {/* Background Glows */}
          <div className="absolute top-1/4 -left-32 w-[500px] h-[500px] bg-[#1A5FB4]/20 rounded-full blur-[120px]" />
          <div className="absolute bottom-0 right-0 w-80 h-80 bg-[#3584E4]/15 rounded-full blur-[100px]" />
          <div className="absolute top-0 right-1/4 w-64 h-64 bg-[#62A0EA]/10 rounded-full blur-[80px]" />

          {/* Subtle Grid Pattern Overlay */}
          <div
            className="absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)",
              backgroundSize: "60px 60px",
            }}
          />

          {/* Top Section - Logo (Acts as the ONLY back button on L screens) */}
          <div className="relative z-10 pt-12 px-16">
            <Link
              href="/"
              className="inline-flex items-center gap-5 hover:opacity-80 transition-opacity"
            >
              <Image
                src={logo}
                alt="CHATCO"
                width={95}
                height={95}
                className="rounded-2xl"
              />
              <span className="text-4xl font-extrabold tracking-tight text-white">
                CHATCO
              </span>
            </Link>
          </div>

          {/* Center Section - Hero Content */}
          <div className="relative z-10 flex-1 flex flex-col justify-center px-16 py-12">
            <h1 className="text-5xl xl:text-6xl font-extrabold leading-[1.1] tracking-tight text-white">
              Commuting
              <br />
              <span className="text-[#62A0EA]">Reimagined.</span>
            </h1>
            <p className="mt-6 text-lg text-white/50 max-w-lg leading-relaxed">
              Access your digital wallet, track your rides in real-time, and commute smarter every day.
            </p>

            {/* Stats Row */}
            <div className="mt-14 flex gap-10">
              <div className="border-l-2 border-[#62A0EA]/40 pl-5">
                <div className="text-3xl font-bold text-white">10k+</div>
                <div className="text-sm text-white/40 mt-1">Active Commuters</div>
              </div>
              <div className="border-l-2 border-[#62A0EA]/40 pl-5">
                <div className="text-3xl font-bold text-white">99.9%</div>
                <div className="text-sm text-white/40 mt-1">Uptime</div>
              </div>
              <div className="border-l-2 border-[#62A0EA]/40 pl-5">
                <div className="text-3xl font-bold text-white">1M+</div>
                <div className="text-sm text-white/40 mt-1">Rides Completed</div>
              </div>
            </div>
          </div>

          {/* Bottom Section - Floating Feature Cards */}
          <div className="relative z-10 px-16 pb-12">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/[0.06] backdrop-blur-sm border border-white/[0.08] rounded-2xl p-5">
                <div className="w-10 h-10 rounded-xl bg-[#62A0EA]/20 flex items-center justify-center mb-3">
                  <svg className="w-5 h-5 text-[#62A0EA]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                </div>
                <div className="text-sm font-semibold text-white">Digital Wallet</div>
                <div className="text-xs text-white/40 mt-1">Tap & pay seamlessly</div>
              </div>
              <div className="bg-white/[0.06] backdrop-blur-sm border border-white/[0.08] rounded-2xl p-5">
                <div className="w-10 h-10 rounded-xl bg-[#62A0EA]/20 flex items-center justify-center mb-3">
                  <svg className="w-5 h-5 text-[#62A0EA]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <div className="text-sm font-semibold text-white">Live Tracking</div>
                <div className="text-xs text-white/40 mt-1">Know your ride's ETA</div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Form */}
        <div className="relative w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 pt-16 lg:pt-12 bg-white">
          
          {/* NO BACK BUTTON ON LARGE SCREENS HERE ANYMORE */}

          <div className="w-full max-w-md">
            
            {/* Mobile: Go back to home page (Visible on S/M, hidden on L) */}
            <Link 
              href="/" 
              className="lg:hidden inline-flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-[#1A5FB4] transition-colors mb-10"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
              </svg>
              Go back to home page
            </Link>

            <LoginForm />
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}