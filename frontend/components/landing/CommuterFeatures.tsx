import Section from "@/components/ui/Section";
import { Icons } from "@/components/icons";

export default function CommuterFeatures() {
  const features = [
    { icon: Icons.wallet, title: "Digital Wallet", desc: "Load your balance anytime. Works seamlessly with offline QR scanning — no signal, no problem." },
    { icon: Icons.qr, title: "Offline QR Code", desc: "Your unique account QR is generated locally. Conductor scans, inputs fare, transaction syncs when online." },
    { icon: Icons.mapPin, title: "Real-Time Tracking", desc: "See exactly where your jeepney is on the map via the Conductor's GPS. Know arrival before you wait." },
    { icon: Icons.chart, title: "Automated Fare Calc", desc: "Input your destination, get the exact LTFRB-compliant fare. No guessing, no overcharging." },
    { icon: Icons.search, title: "Pick Me Up Signal", desc: "Waiting in the rain or dark? Tap 'Pick Me Up' — the Conductor gets an audible alert to spot you." },
    { icon: Icons.share, title: "GCash Integration", desc: "Prefer GCash? Generate a payment proof image for the Conductor to verify. Fully supported." },
  ];

  return (
    <Section id="features" className="bg-[#F0F7FF]">
      <div className="text-center mb-14">
        <span className="text-xs font-semibold text-[#1A5FB4] uppercase tracking-widest">Commuter Features</span>
        <h2 className="mt-3 text-3xl md:text-4xl font-extrabold tracking-tight">Everything You Need for the Ride</h2>
        <p className="mt-3 text-gray-500 max-w-xl mx-auto">From hailing to payment to safety — your entire jeepney experience, digitized.</p>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {features.map((f) => (
          <div key={f.title} className="group rounded-2xl border border-gray-100 bg-white p-6 hover:shadow-xl hover:shadow-[#1A5FB4]/5 transition-all duration-300 hover:-translate-y-1">
            <div className="w-12 h-12 rounded-xl bg-[#DAEEFF] text-[#1A5FB4] flex items-center justify-center mb-4 group-hover:bg-[#1A5FB4] group-hover:text-white transition-colors duration-300">{f.icon}</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">{f.title}</h3>
            <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
          </div>
        ))}
      </div>
    </Section>
  );
}