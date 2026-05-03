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
  paymentTendencies,
} from "./data/dashboard-data";

const AdminCommuterMap = dynamic(() => import("@/components/admin/admin-commuter-map"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-[#050F1A] rounded-lg animate-pulse flex items-center justify-center border border-[#1E2D45]">
      <p className="text-slate-600 text-sm">Loading map...</p>
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
          <p className="text-sm text-slate-400 mt-1">Welcome back. Here&apos;s what&apos;s happening across your network today.</p>
        </div>
        <Link href="/settings" className="group flex items-center gap-2 text-sm font-medium text-[#62A0EA] hover:text-[#99C1F1] transition-colors w-fit">
          Open Full Settings
          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </Link>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {quickStats.map((stat) => (
          <Link key={stat.label} href={stat.link} className="bg-[#131C2E] border border-[#1E2D45] rounded-lg p-4 flex items-center gap-4 hover:border-[#2A3A55] transition-all">
            <div className={`w-10 h-10 rounded-lg ${stat.color} flex items-center justify-center flex-shrink-0`}>
              <stat.icon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">{stat.label}</p>
              <p className="text-xl font-bold text-white mt-0.5">{stat.value}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* Main Grid: Map & Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Live Map Preview */}
        <div className="bg-[#131C2E] border border-[#1E2D45] rounded-lg p-1 h-[380px] flex flex-col">
          <div className="px-4 pt-3 pb-2 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <MapPin className="w-4 h-4 text-[#62A0EA]" /> Live Monitoring
            </h3>
            <Link href="/monitoring" className="text-xs text-[#62A0EA] hover:underline">View Full Map</Link>
          </div>
          <div className="flex-1 rounded-md overflow-hidden border border-[#162033] mx-1 mb-1">
            <AdminCommuterMap isDesktop={false} />
          </div>
        </div>

        {/* Right Side: Analytics Previews */}
        <div className="flex flex-col gap-6">
          <div className="flex-1 bg-[#131C2E] border border-[#1E2D45] rounded-lg p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-white">Payment Tendencies (Today)</h3>
              <Link href="/analytics" className="text-xs text-[#62A0EA] hover:underline">More Analytics</Link>
            </div>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-xs text-slate-300">Chatco Wallet</span>
                  <span className="text-xs font-bold text-slate-200">{paymentTendencies.chatcoWallet}%</span>
                </div>
                <div className="h-2 bg-[#0E1628] rounded-full overflow-hidden">
                  <div className="h-full bg-[#62A0EA] rounded-full" style={{ width: `${paymentTendencies.chatcoWallet}%` }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-xs text-slate-300">Cash</span>
                  <span className="text-xs font-bold text-slate-200">{paymentTendencies.cash}%</span>
                </div>
                <div className="h-2 bg-[#0E1628] rounded-full overflow-hidden">
                  <div className="h-full bg-slate-500 rounded-full" style={{ width: `${paymentTendencies.cash}%` }} />
                </div>
              </div>
            </div>
          </div>

          {/* Top Pickup Points */}
          <div className="flex-1 bg-[#131C2E] border border-[#1E2D45] rounded-lg p-5">
            <h3 className="text-sm font-semibold text-white mb-4">Top Pickup Points</h3>
            <div className="space-y-3">
              {topPickupPoints.map((p, i) => (
                <div key={p.name} className="flex items-center gap-3">
                  <span className="text-xs font-bold text-slate-500 w-3">{i + 1}</span>
                  <div className="flex-1">
                    <div className="flex justify-between mb-1">
                      <span className="text-xs text-slate-300">{p.name}</span>
                      <span className="text-xs text-slate-500">{p.val}</span>
                    </div>
                    <div className="h-1.5 bg-[#0E1628] rounded-full overflow-hidden">
                      <div className="h-full bg-[#62A0EA] rounded-full" style={{ width: `${(p.val / 1420) * 100}%` }} />
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
        <div className="bg-[#131C2E] border border-[#1E2D45] rounded-lg p-5 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Truck className="w-4 h-4 text-[#62A0EA]" /> Vehicles
            </h3>
            <Link href="/vehicles" className="text-xs text-[#62A0EA] hover:underline">View All</Link>
          </div>
          <div className="space-y-3 flex-1">
            {recentVehicles.map((v) => (
              <div key={v.unit} className="flex items-center justify-between bg-[#0E1628] rounded-md p-2.5">
                <div>
                  <p className="text-xs font-semibold text-slate-200">{v.unit}</p>
                  <p className="text-xs text-slate-500">{v.driver}</p>
                </div>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-md ${
                  v.status === "Active" ? "bg-sky-400/15 text-sky-400" : "bg-amber-400/15 text-amber-400"
                }`}>
                  {v.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Lost & Found */}
        <div className="bg-[#131C2E] border border-[#1E2D45] rounded-lg p-5 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Search className="w-4 h-4 text-[#62A0EA]" /> Lost & Found
            </h3>
            <Link href="/lost-found" className="text-xs text-[#62A0EA] hover:underline">View All</Link>
          </div>
          <div className="space-y-3 flex-1">
            {recentLostFound.map((item) => (
              <div key={item.item} className="flex items-center justify-between bg-[#0E1628] rounded-md p-2.5">
                <p className="text-xs text-slate-200">{item.item}</p>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-md ${
                  item.status === "Returned" ? "bg-sky-400/15 text-sky-400" : 
                  item.status === "Under Review" ? "bg-[#62A0EA]/15 text-[#62A0EA]" : "bg-amber-400/15 text-amber-400"
                }`}>
                  {item.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* User Management */}
        <div className="bg-[#131C2E] border border-[#1E2D45] rounded-lg p-5 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-[#62A0EA]" /> Users
            </h3>
            <Link href="/users" className="text-xs text-[#62A0EA] hover:underline">View All</Link>
          </div>
          <div className="space-y-3 flex-1">
            {recentUsers.map((u) => (
              <div key={u.name} className="flex items-center justify-between bg-[#0E1628] rounded-md p-2.5">
                <div>
                  <p className="text-xs font-semibold text-slate-200">{u.name}</p>
                  <p className="text-xs text-slate-500">{u.role}</p>
                </div>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-md ${
                  u.status === "Active" ? "bg-sky-400/15 text-sky-400" : "bg-slate-500/15 text-slate-500"
                }`}>
                  {u.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ─── SYSTEM SETTINGS CAROUSEL ─── */}
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

      <style jsx global>{`
        div::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
}