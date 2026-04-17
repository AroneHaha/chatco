// components/landing/CommuterFeatures.tsx
import { Wallet, QrCode, MapPin, Calculator, Megaphone, Smartphone, ShieldCheck, Gift } from "lucide-react";

export default function CommuterFeatures() {
  const features = [
    { icon: QrCode, title: "Offline QR Payments", desc: "No internet? No problem. Your unique QR is scanned locally and syncs automatically when you're back online.", color: "bg-blue-50 text-blue-600" },
    { icon: MapPin, title: "Live GPS Tracking", desc: "See exactly where your ride is on the map. Know arrival times before you step out to wait.", color: "bg-green-50 text-green-600" },
    { icon: Calculator, title: "Auto Fare Calculator", desc: "Enter your destination and get exact LTFRB-compliant fares instantly. No guessing, no overcharging.", color: "bg-purple-50 text-purple-600" },
    { icon: Megaphone, title: "Pick Me Up Signal", desc: "Waiting in the dark or rain? Tap to send an alert straight to the conductor's device.", color: "bg-orange-50 text-orange-600" },
    { icon: Wallet, title: "Digital Wallet & GCash", desc: "Top up your balance seamlessly or generate GCash proofs for manual verification.", color: "bg-cyan-50 text-cyan-600" },
    { icon: ShieldCheck, title: "Share My Ride", desc: "Generate a live tracking link for family and friends to ensure you arrive safely.", color: "bg-red-50 text-red-600" },
    { icon: Gift, title: "Ride & Earn Rewards", desc: "Every cashless ride earns points. Hit the threshold and unlock free ride vouchers.", color: "bg-yellow-50 text-yellow-600" },
    { icon: Smartphone, title: "AI Chat Assistant", desc: "Got questions? Our built-in AI assistant instantly helps with fares, routes, and support.", color: "bg-indigo-50 text-indigo-600" },
  ];

  return (
    <section id="features" className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-5 md:px-8">
        <div className="text-center mb-16 max-w-2xl mx-auto">
          <span className="text-xs font-bold text-[#1A5FB4] uppercase tracking-widest">Built for Commuters</span>
          <h2 className="mt-4 text-3xl md:text-5xl font-extrabold tracking-tight text-gray-900">
            Everything you need, <br className="hidden sm:block"/>in one tap.
          </h2>
          <p className="mt-4 text-lg text-gray-500">
            From hailing to payment to safety—we've digitized every step of your jeepney journey.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((f) => {
            const Icon = f.icon;
            return (
              <div key={f.title} className="group p-6 rounded-2xl border border-gray-100 hover:border-transparent hover:shadow-2xl hover:shadow-gray-200/50 transition-all duration-300 hover:-translate-y-1 bg-white">
                <div className={`w-14 h-14 rounded-2xl ${f.color} flex items-center justify-center mb-5 transition-transform group-hover:scale-110`}>
                  <Icon size={24} strokeWidth={1.5} />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{f.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}