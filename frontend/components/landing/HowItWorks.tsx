import Section from "@/components/ui/Section";

export default function HowItWorks() {
  const steps = [
    { step: "01", title: "Load Your Wallet", desc: "Create your commuter account and top up your digital wallet via GCash or over-the-counter loading. Your unique QR code is generated instantly — works offline." },
    { step: "02", title: "Ride & Scan", desc: "Board the jeepney, show your QR code to the Conductor. They scan it, input the fare, and payment is deducted — even without signal. Pending transactions auto-sync later." },
    { step: "03", title: "Track & Arrive", desc: "Follow your jeepney in real-time on the map. Share your ride with family for safety. Receive a digital receipt instantly after every cashless trip." },
  ];

  return (
    <Section id="how-it-works">
      <div className="text-center mb-14">
        <span className="text-xs font-semibold text-[#1A5FB4] uppercase tracking-widest">How It Works</span>
        <h2 className="mt-3 text-3xl md:text-4xl font-extrabold tracking-tight">Three Steps to Smarter Commuting</h2>
      </div>
      <div className="relative grid md:grid-cols-3 gap-8">
        <div className="hidden md:block absolute top-12 left-[20%] right-[20%] h-[2px] bg-gradient-to-r from-[#DAEEFF] via-[#1A5FB4]/30 to-[#DAEEFF]" />
        {steps.map((s) => (
          <div key={s.step} className="relative text-center">
            <div className="inline-flex items-center justify-center w-24 h-24 rounded-2xl bg-[#F0F7FF] border border-[#DAEEFF] mb-5">
              <span className="text-3xl font-extrabold text-[#1A5FB4]">{s.step}</span>
            </div>
            <h3 className="text-lg font-bold mb-2">{s.title}</h3>
            <p className="text-sm text-gray-500 leading-relaxed max-w-xs mx-auto">{s.desc}</p>
          </div>
        ))}
      </div>
    </Section>
  );
}