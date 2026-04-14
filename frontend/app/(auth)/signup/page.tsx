import Link from "next/link";
import SignupForm from "@/components/auth/signup-form";
import Footer from "@/components/landing/Footer";

export default function SignupPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC]">
      
      {/* Clean, Compact Top Navigation */}
      <div className="w-full px-4 sm:px-6 py-3 flex items-center justify-between bg-white/80 backdrop-blur-md border-b border-gray-100 sticky top-0 z-50">
        <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <div className="w-9 h-9 rounded-lg bg-[#1A5FB4] flex items-center justify-center">
            <span className="text-white font-bold text-sm">C</span>
          </div>
          <span className="text-xl font-bold tracking-tight text-[#071A2E]">CHATCO</span>
        </Link>
        
        {/* Back to Home - Always visible in top right */}
        <Link 
          href="/" 
          className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-[#1A5FB4] transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
          </svg>
          <span className="hidden sm:inline">Back to Home</span>
        </Link>
      </div>

      {/* Centered Form Card - No more side buttons eating up space */}
      <div className="flex-1 flex items-start justify-center px-4 sm:px-6 pb-12 pt-6 overflow-y-auto">
        <div className="w-full max-w-3xl bg-white rounded-2xl shadow-xl shadow-gray-200/50 border border-gray-100 p-6 sm:p-8 mt-4">
          <SignupForm />
        </div>
      </div>

      <Footer />
    </div>
  );
}