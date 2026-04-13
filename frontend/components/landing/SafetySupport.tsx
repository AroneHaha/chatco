import Section from "@/components/ui/Section";
import { Icons } from "@/components/icons";

export default function SafetySupport() {
  const features = [
    {
      icon: Icons.share,
      title: "Share My Ride",
      desc: "Generate a live link for family and friends. They see your jeepney's real-time GPS location on a map — peace of mind for late-night or long commutes.",
    },
    {
      icon: Icons.search,
      title: "Lost & Found Reporter",
      desc: "Report lost items with trip details. Conductors log found items separately. Admin matches both in a centralized dashboard for verification and return.",
    },
    {
      icon: Icons.sparkles,
      title: "AI-Powered FAQ Assistant",
      desc: "A floating chat head that answers common questions instantly — fare rates, route details, how to top up, lost item procedures. Reduces support load, improves UX.",
    },
  ];

  const badges = [
    { icon: Icons.shield, label: "Emergency Panic Button" },
    { icon: Icons.mapPin, label: "Overspeeding Detection" },
    { icon: Icons.globe, label: "Multi-Language Support" },
  ];

  return (
    <Section id="safety">
      <div className="text-center mb-14">
        <span className="text-xs font-semibold text-[#1A5FB4] uppercase tracking-widest">
          Safety & Support
        </span>
        <h2 className="mt-3 text-3xl md:text-4xl font-extrabold tracking-tight">
          Your Safety, Always On
        </h2>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {features.map((f) => (
          <div
            key={f.title}
            className="rounded-2xl bg-[#F0F7FF] p-6 border border-[#DAEEFF]"
          >
            <div className="w-12 h-12 rounded-xl bg-[#1A5FB4] text-white flex items-center justify-center mb-4">
              {f.icon}
            </div>
            <h3 className="text-lg font-bold mb-2">{f.title}</h3>
            <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
          </div>
        ))}
      </div>

      <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
        {badges.map((b) => (
          <div
            key={b.label}
            className="flex items-center gap-2 px-4 py-2 rounded-full border border-gray-200 bg-white text-sm text-gray-600"
          >
            <span className="text-[#1A5FB4]">{b.icon}</span>
            {b.label}
          </div>
        ))}
      </div>
    </Section>
  );
}