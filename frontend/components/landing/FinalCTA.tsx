export default function FinalCTA() {
  return (
    <section className="hero-bg relative overflow-hidden">
      <div className="absolute inset-0">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#1A5FB4]/15 rounded-full blur-[150px]" />
      </div>
      <div className="relative max-w-7xl mx-auto px-5 md:px-8 py-24 text-center">
        <h2 className="text-3xl md:text-5xl font-extrabold text-white tracking-tight leading-tight">
          Ready to Modernize
          <br />
          Jeepney Operations?
        </h2>
        <p className="mt-5 text-white/50 max-w-lg mx-auto leading-relaxed">
          Whether you&apos;re a daily commuter, a conductor, or a fleet operator
          — CHATCO has a seat for you.
        </p>
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <a
            href="/login"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl text-sm font-bold bg-white text-[#071A2E] hover:bg-gray-100 transition-colors shadow-lg shadow-black/15"
          >
            Login to CHATCO
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3"
              />
            </svg>
          </a>
          <a
            href="#how-it-works"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl text-sm font-bold border border-white/20 text-white hover:bg-white/10 transition-colors"
          >
            Learn More
          </a>
        </div>
      </div>
    </section>
  );
}