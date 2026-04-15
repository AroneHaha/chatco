"use client";

import { useState } from "react";

// --- MOCK DATA & TYPES ---
type PaymentMethod = "WALLET" | "GCASH";
type SyncStatus = "SYNCED" | "PENDING";

interface PassengerEntry {
  id: string;
  time: string;
  passengerAlias: string; 
  fare: number;
  method: PaymentMethod;
  status: SyncStatus;
}

const mockEntries: PassengerEntry[] = [
  { id: "t_001", time: "10:32 AM", passengerAlias: "Arone D.", fare: 18.0, method: "WALLET", status: "SYNCED" },
  { id: "t_002", time: "10:35 AM", passengerAlias: "Juan P.", fare: 24.0, method: "GCASH", status: "SYNCED" },
  { id: "t_003", time: "10:41 AM", passengerAlias: "Maria S.", fare: 18.0, method: "GCASH", status: "SYNCED" },
  { id: "t_004", time: "10:45 AM", passengerAlias: "Pedro L.", fare: 22.0, method: "WALLET", status: "PENDING" },
  { id: "t_005", time: "10:52 AM", passengerAlias: "Jose R.", fare: 18.0, method: "WALLET", status: "SYNCED" },
  { id: "t_006", time: "11:01 AM", passengerAlias: "Ana M.", fare: 20.0, method: "WALLET", status: "SYNCED" },
  { id: "t_007", time: "11:05 AM", passengerAlias: "Carlos B.", fare: 24.0, method: "GCASH", status: "PENDING" },
];

