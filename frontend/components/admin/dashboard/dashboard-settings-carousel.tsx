"use client";

import { useRef } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { SettingsModule } from "@/app/(admin)/admin-dashboard/data/dashboard-data";

interface DashboardSettingsCarouselProps {
  modules: SettingsModule[];
}

export function DashboardSettingsCarousel({ modules }: DashboardSettingsCarouselProps) {
  const carouselRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: "left" | "right") => {
    if (carouselRef.current) {
      const scrollAmount = 300;
      carouselRef.current.scrollBy({ left: direction === "left" ? -scrollAmount : scrollAmount, behavior: "smooth" });
    }
  };

  return (
    // No card chrome here — this is navigation, not data, so it sits
    // directly on the page (a hairline top rule separates it from the
    // Recent Activity panel above) instead of matching that panel's weight.
    <div className="relative pt-5 border-t border-[#1E2D45]">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Quick Links</h2>
          <p className="text-xs text-slate-500 mt-1">Jump to configuration and management tools.</p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => scroll("left")}
            className="w-8 h-8 rounded-md bg-[#131C2E] hover:bg-[#1A2540] flex items-center justify-center text-slate-400 hover:text-white transition-colors border border-[#1E2D45]"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => scroll("right")}
            className="w-8 h-8 rounded-md bg-[#131C2E] hover:bg-[#1A2540] flex items-center justify-center text-slate-400 hover:text-white transition-colors border border-[#1E2D45]"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div 
        ref={carouselRef} 
        className="flex gap-5 overflow-x-auto scroll-smooth pb-2 snap-x snap-mandatory" 
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {modules.map((mod) => (
          <Link
            key={mod.title}
            href={mod.href}
            className="shrink-0 w-70 h-35 rounded-lg p-5 flex flex-col justify-between group snap-start border border-[#1E2D45] bg-[#0E1628] hover:border-[#2A3A55] hover:bg-[#131C2E] transition-colors"
          >
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${mod.color}`}>
              <mod.icon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">{mod.title}</h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">{mod.desc}</p>
            </div>
          </Link>
        ))}
      </div>

      <style jsx global>{`
        div::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
}
