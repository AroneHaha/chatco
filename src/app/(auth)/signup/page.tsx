import Link from "next/link";
import Image from "next/image";
import logo from "../../../assets/logo-transparent.png";
import SignupForm from "@/components/auth/signup-form";
import Footer from "@/components/landing/Footer";

export default function SignupPage() {
  return (
    <div className="min-h-screen flex flex-col bg-white">

      {/* Main Content Area */}
      <div className="flex-1 flex">

        {/* Left Side - Registration Info (Hidden on mobile) */}
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
                width={80}
                height={80}
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
              Start Commuting
              <br />
              <span className="text-[#62A0EA]">Smarter.</span>
            </h1>
            <p className="mt-6 text-lg text-white/50 max-w-lg leading-relaxed">
              Create your account to access digital payments, real-time tracking, and seamless daily rides.
            </p>
          </div>

          {/* Bottom Section - Registration Info Cards */}
          <div className="relative z-10 px-16 pb-12 space-y-4">
            <div className="bg-white/[0.06] backdrop-blur-sm border border-white/[0.08] rounded-2xl p-5">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-[#62A0EA]/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg className="w-5 h-5 text-[#62A0EA]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                  </svg>
                </div>
                <div>
                  <div className="text-sm font-semibold text-white">24-Hour Verification</div>
                  <div className="text-xs text-white/40 mt-1 leading-relaxed">Your identity and details are reviewed securely within 24 hours. You'll be ready to ride shortly after.</div>
                </div>
              </div>
            </div>
            <div className="bg-white/[0.06] backdrop-blur-sm border border-white/[0.08] rounded-2xl p-5">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-[#62A0EA]/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg className="w-5 h-5 text-[#62A0EA]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
                  </svg>
                </div>
                <div>
                  <div className="text-sm font-semibold text-white">Valid ID = Discounts</div>
                  <div className="text-xs text-white/40 mt-1 leading-relaxed">Submitting a valid ID is mandatory if you are claiming Student, Senior Citizen, or PWD commuter discounts.</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Form */}
        <div className="relative w-full lg:w-1/2 flex items-center justify-center p-8 sm:p-12 lg:p-16 pt-20 lg:pt-12 bg-white">
          
          {/* NO BACK BUTTON ON LARGE SCREENS HERE ANYMORE */}

          {/* Generous width container */}
          <div className="w-full max-w-2xl">
            
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

            <SignupForm />
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}