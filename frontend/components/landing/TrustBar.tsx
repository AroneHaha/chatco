export default function TrustBar() {
  const items = [
    { label: "Offline-First", sub: "Works without internet" },
    { label: "LTFRB Compliant", sub: "Accurate fare rates" },
    { label: "3 Platforms", sub: "Commuter · Conductor · Admin" },
    { label: "Multi-Language", sub: "EN · FIL · Regional" },
  ];

  return (
    <section className="bg-[#F0F7FF] border-y border-[#DAEEFF]">
      <div className="max-w-7xl mx-auto px-5 md:px-8 py-5 flex flex-wrap items-center justify-center gap-8 md:gap-16 text-center">
        {items.map((t) => (
          <div key={t.label}>
            <div className="text-sm font-bold text-[#1A5FB4]">{t.label}</div>
            <div className="text-xs text-gray-400 mt-0.5">{t.sub}</div>
          </div>
        ))}
      </div>
    </section>
  );
}