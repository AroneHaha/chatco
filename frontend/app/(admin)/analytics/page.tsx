// components/dashboard/Monitoring.tsx
"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import DataTable, { Column } from "@/components/ui/DataTable";

// FIX: Dynamically import the map to disable SSR (Leaflet needs `window`)
const AdminCommuterMap = dynamic(() => import("@/components/admin/admin-commuter-map"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-[#050F1A] rounded-2xl animate-pulse flex items-center justify-center">
      <p className="text-white/20 text-sm">Loading map...</p>
    </div>
  ),
});

/* ─── MOCK DATA ─── */
const VEHICLES = [
  { unit: "XQJ 4728", driver: "Mhaku Jose Manalili", speed: 28, status: "normal", zone: "Malolos" },
  { unit: "VMY 9183", driver: "Mark Arone Dela Cruz", speed: 62, status: "overspeeding", zone: "Malolos–Meycauayan" },
  { unit: "RZP 6041", driver: "Rod Erick Dulalia", speed: 25, status: "normal", zone: "Meycauayan" },
  { unit: "LKW 3579", driver: "Marinel Carbonel", speed: 0, status: "idle", zone: "Meycauayan" },
  { unit: "TNB 8462", driver: "Nardong Putik", speed: 68, status: "overspeeding", zone: "Meycauayan–Calumpit" },
  { unit: "JHX 7905", driver: "Karding Dela Paz", speed: 30, status: "normal", zone: "Calumpit" },
  { unit: "PVR 6894", driver: "Nikola Tekla", speed: 27, status: "normal", zone: "Calumpit" },
  { unit: "QFD 2316", driver: "Alden Recharge", speed: 32, status: "normal", zone: "Malolos–Meycauayan" },
];

const WEEKLY_RIDES = [
  { day: "Mon", rides: 1680 },
  { day: "Tue", rides: 1520 },
  { day: "Wed", rides: 1740 },
  { day: "Thu", rides: 1610 },
  { day: "Fri", rides: 1890 },
  { day: "Sat", rides: 1240 },
  { day: "Sun", rides: 820 },
];

const ZONES_ANALYTICS = [
  { name: "Malolos", riders: 1420 },
  { name: "Meycauayan", riders: 980 },
  { name: "Calumpit", riders: 740 },
];

const CHATCO_WALLET_STATS = {
  activeUsers: 2340,
  weeklyTopUps: "₱45,200",
  weeklySpent: "₱38,150",
  weeklyTransactions: 6420,
};

const DAILY_WALLET_TXNS = [
  { day: "Mon", txns: 980 },
  { day: "Tue", txns: 910 },
  { day: "Wed", txns: 1050 },
  { day: "Thu", txns: 920 },
  { day: "Fri", txns: 1120 },
  { day: "Sat", txns: 840 },
  { day: "Sun", txns: 600 },
];

const PROFIT_DATA = {
  daily: "₱14,500",
  weekly: "₱101,500",
  monthly: "₱435,000",
};

const PAYMENT_TENDENCIES = [
  { method: "Chatco Wallet", percentage: 78, amount: "₱79,170", color: "bg-[#62A0EA]" },
  { method: "Cash", percentage: 22, amount: "₱22,330", color: "bg-white/20" },
];

const USER_METRICS = {
  newRegistrations: 125,
  siteVisits: 3420,
  activeWalletUsers: 2340,
};

const TOP_PICKUP_POINTS = [
  { name: "Malolos Terminal", count: 1420 },
  { name: "Meycauayan Crossing", count: 980 },
  { name: "Calumpit Town Proper", count: 740 },
  { name: "Guiguinto Stop", count: 320 },
  { name: "Marilao Highroad", count: 210 },
];

/* ─── Sub-components ─── */
function StatCard({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: string }) {
  return (
    <div className="bg-white/[0.04] border border-white/10 rounded-xl p-4">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-white/40">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${accent ?? "text-white"}`}>{value}</p>
      {sub && <p className="text-xs text-white/40 mt-0.5">{sub}</p>}
    </div>
  );
}

