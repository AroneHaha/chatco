import { Bus } from "lucide-react";

export default function FinalCTA() {
  return (
    <section className="hero-bg relative overflow-hidden">
      <div className="absolute inset-0">
        <div className="absolute top-1/2 left-1/4 -translate-x-1/2 -translate-y-1/2 w-150 h-150 bg-[#1A5FB4]/15 rounded-full blur-[150px]" />
      </div>

      <div className="relative max-w-7xl mx-auto px-5 md:px-8 py-24">
        <div className="grid lg:grid-cols-2 gap-14 items-center">
          <div>
            <h2 className="font-editorial-serif font-medium text-3xl md:text-5xl text-white tracking-tight leading-tight">
              Ready to Modernize
              <br />
              Jeepney Operations?
            </h2>
            <p className="mt-5 text-white/50 max-w-md leading-relaxed">
              Whether you&apos;re a daily commuter, a conductor, or a fleet operator
              — CHATCO has a seat for you.
            </p>
          </div>

          {/* Boarding pass — echoes the Hero's Calumpit–Meycauayan dateline */}
          <div className="flex justify-center lg:justify-end">
            <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl shadow-black/30 overflow-hidden">
              <div className="p-6">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">CHATCO Pass</div>
                <div className="mt-5 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[10px] text-gray-400 uppercase tracking-wider">From</p>
                    <p className="text-lg font-bold text-gray-900">Calumpit</p>
                  </div>
                  <Bus size={18} className="text-[#1A5FB4] shrink-0" strokeWidth={2} />
                  <div className="text-right">
                    <p className="text-[10px] text-gray-400 uppercase tracking-wider">To</p>
                    <p className="text-lg font-bold text-gray-900">Meycauayan</p>
                  </div>
                </div>
              </div>

              <div className="relative border-t border-dashed border-gray-200">
                <span className="absolute -left-3 -top-3 w-6 h-6 rounded-full bg-[#071A2E]" />
                <span className="absolute -right-3 -top-3 w-6 h-6 rounded-full bg-[#071A2E]" />
              </div>

              <div className="p-6 space-y-3">
                <a
                  href="/login"
                  className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-full text-sm font-bold bg-[#1A5FB4] text-white hover:bg-[#164A8F] transition-colors shadow-lg shadow-[#1A5FB4]/25"
                >
                  Login to CHATCO
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                  </svg>
                </a>
                <a
                  href="#how-it-works"
                  className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-full text-sm font-bold border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Learn More
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