export default function PassengerLog() {
  const [activeFilter, setActiveFilter] = useState<"ALL" | PaymentMethod>("ALL");

  // Calculate Totals
  const totals = mockEntries.reduce(
    (acc, curr) => {
      acc.total += curr.fare;
      if (curr.method === "WALLET") acc.wallet += curr.fare;
      if (curr.method === "GCASH") acc.gcash += curr.fare;
      return acc;
    },
    { total: 0, wallet: 0, gcash: 0 }
  );

  const filteredEntries = activeFilter === "ALL" ? mockEntries : mockEntries.filter((e) => e.method === activeFilter);

  const getMethodStyles = (method: PaymentMethod) => {
    switch (method) {
      case "WALLET": return "bg-purple-50 text-purple-600 border-purple-100";
      case "GCASH": return "bg-blue-50 text-blue-600 border-blue-100";
    }
  };

  return (
    <>
      {/* ================= MOBILE VIEW ================= */}
      <div className="md:hidden h-full w-full bg-gray-100 flex flex-col overflow-hidden">
        
        {/* SCROLLABLE CONTAINER */}
        <div className="flex-1 overflow-y-auto">
          
          {/* STICKY HEADER */}
          <div className="sticky top-0 z-20 bg-white/90 backdrop-blur-xl border-b border-blue-100 p-4 shadow-sm">
            <h1 className="text-xl font-extrabold text-gray-900 mb-3">Shift Passengers</h1>
            
            {/* Mini Stats Grid (Updated to 3 columns) */}
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-[#1A5FB4]/10 rounded-xl p-2 text-center">
                <p className="text-sm font-extrabold text-[#1A5FB4]">₱{totals.total}</p>
                <p className="text-[9px] font-semibold text-blue-400 uppercase">Total</p>
              </div>
              <div className="bg-purple-50 rounded-xl p-2 text-center">
                <p className="text-sm font-extrabold text-purple-600">₱{totals.wallet}</p>
                <p className="text-[9px] font-semibold text-purple-400 uppercase">Wallet</p>
              </div>
              <div className="bg-blue-50 rounded-xl p-2 text-center">
                <p className="text-sm font-extrabold text-blue-600">₱{totals.gcash}</p>
                <p className="text-[9px] font-semibold text-blue-400 uppercase">GCash</p>
              </div>
            </div>

            {/* Filter Pills (Cash Removed) */}
            <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
              {["ALL", "WALLET", "GCASH"].map((filter) => (
                <button
                  key={filter}
                  onClick={() => setActiveFilter(filter as any)}
                  className={`px-4 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wider whitespace-nowrap transition-colors border ${
                    activeFilter === filter 
                      ? "bg-[#1A5FB4] text-white border-[#1A5FB4] shadow-sm" 
                      : "bg-white text-gray-500 border-gray-200 hover:border-blue-200"
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>
          </div>

          {/* LIST */}
          <div className="px-4 pb-24 pt-4 space-y-3">
            {filteredEntries.map((entry) => (
              <div key={entry.id} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 font-bold text-sm">
                    {entry.passengerAlias[0]}
                  </div>
                  <div>
                    <p className="font-bold text-gray-900 text-sm">{entry.passengerAlias}</p>
                    <p className="text-[11px] text-gray-400">{entry.time}</p>
                  </div>
                </div>
                
                <div className="text-right flex items-center gap-2">
                  <div>
                    <p className="font-extrabold text-gray-900 text-sm">₱{entry.fare.toFixed(2)}</p>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md border ${getMethodStyles(entry.method)}`}>
                      {entry.method}
                    </span>
                  </div>
                  {entry.status === "PENDING" && (
                    <div className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" title="Pending Sync" />
                  )}
                </div>
              </div>
            ))}
            
            {filteredEntries.length === 0 && (
              <div className="text-center py-10 text-gray-400 text-sm font-medium">
                No passengers found for this filter.
              </div>
            )}
          </div>
        </div>

        {/* FAB: Log Manual Payment */}
        <div className="absolute bottom-24 right-6 z-30">
          <button className="w-14 h-14 rounded-2xl bg-[#1A5FB4] flex items-center justify-center shadow-xl shadow-blue-500/30 border-4 border-white">
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
          </button>
        </div>
      </div>


      {/* ================= DESKTOP VIEW ================= */}
      <div className="hidden md:flex h-full w-full bg-gray-50 flex-col overflow-hidden p-8">
        
        {/* Desktop Header */}
        <div className="flex justify-between items-start mb-6 flex-shrink-0">
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Passenger Log</h1>
            <p className="text-gray-500 mt-1">Real-time shift transactions and payment breakdown.</p>
          </div>
          <button className="bg-[#1A5FB4] text-white px-6 py-3 rounded-xl font-bold shadow-md hover:bg-[#165a9f] transition-colors flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
            Log Manual Payment
          </button>
        </div>

        <div className="flex gap-6 flex-1 overflow-hidden min-h-0">
          
          {/* Left: Table List */}
          <div className="flex-1 bg-white rounded-2xl border border-blue-100 shadow-sm flex flex-col overflow-hidden">
            {/* Filter Tabs (Cash Removed) */}
            <div className="p-6 pb-4 border-b border-gray-100 flex gap-2 flex-shrink-0">
              {["ALL", "WALLET", "GCASH"].map((filter) => (
                <button
                  key={filter}
                  onClick={() => setActiveFilter(filter as any)}
                  className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors ${
                    activeFilter === filter 
                      ? "bg-[#1A5FB4] text-white" 
                      : "bg-gray-50 text-gray-500 hover:bg-gray-100"
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>

            {/* Table */}
            <div className="flex-1 overflow-y-auto min-h-0">
              <table className="w-full text-left">
                <thead className="bg-gray-50 sticky top-0 z-10">
                  <tr>
                    <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Passenger</th>
                    <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Time</th>
                    <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Method</th>
                    <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Fare</th>
                    <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredEntries.map((entry) => (
                    <tr key={entry.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 font-bold text-xs">
                            {entry.passengerAlias[0]}
                          </div>
                          <span className="font-semibold text-gray-900 text-sm">{entry.passengerAlias}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">{entry.time}</td>
                      <td className="px-6 py-4">
                        <span className={`text-xs font-bold px-3 py-1 rounded-lg border ${getMethodStyles(entry.method)}`}>
                          {entry.method}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm font-extrabold text-gray-900 text-right">₱{entry.fare.toFixed(2)}</td>
                      <td className="px-6 py-4 text-center">
                        {entry.status === "SYNCED" ? (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-600">
                            <div className="w-1.5 h-1.5 rounded-full bg-green-500" /> Synced
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-yellow-600">
                            <div className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-pulse" /> Offline
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Right: Summary Sidebar */}
          <div className="w-80 flex-shrink-0 space-y-6 overflow-y-auto">
            <div className="bg-white p-6 rounded-2xl border border-blue-100 shadow-sm">
              <h3 className="font-bold text-gray-900 mb-4 text-lg">Shift Summary</h3>
              
              <div className="space-y-4">
                <div className="flex justify-between items-center pb-3 border-b border-gray-100">
                  <span className="text-sm text-gray-500">Total Passengers</span>
                  <span className="text-xl font-extrabold text-gray-900">{mockEntries.length}</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-sm bg-purple-500" />
                    <span className="text-sm text-gray-600">Wallet</span>
                  </div>
                  <span className="text-lg font-extrabold text-purple-600">₱{totals.wallet.toFixed(2)}</span>
                </div>

                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-sm bg-blue-500" />
                    <span className="text-sm text-gray-600">GCash</span>
                  </div>
                  <span className="text-lg font-extrabold text-blue-600">₱{totals.gcash.toFixed(2)}</span>
                </div>

              </div>

              <div className="mt-6 pt-4 border-t-2 border-gray-100 flex justify-between items-center">
                <span className="text-base font-bold text-gray-900">Grand Total</span>
                <span className="text-2xl font-extrabold text-[#1A5FB4]">₱{totals.total.toFixed(2)}</span>
              </div>
            </div>

            {/* Offline Notice */}
            <div className="bg-yellow-50 p-4 rounded-2xl border border-yellow-100">
              <div className="flex gap-3">
                <svg className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
                </svg>
                <div>
                  <p className="text-sm font-bold text-yellow-800">Offline Sync Pending</p>
                  <p className="text-xs text-yellow-600 mt-1">You have 2 transactions waiting for internet connection to sync to the server.</p>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </>
  );
}