// components/admin/dashboard/dashboard-settings-carousel.tsx
// System settings carousel — extracted from admin-dashboard/page.tsx

"use client";

import { useRef } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { SettingsModule } from "@/app/(admin)/admin-dashboard/data/dashboard-data";

interface DashboardSettingsCarouselProps {
  settingsModules: SettingsModule[];
}

export function DashboardSettingsCarousel({ settingsModules }: DashboardSettingsCarouselProps) {
  const carouselRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: "left" | "right") => {
    if (carouselRef.current) {
      const scrollAmount = 300;
      carouselRef.current.scrollBy({ left: direction === "left" ? -scrollAmount : scrollAmount, behavior: "smooth" });
    }
  };

  return (
    <div className="bg-[#131C2E] border border-[#1E2D45] rounded-lg p-6 relative">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-base font-bold text-white">System Settings</h2>
          <p className="text-xs text-slate-400 mt-0.5">Quick access to core configurations.</p>
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={() => scroll("left")}
            className="w-8 h-8 rounded-md bg-[#0E1628] hover:bg-[#1A2540] flex items-center justify-center text-slate-400 hover:text-white transition-colors border border-[#1E2D45]"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => scroll("right")}
            className="w-8 h-8 rounded-md bg-[#0E1628] hover:bg-[#1A2540] flex items-center justify-center text-slate-400 hover:text-white transition-colors border border-[#1E2D45]"
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
        {settingsModules.map((mod) => (
          <Link 
            key={mod.title} 
            href={mod.href}
            className="flex-shrink-0 w-[280px] h-[140px] rounded-md p-5 flex flex-col justify-between group hover:border-[#2A3A55] transition-all snap-start border border-[#1E2D45]"
            style={{ background: mod.gradient }}
          >
            <div className={`w-10 h-10 rounded-md bg-white/10 flex items-center justify-center ${mod.iconColor} group-hover:scale-110 transition-transform`}>
              <mod.icon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">{mod.title}</h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">{mod.desc}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
