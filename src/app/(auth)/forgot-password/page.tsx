import Link from "next/link";
import Image from "next/image";
import logo from "../../../assets/logo-transparent.png";
import Footer from "@/components/landing/Footer";

export default function ForgotPasswordPage() {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      
      {/* Main Content */}
      <div className="flex-1 flex">
        
        {/* Left Side (Same Branding) */}
        <div className="hidden lg:flex lg:w-1/2 relative hero-bg overflow-hidden flex-col">
          
          {/* Background Glows */}
          <div className="absolute top-1/4 -left-32 w-[500px] h-[500px] bg-[#1A5FB4]/20 rounded-full blur-[120px]" />
          <div className="absolute bottom-0 right-0 w-80 h-80 bg-[#3584E4]/15 rounded-full blur-[100px]" />
          <div className="absolute top-0 right-1/4 w-64 h-64 bg-[#62A0EA]/10 rounded-full blur-[80px]" />

          {/* Grid Overlay */}
          <div
            className="absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)",
              backgroundSize: "60px 60px",
            }}
          />

          {/* Logo */}
          <div className="relative z-10 pt-12 px-16">
            <Link href="/" className="inline-flex items-center gap-5 hover:opacity-80">
              <Image src={logo} alt="CHATCO" width={95} height={95} />
              <span className="text-4xl font-extrabold text-white">CHATCO</span>
            </Link>
          </div>

          {/* Hero Text */}
          <div className="relative z-10 flex-1 flex flex-col justify-center px-16">
            <h1 className="text-5xl font-extrabold text-white leading-tight">
              Forgot your
              <br />
              <span className="text-[#62A0EA]">password?</span>
            </h1>
            <p className="mt-6 text-white/50 max-w-md">
              No worries. Enter your email and we’ll send you a reset link to get back on track.
            </p>
          </div>
        </div>

        {/* Right Side Form */}
        <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 pt-16 lg:pt-12">
          <div className="w-full max-w-md">

            {/* Mobile Back */}
            <Link 
              href="/login"
              className="lg:hidden inline-flex items-center gap-2 text-sm text-gray-500 hover:text-[#1A5FB4] mb-10"
            >
              ← Back to login
            </Link>

            {/* Form */}
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                Reset your password
              </h2>
              <p className="mt-2 text-sm text-gray-500">
                Enter your email address and we’ll send you a reset link.
              </p>

              <form className="mt-8 space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Email address
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="you@example.com"
                    className="mt-2 w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#1A5FB4] outline-none"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-[#1A5FB4] text-white py-3 rounded-xl font-semibold hover:bg-[#174a8c] transition"
                >
                  Send Reset Link
                </button>
              </form>

              {/* Back to login */}
              <p className="mt-6 text-sm text-gray-500 text-center">
                Remember your password?{" "}
                <Link href="/login" className="text-[#1A5FB4] font-medium hover:underline">
                  Sign in
                </Link>
              </p>
            </div>

          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}