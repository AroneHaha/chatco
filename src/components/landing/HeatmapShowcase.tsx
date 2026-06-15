import Section from "@/components/ui/Section";

export default function HeatmapShowcase() {
  const steps = [
    { color: "bg-[#62A0EA]/20", text: "text-[#62A0EA]", num: "1", desc: "Tap 'Pick Me Up' — your exact GPS location is broadcasted securely" },
    { color: "bg-[#FFB800]/20", text: "text-[#FFB800]", num: "2", desc: "CHATCO's smart network flags your stop as a high-priority pick-up zone" },
    { color: "bg-[#FF6D3A]/20", text: "text-[#FF6D3A]", num: "3", desc: "Drivers will be alerted to avoid missing waiting commuters." },
    { color: "bg-emerald-500/20", text: "text-emerald-400", num: "4", desc: "Your jeepney arrives faster — no more endless waiting in the dark or rain" },
  ];

  return (
    <Section id="smart-hailing" dark>
      <div className="grid lg:grid-cols-2 gap-12 items-center">
        <div>
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/10 text-xs font-medium text-[#62A0EA] mb-5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#FF6D3A] animate-pulse" /> Smart Hailing
          </span>
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white">Stop Waiting.<br /><span className="text-[#FF6D3A]">Start Hailing.</span></h2>
          <p className="mt-5 text-white/50 leading-relaxed">No more shouting &ldquo;Para!&rdquo; into the void or hoping a jeepney passes by. With one tap, CHATCO signals nearby drivers exactly where you are, ensuring jeeps go where they&apos;re needed most.</p>
          
          <div className="mt-8 space-y-4">
            {steps.map((s) => (
              <div key={s.num} className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-0.5">
                  <span className={`w-6 h-6 rounded-md ${s.color} flex items-center justify-center ${s.text} text-xs font-bold`}>{s.num}</span>
                </div>
                <p className="text-sm text-white/70">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Right — Activity Map Visual (Reframed from "Heatmap") */}
        <div className="relative">
          <div className="relative w-full aspect-[16/10] bg-[#050F1A] rounded-2xl overflow-hidden border border-white/5">
            {/* Grid & Roads */}
            <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "linear-gradient(rgba(26,95,180,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(26,95,180,0.4) 1px, transparent 1px)", backgroundSize: "48px 48px" }} />
            <div className="absolute top-[42%] left-0 right-0 h-[3px] bg-[#1A5FB4]/25" />
            <div className="absolute top-0 bottom-0 left-[38%] w-[3px] bg-[#1A5FB4]/25" />

            {/* Hotspots - Same visual, but now represents "Your Hail" attracting drivers */}
            <div className="absolute top-[36%] left-[34%]">
              <div className="w-36 h-36 rounded-full" style={{ background: "radial-gradient(circle, rgba(255,59,59,0.7) 0%, rgba(255,107,53,0.35) 35%, transparent 65%)" }} />
              <div className="absolute inset-0 flex items-center justify-center"><div className="w-8 h-8 rounded-full bg-[#FF3B3B]/30 pulse-ring" /></div>
              <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[10px] text-white font-semibold whitespace-nowrap bg-black/30 px-2 py-0.5 rounded-full">Balagtas</span>
            </div>
            <div className="absolute top-[65%] left-[18%]">
              <div className="w-28 h-28 rounded-full" style={{ background: "radial-gradient(circle, rgba(255,107,53,0.6) 0%, rgba(255,184,0,0.25) 40%, transparent 65%)" }} />
              <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[10px] text-white font-semibold whitespace-nowrap bg-black/30 px-2 py-0.5 rounded-full">Marilao</span>
            </div>
            <div className="absolute top-[22%] left-[60%]">
              <div className="w-24 h-24 rounded-full" style={{ background: "radial-gradient(circle, rgba(255,184,0,0.5) 0%, rgba(255,184,0,0.15) 45%, transparent 65%)" }} />
              <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[10px] text-white font-semibold whitespace-nowrap bg-black/30 px-2 py-0.5 rounded-full">Calumpit</span>
            </div>

            {/* Legend & Live Badge - Changed copy to reflect Commuter view */}
            <div className="absolute bottom-3 right-3 bg-black/50 backdrop-blur-md rounded-lg px-3 py-2 border border-white/5">
              <div className="text-[9px] text-white/50 font-medium uppercase tracking-wider mb-1.5">Pick-up Activity</div>
              <div className="flex items-center gap-3">
                {[{c:"bg-[#FFB800]",l:"Quiet"}, {c:"bg-[#FF6D3A]",l:"Active"}, {c:"bg-[#FF3B3B]",l:"Hot"}].map((i)=>(
                  <div key={i.l} className="flex items-center gap-1"><div className={`w-2.5 h-2.5 rounded-full ${i.c}`} /><span className="text-[9px] text-white/40">{i.l}</span></div>
                ))}
              </div>
            </div>
            <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-black/50 backdrop-blur-md rounded-full px-2.5 py-1 border border-white/5">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              <span className="text-[9px] text-white/60 font-medium">HAILING</span>
            </div>
          </div>
        </div>
      </div>
    </Section>
  );
}