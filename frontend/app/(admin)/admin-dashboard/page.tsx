"use client";

import { useRef } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  MapPin,
  Users,
  Truck,
  Search,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
} from "lucide-react";

import {
  recentVehicles,
  recentLostFound,
  recentUsers,
  quickStats,
  settingsModules,
  topPickupPoints,
} from "./data/dashboard-data";

const AdminCommuterMap = dynamic(() => import("@/components/admin/admin-commuter-map"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-[#050F1A] rounded-xl animate-pulse flex items-center justify-center border border-white/10">
      <p className="text-white/20 text-sm">Loading map...</p>
    </div>
  ),
});

export default function DashboardHome() {
  const carouselRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: "left" | "right") => {
    if (carouselRef.current) {
      const scrollAmount = 300;
      carouselRef.current.scrollBy({ left: direction === "left" ? -scrollAmount : scrollAmount, behavior: "smooth" });
    }
  };

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-sm text-white/40 mt-1">Welcome back. Here&apos;s what&apos;s happening across your network today.</p>
        </div>
        <Link href="/settings" className="group flex items-center gap-2 text-sm font-medium text-[#62A0EA] hover:text-[#99C1F1] transition-colors w-fit">
          Open Full Settings
          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </Link>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {quickStats.map((stat) => (
          <Link key={stat.label} href={stat.link} className="bg-white/[0.04] border border-white/10 rounded-xl p-4 flex items-center gap-4 hover:border-white/20 transition-all">
            <div className={`w-10 h-10 rounded-lg ${stat.color} flex items-center justify-center flex-shrink-0`}>
              <stat.icon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-medium text-white/40 uppercase tracking-wider">{stat.label}</p>
              <p className="text-xl font-bold text-white mt-0.5">{stat.value}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* Main Grid: Map & Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Live Map Preview */}
        <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-1 h-[380px] flex flex-col">
          <div className="px-4 pt-3 pb-2 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <MapPin className="w-4 h-4 text-[#62A0EA]" /> Live Monitoring
            </h3>
            <Link href="/monitoring" className="text-xs text-[#62A0EA] hover:underline">View Full Map</Link>
          </div>
          <div className="flex-1 rounded-xl overflow-hidden border border-white/[0.06] mx-1 mb-1">
            <AdminCommuterMap isDesktop={false} />
          </div>
        </div>

        {/* Right Side: Analytics Previews */}
        <div className="flex flex-col gap-6">
          {/* Payment Split */}
          <div className="flex-1 bg-white/[0.04] border border-white/10 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-white">Payment Tendencies (Today)</h3>
              <Link href="/analytics" className="text-xs text-[#62A0EA] hover:underline">More Analytics</Link>
            </div>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-xs text-white/70">Chatco Wallet</span>
                  <span className="text-xs font-bold text-white/80">78%</span>
                </div>
                <div className="h-2 bg-white/[0.06] rounded-full overflow-hidden">
                  <div className="h-full bg-[#62A0EA] rounded-full w-[78%]" />
                </div>
              </div>
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-xs text-white/70">Cash</span>
                  <span className="text-xs font-bold text-white/80">22%</span>
                </div>
                <div className="h-2 bg-white/[0.06] rounded-full overflow-hidden">
                  <div className="h-full bg-white/20 rounded-full w-[22%]" />
                </div>
              </div>
            </div>
          </div>

          {/* Top Pickup Points */}
          <div className="flex-1 bg-white/[0.04] border border-white/10 rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-white mb-4">Top Pickup Points</h3>
            <div className="space-y-3">
              {topPickupPoints.map((p, i) => (
                <div key={p.name} className="flex items-center gap-3">
                  <span className="text-[10px] font-bold text-white/30 w-3">{i + 1}</span>
                  <div className="flex-1">
                    <div className="flex justify-between mb-1">
                      <span className="text-xs text-white/60">{p.name}</span>
                      <span className="text-[10px] text-white/30">{p.val}</span>
                    </div>
                    <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                      <div className="h-full bg-[#1A5FB4] rounded-full" style={{ width: `${(p.val / 1420) * 100}%` }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Previews: Vehicles, Lost & Found, Users */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Vehicles / Fleet */}
        <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-5 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Truck className="w-4 h-4 text-[#62A0EA]" /> Vehicles
            </h3>
            <Link href="/vehicles" className="text-xs text-[#62A0EA] hover:underline">View All</Link>
          </div>
          <div className="space-y-3 flex-1">
            {recentVehicles.map((v) => (
              <div key={v.unit} className="flex items-center justify-between bg-white/[0.03] rounded-lg p-2.5">
                <div>
                  <p className="text-xs font-semibold text-white/80">{v.unit}</p>
                  <p className="text-[10px] text-white/30">{v.driver}</p>
                </div>
                <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                  v.status === "Active" ? "bg-green-500/15 text-green-400" : "bg-yellow-500/15 text-yellow-400"
                }`}>
                  {v.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Lost & Found */}
        <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-5 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Search className="w-4 h-4 text-[#62A0EA]" /> Lost & Found
            </h3>
            <Link href="/lost-found" className="text-xs text-[#62A0EA] hover:underline">View All</Link>
          </div>
          <div className="space-y-3 flex-1">
            {recentLostFound.map((item) => (
              <div key={item.item} className="flex items-center justify-between bg-white/[0.03] rounded-lg p-2.5">
                <p className="text-xs text-white/80">{item.item}</p>
                <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                  item.status === "Returned" ? "bg-green-500/15 text-green-400" : 
                  item.status === "Under Review" ? "bg-blue-500/15 text-blue-400" : "bg-yellow-500/15 text-yellow-400"
                }`}>
                  {item.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* User Management */}
        <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-5 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-[#62A0EA]" /> Users
            </h3>
            <Link href="/users" className="text-xs text-[#62A0EA] hover:underline">View All</Link>
          </div>
          <div className="space-y-3 flex-1">
            {recentUsers.map((u) => (
              <div key={u.name} className="flex items-center justify-between bg-white/[0.03] rounded-lg p-2.5">
                <div>
                  <p className="text-xs font-semibold text-white/80">{u.name}</p>
                  <p className="text-[10px] text-white/30">{u.role}</p>
                </div>
                <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                  u.status === "Active" ? "bg-green-500/15 text-green-400" : "bg-white/10 text-white/30"
                }`}>
                  {u.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ─── SYSTEM SETTINGS CAROUSEL ─── */}
      <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-6 relative">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-base font-bold text-white">System Settings</h2>
            <p className="text-xs text-white/40 mt-0.5">Quick access to core configurations.</p>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={() => scroll("left")}
              className="w-8 h-8 rounded-lg bg-white/[0.06] hover:bg-white/10 flex items-center justify-center text-white/60 hover:text-white transition-colors border border-white/10"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => scroll("right")}
              className="w-8 h-8 rounded-lg bg-white/[0.06] hover:bg-white/10 flex items-center justify-center text-white/60 hover:text-white transition-colors border border-white/10"
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
              className="flex-shrink-0 w-[280px] h-[140px] rounded-xl p-5 flex flex-col justify-between group hover:border-white/20 transition-all snap-start border border-white/10"
              style={{ background: mod.gradient }}
            >
              <div className={`w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center ${mod.iconColor} group-hover:scale-110 transition-transform`}>
                <mod.icon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">{mod.title}</h3>
                <p className="text-[11px] text-white/40 mt-1 leading-relaxed">{mod.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      <style jsx global>{`
        div::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
}