/* ─── Main Component ─── */
export default function Monitoring() {
  const [tab, setTab] = useState<"live" | "analytics">("live");

  const overspeedCount = VEHICLES.filter((v) => v.status === "overspeeding").length;
  const maxRides = Math.max(...WEEKLY_RIDES.map((d) => d.rides));
  const maxTxns = Math.max(...DAILY_WALLET_TXNS.map((d) => d.txns));
  const maxPickup = Math.max(...TOP_PICKUP_POINTS.map((p) => p.count));

  const columns: Column[] = [
    { key: "unit", label: "Unit", width: "w-[110px]", align: "left" },
    { key: "driver", label: "Driver", width: "w-[200px]", align: "left" },
    { key: "zone", label: "Location", width: "w-[200px]", align: "left" },
    { key: "speed", label: "Speed", width: "w-[100px]", align: "center" },
    { key: "status", label: "Status", width: "w-[150px]", align: "center" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Monitoring</h1>
        <p className="text-sm text-white/40 mt-1">
          Malolos – Meycauayan – Calumpit e-jeep corridor. Real-time tracking, speed enforcement, and ridership data.
        </p>
      </div>

      <div className="flex gap-1 bg-white/[0.04] rounded-xl p-1 w-fit">
        {(["live", "analytics"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-all capitalize ${
              tab === t ? "bg-[#1A5FB4] text-white shadow-lg shadow-[#1A5FB4]/30" : "text-white/50 hover:text-white/80"
            }`}
          >
            {t === "live" ? "Live Map" : "Analytics"}
          </button>
        ))}
      </div>

      {/* ═══ LIVE MAP TAB ═══ */}
      {tab === "live" && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="Total E-Jeeps" value={VEHICLES.length.toString()} sub="On this route" />
            <StatCard label="Moving" value={VEHICLES.filter((v) => v.status !== "idle").length.toString()} />
            <StatCard label="Overspeeding" value={overspeedCount.toString()} sub="Above 60 km/h" accent="text-red-400" />
            <StatCard label="Boarding Zones" value="3" sub="Malolos · Meycauayan · Calumpit" />
          </div>

          <div className="relative h-[400px] md:h-[500px] rounded-2xl overflow-hidden border border-white/10">
            <AdminCommuterMap isDesktop={true} />
          </div>

          <DataTable
            columns={columns}
            data={VEHICLES}
            rowClass={(row) => {
              const s = row.status as string;
              if (s === "overspeeding") return "bg-red-500/[0.06] border-l-2 border-l-red-500";
              if (s === "idle") return "opacity-50";
              return "";
            }}
            renderCell={(key, value, row) => {
              if (key === "speed") {
                const isOver = (row.status as string) === "overspeeding";
                const isIdle = (row.status as string) === "idle";
                return (
                  <span className={`flex items-center justify-center gap-1 font-semibold ${isOver ? "text-red-400" : isIdle ? "text-white/30" : "text-white/70"}`}>
                    {isOver && (
                      <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.168 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495ZM10 6a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 10 6Zm0 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" />
                      </svg>
                    )}
                    {value} km/h
                  </span>
                );
              }
              if (key === "status") {
                const s = value as string;
                const map: Record<string, { label: string; cls: string }> = {
                  normal: { label: "Normal", cls: "bg-green-500/15 text-green-400" },
                  overspeeding: { label: "OVERSPEEDING", cls: "bg-red-500/15 text-red-400 font-bold" },
                  idle: { label: "Idle", cls: "bg-yellow-500/15 text-yellow-400" },
                };
                const cfg = map[s] ?? map.normal;
                return <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] ${cfg.cls}`}>{cfg.label}</span>;
              }
              return null;
            }}
            actions={() => (
              <button className="text-xs text-[#62A0EA] hover:text-[#99C1F1] font-medium transition-colors">View</button>
            )}
            actionsWidth="w-[80px]"
          />
        </div>
      )}

      {/* ═══ ANALYTICS TAB ═══ */}
      {tab === "analytics" && (
        <div className="space-y-6">
          
          {/* ROW 1: Net Profit & User Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <StatCard label="Daily Profit" value={PROFIT_DATA.daily} accent="text-green-400" />
            <StatCard label="Weekly Profit" value={PROFIT_DATA.weekly} accent="text-green-400" />
            <StatCard label="Monthly Profit" value={PROFIT_DATA.monthly} accent="text-green-400" />
            <StatCard label="New Users (Week)" value={USER_METRICS.newRegistrations.toString()} sub="Registered" />
            <StatCard label="Site Visits (Week)" value={USER_METRICS.siteVisits.toLocaleString()} sub="Unique views" />
            <StatCard label="Active Wallets" value={USER_METRICS.activeWalletUsers.toLocaleString()} sub="Using Chatco Wallet" />
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* ROW 2 LEFT: Payment Tendencies & Profit Breakdown */}
            <div className="bg-white/[0.04] border border-white/10 rounded-xl p-5 space-y-6">
              <div>
                <h3 className="text-sm font-semibold text-white mb-4">Payment Tendencies</h3>
                <div className="space-y-4">
                  {PAYMENT_TENDENCIES.map((p) => (
                    <div key={p.method}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-medium text-white/70">{p.method}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-white/40">{p.amount}</span>
                          <span className="text-xs font-bold text-white/80">{p.percentage}%</span>
                        </div>
                      </div>
                      <div className="h-2.5 bg-white/[0.06] rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${p.color}`} style={{ width: `${p.percentage}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t border-white/[0.06] pt-4">
                <h4 className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-3">Revenue Split (This Week)</h4>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-white/60">Total Revenue</span>
                  <span className="text-white font-bold">₱101,500</span>
                </div>
                <div className="flex items-center justify-between text-sm mt-1">
                  <span className="text-white/60">Fare Gross</span>
                  <span className="text-white/70">₱123,500</span>
                </div>
                <div className="flex items-center justify-between text-sm mt-1">
                  <span className="text-white/60">Expenses / Deductions</span>
                  <span className="text-red-400">-₱22,000</span>
                </div>
              </div>
            </div>

            {/* ROW 2 RIGHT: Most Used Pickup Points */}
            <div className="bg-white/[0.04] border border-white/10 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-white mb-4">Most Used Pickup Points</h3>
              <div className="space-y-3">
                {TOP_PICKUP_POINTS.map((point, index) => (
                  <div key={point.name} className="flex items-center gap-3">
                    <div className={`w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${
                      index === 0 ? "bg-[#1A5FB4] text-white" : "bg-white/[0.06] text-white/40"
                    }`}>
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-white/70 font-medium truncate">{point.name}</span>
                        <span className="text-xs text-white/40 ml-2 flex-shrink-0">{point.count} pickups</span>
                      </div>
                      <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-[#1A5FB4] rounded-full transition-all" 
                          style={{ width: `${(point.count / maxPickup) * 100}%` }} 
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* ROW 3 LEFT: Weekly Ridership */}
            <div className="bg-white/[0.04] border border-white/10 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-white mb-4">Weekly Ridership</h3>
              <div className="flex items-end gap-3 h-48">
                {WEEKLY_RIDES.map((d) => (
                  <div key={d.day} className="flex-1 flex flex-col items-center gap-2">
                    <span className="text-[10px] text-white/40 font-medium">{d.rides}</span>
                    <div
                      className="w-full bg-[#1A5FB4] rounded-t-md transition-all"
                      style={{ height: `${(d.rides / maxRides) * 100}%`, minHeight: "8px" }}
                    />
                    <span className="text-[10px] text-white/50">{d.day}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* ROW 3 RIGHT: Boarding by Zone */}
            <div className="bg-white/[0.04] border border-white/10 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-white mb-4">Boarding by Zone</h3>
              <div className="space-y-4">
                {ZONES_ANALYTICS.sort((a, b) => b.riders - a.riders).map((z) => (
                  <div key={z.name}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs text-white/70 font-medium">{z.name}</span>
                      <span className="text-xs text-white/40">{z.riders} riders</span>
                    </div>
                    <div className="h-2 bg-white/[0.06] rounded-full overflow-hidden">
                      <div className="h-full bg-[#1A5FB4] rounded-full" style={{ width: `${(z.riders / ZONES_ANALYTICS[0].riders) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-5 pt-4 border-t border-white/[0.06]">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-white/40">Total route distance</span>
                  <span className="text-xs text-white/70 font-semibold">~14 km</span>
                </div>
                <div className="flex items-center justify-between mt-1.5">
                  <span className="text-xs text-white/40">Avg travel time</span>
                  <span className="text-xs text-white/70 font-semibold">~35 min</span>
                </div>
              </div>
            </div>
          </div>

          {/* ROW 4: CHATCO WALLET USAGE & FREQUENCY */}
          <div className="bg-white/[0.04] border border-white/10 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-5">
              <div className="w-7 h-7 bg-[#1A5FB4]/20 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-[#62A0EA]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a2.25 2.25 0 0 0-2.25-2.25H15a3 3 0 1 1-6 0H5.25A2.25 2.25 0 0 0 3 12m18 0v6a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 0 0-2.25-2.25H5.25A2.25 2.25 0 0 0 3 9m18 0V6a2.25 2.25 0 0 0-2.25-2.25H5.25A2.25 2.25 0 0 0 3 6v3" />
                </svg>
              </div>
              <h3 className="text-sm font-semibold text-white">Chatco Wallet</h3>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-white/30">Active Users</p>
                <p className="text-xl font-bold text-white mt-1">{CHATCO_WALLET_STATS.activeUsers.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-white/30">Weekly Top-Ups</p>
                <p className="text-xl font-bold text-green-400 mt-1">{CHATCO_WALLET_STATS.weeklyTopUps}</p>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-white/30">Weekly Spend</p>
                <p className="text-xl font-bold text-[#62A0EA] mt-1">{CHATCO_WALLET_STATS.weeklySpent}</p>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-white/30">Transactions</p>
                <p className="text-xl font-bold text-white mt-1">{CHATCO_WALLET_STATS.weeklyTransactions.toLocaleString()}</p>
              </div>
            </div>

            <div>
              <p className="text-xs text-white/40 mb-3">Daily Tap Frequency (This Week)</p>
              <div className="flex items-end gap-3 h-32">
                {DAILY_WALLET_TXNS.map((d) => (
                  <div key={d.day} className="flex-1 flex flex-col items-center gap-1.5">
                    <span className="text-[9px] text-white/30 font-medium">{d.txns}</span>
                    <div
                      className="w-full bg-[#62A0EA] rounded-t-sm transition-all"
                      style={{ height: `${(d.txns / maxTxns) * 100}%`, minHeight: "6px" }}
                    />
                    <span className="text-[9px] text-white/40">{d.day}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ROW 5: Speed Violations */}
          <div className="bg-white/[0.04] border border-white/10 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-white mb-4">Speed Violations This Week</h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <p className="text-3xl font-bold text-red-400">18</p>
                <p className="text-xs text-white/40 mt-1">Total Violations</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-yellow-400">2</p>
                <p className="text-xs text-white/40 mt-1">Repeat Offenders</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-white">65</p>
                <p className="text-xs text-white/40 mt-1">Avg Violation (km/h)</p>
              </div>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}