export default function Footer({ compact = false }: { compact?: boolean }) {
  // --- COMPACT MODE (For Login / Signup pages) ---
  if (compact) {
    return (
      <footer className="bg-[#071A2E] border-t border-white/5">
        <div className="max-w-7xl mx-auto px-5 md:px-8 py-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-white/30">
          <span>&copy; {new Date().getFullYear()} CHATCO. All rights reserved.</span>
          <span>Built for Philippine jeepney transport</span>
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
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-[#1A5FB4] flex items-center justify-center">
                <span className="text-white font-bold text-xs">C</span>
              </div>
              <span className="text-lg font-bold text-white">CHATCO</span>
            </div>
            <p className="text-sm leading-relaxed">
              Smart jeepney commuting for the Philippines. Digital payments,
              real-time tracking, and fleet intelligence.
            </p>
          </div>

          {/* Platform */}
          <div>
            <h4 className="text-sm font-semibold text-white/70 uppercase tracking-wider mb-4">Platform</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="#features" className="hover:text-white transition-colors">Commuter App</a></li>
              <li><a href="#platform" className="hover:text-white transition-colors">Conductor App</a></li>
              <li><a href="#platform" className="hover:text-white transition-colors">Admin Portal</a></li>
              <li><a href="#commuter-demand-heatmap" className="hover:text-white transition-colors">Demand Heatmap</a></li>
            </ul>
          </div>

          {/* Features */}
          <div>
            <h4 className="text-sm font-semibold text-white/70 uppercase tracking-wider mb-4">Features</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="#features" className="hover:text-white transition-colors">Offline QR Pay</a></li>
              <li><a href="#safety" className="hover:text-white transition-colors">Share My Ride</a></li>
              <li><a href="#safety" className="hover:text-white transition-colors">AI Assistant</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Loyalty Rewards</a></li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="text-sm font-semibold text-white/70 uppercase tracking-wider mb-4">Company</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="#" className="hover:text-white transition-colors">About CHATCO</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Contact</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Privacy Policy</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Terms of Service</a></li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
          <span>&copy; {new Date().getFullYear()} CHATCO. All rights reserved.</span>
          <span className="text-white/20">Built for Philippine jeepney transport</span>
        </div>
      </div>
    </footer>
  );
}