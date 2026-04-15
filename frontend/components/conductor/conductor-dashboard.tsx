"use client";

import { useState } from "react";
import dynamic from "next/dynamic";

// Dynamically import the map to avoid Leaflet SSR issues
const ConductorMap = dynamic(() => import("@/components/conductor/conductor-map"), {
  ssr: false,
  loading: () => <div className="absolute inset-0 bg-gray-100 animate-pulse" />,
});

const mockData = {
  name: "Mark",
  plateNumber: "RIZ 2024",
  route: "Quiapo - Taytay",
  passengers: 12,
  cashCollected: 216.0,
  digitalCollected: 150.0,
  isAvailable: true,
};

export default function ConductorDashboard() {
  const [isAvailable, setIsAvailable] = useState(mockData.isAvailable);
  const [showMobileSheet, setShowMobileSheet] = useState(true);

  return (
    <>
      {/* ================= MOBILE VIEW ================= */}
      <div className="md:hidden relative h-full w-full bg-gray-100 flex flex-col">
        
        {/* Top Bar (Light Glassmorphism) */}
        <div className="absolute top-0 inset-x-0 z-20 p-4 flex items-center justify-between pointer-events-none">
          <div className="pointer-events-auto bg-white/80 backdrop-blur-xl rounded-2xl px-4 py-3 border border-blue-100 shadow-sm">
            <h1 className="text-gray-900 font-bold text-base">Unit: {mockData.plateNumber}</h1>
            <p className="text-[11px] text-gray-500 font-medium">{mockData.route}</p>
          </div>
          <div className="flex gap-2 pointer-events-auto">
            {/* Panic Button */}
            <button className="w-10 h-10 rounded-full bg-red-500 flex items-center justify-center text-white shadow-lg shadow-red-500/40 border-2 border-red-300">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" /></svg>
            </button>
            {/* Profile */}
            <div className="w-10 h-10 rounded-full bg-[#1A5FB4] flex items-center justify-center text-white font-bold shadow-lg border-2 border-blue-200">
              {mockData.name[0]}
            </div>
          </div>
        </div>

        {/* ACTUAL MAP INTEGRATION */}
        <div className="absolute inset-0 z-0">
          <ConductorMap />
        </div>

        {/* FLOATING SCAN BUTTON */}
        <div className="absolute bottom-48 right-6 z-30">
          <button className="w-20 h-20 rounded-2xl bg-[#1A5FB4] flex items-center justify-center shadow-2xl shadow-blue-500/40 border-4 border-white hover:bg-[#165a9f] transition-colors group">
            <div className="text-center text-white">
              <svg className="w-8 h-8 mx-auto mb-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0 1 3.75 9.375v-4.5ZM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 0 1-1.125-1.125v-4.5ZM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0 1 13.5 9.375v-4.5Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 6.75h.75v.75h-.75v-.75ZM6.75 16.5h.75v.75h-.75v-.75ZM16.5 6.75h.75v.75h-.75v-.75ZM13.5 13.5h.75v.75h-.75v-.75ZM13.5 19.5h.75v.75h-.75v-.75ZM19.5 13.5h.75v.75h-.75v-.75ZM19.5 19.5h.75v.75h-.75v-.75ZM16.5 16.5h.75v.75h-.75v-.75Z" /></svg>
              <span className="text-[9px] font-bold uppercase tracking-wider opacity-80 group-hover:opacity-100">Scan</span>
            </div>
          </button>
        </div>

        {/* BOTTOM SHEET (White) */}
        <div className={`absolute bottom-0 inset-x-0 z-20 bg-white rounded-t-3xl border-t border-blue-100 shadow-[0_-10px_40px_rgba(0,0,0,0.1)] transition-transform duration-300 ease-in-out ${
          showMobileSheet ? "translate-y-0" : "translate-y-[calc(70%-64px)]" 
        }`}>
          
          {/* Handle */}
          <div className="h-16 flex flex-col items-center justify-center cursor-pointer flex-shrink-0" onClick={() => setShowMobileSheet(!showMobileSheet)}>
            <div className={`w-10 h-1 rounded-full transition-colors duration-300 ${showMobileSheet ? "bg-gray-300" : "bg-gray-400"}`} />
            {!showMobileSheet && (
              <span className="text-[10px] font-semibold text-gray-400 mt-2 uppercase tracking-wider">Shift Status</span>
            )}
          </div>

          {/* Content */}
          <div className="px-5 pb-8 space-y-4">
            {/* Capacity Toggle */}
            <div className="flex items-center justify-between bg-gray-50 rounded-2xl p-4 border border-gray-100">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Unit Capacity</p>
                <p className="text-lg font-bold text-gray-900 mt-0.5">{isAvailable ? "Available" : "Full"}</p>
              </div>
              <button 
                onClick={() => setIsAvailable(!isAvailable)}
                className={`relative w-14 h-8 rounded-full transition-colors duration-300 ${isAvailable ? 'bg-[#1A5FB4]' : 'bg-gray-300'}`}
              >
                <div className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full shadow transition-transform duration-300 ${isAvailable ? 'translate-x-6' : 'translate-x-0'}`} />
              </button>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-blue-50 rounded-xl p-3 text-center border border-blue-100">
                <p className="text-2xl font-extrabold text-[#1A5FB4]">{mockData.passengers}</p>
                <p className="text-[10px] font-semibold text-blue-400 mt-1 uppercase">Passengers</p>
              </div>
              <div className="bg-green-50 rounded-xl p-3 text-center border border-green-100">
                <p className="text-2xl font-extrabold text-green-600">₱{mockData.cashCollected}</p>
                <p className="text-[10px] font-semibold text-green-500 mt-1 uppercase">Cash</p>
              </div>
              <div className="bg-purple-50 rounded-xl p-3 text-center border border-purple-100">
                <p className="text-2xl font-extrabold text-purple-600">₱{mockData.digitalCollected}</p>
                <p className="text-[10px] font-semibold text-purple-500 mt-1 uppercase">Digital</p>
              </div>
            </div>
          </div>
        </div>
      </div>


      {/* ================= DESKTOP VIEW ================= */}
      {/* (Desktop view remains unchanged, omitted for brevity, but keep your previous desktop code here) */}
      <div className="hidden md:flex h-full w-full flex-col bg-gray-50 p-8 overflow-y-auto">
        {/* ... Keep the exact same desktop grid code from the previous response ... */}
         <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Conductor Dashboard</h1>
            <p className="text-gray-500 mt-1">Manage your shift, scan passengers, and track earnings.</p>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-blue-100 shadow-sm text-right">
            <p className="text-xs font-semibold text-gray-400 uppercase">Active Vehicle</p>
            <p className="text-xl font-bold text-gray-900">{mockData.plateNumber}</p>
            <p className="text-sm text-gray-500">{mockData.route}</p>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-6 mb-8">
          {[
            { title: "Total Passengers", value: mockData.passengers, color: "text-[#1A5FB4]", bg: "bg-blue-50" },
            { title: "Cash Collected", value: `₱${mockData.cashCollected}`, color: "text-green-600", bg: "bg-green-50" },
            { title: "Digital Wallet", value: `₱${mockData.digitalCollected}`, color: "text-purple-600", bg: "bg-purple-50" },
            { title: "Total Revenue", value: `₱${mockData.cashCollected + mockData.digitalCollected}`, color: "text-gray-900", bg: "bg-gray-100" },
          ].map((stat) => (
            <div key={stat.title} className={`${stat.bg} rounded-2xl p-6 border border-white shadow-sm`}>
              <p className="text-sm font-semibold text-gray-500 mb-2">{stat.title}</p>
              <p className={`text-3xl font-extrabold ${stat.color}`}>{stat.value}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-6 flex-1">
          
          <div className="col-span-2 bg-white rounded-2xl border border-blue-100 shadow-sm flex flex-col items-center justify-center p-10 relative overflow-hidden">
            <div className="absolute top-4 right-4">
               <button className="bg-red-100 text-red-600 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-red-200 transition-colors flex items-center gap-2 shadow-sm">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" /></svg>
                  Emergency Panic
               </button>
            </div>
            
            <div className="w-64 h-64 border-4 border-dashed border-gray-200 rounded-3xl flex flex-col items-center justify-center mb-6 bg-gray-50">
               <svg className="w-16 h-16 text-gray-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0 1 3.75 9.375v-4.5ZM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 0 1-1.125-1.125v-4.5ZM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0 1 13.5 9.375v-4.5Z" /></svg>
               <p className="text-gray-400 font-medium text-sm">Camera Feed / Scanner</p>
            </div>
            <button className="bg-[#1A5FB4] text-white px-8 py-4 rounded-2xl font-bold shadow-lg shadow-blue-500/30 hover:bg-[#165a9f] transition-colors flex items-center gap-3">
               <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
               Initiate Manual Scan
            </button>
          </div>

          <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-blue-100 shadow-sm">
              <h3 className="font-bold text-gray-900 mb-4">Vehicle Status</h3>
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-2xl font-extrabold ${isAvailable ? 'text-[#1A5FB4]' : 'text-red-500'}`}>
                    {isAvailable ? "Available" : "Full"}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Tap toggle to update</p>
                </div>
                <button 
                  onClick={() => setIsAvailable(!isAvailable)}
                  className={`relative w-16 h-9 rounded-full transition-colors duration-300 ${isAvailable ? 'bg-[#1A5FB4]' : 'bg-gray-300'}`}
                >
                  <div className={`absolute top-1 left-1 w-7 h-7 bg-white rounded-full shadow transition-transform duration-300 ${isAvailable ? 'translate-x-7' : 'translate-x-0'}`} />
                </button>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-blue-100 shadow-sm space-y-3">
              <h3 className="font-bold text-gray-900 mb-4">Quick Actions</h3>
              <button className="w-full text-left px-4 py-3 bg-gray-50 hover:bg-blue-50 rounded-xl text-sm font-medium text-gray-700 transition-colors flex items-center gap-3">
                <span className="w-8 h-8 bg-blue-100 text-[#1A5FB4] rounded-lg flex items-center justify-center text-xs font-bold">₱</span>
                Log Expense (Gas, etc.)
              </button>
              <button className="w-full text-left px-4 py-3 bg-gray-50 hover:bg-blue-50 rounded-xl text-sm font-medium text-gray-700 transition-colors flex items-center gap-3">
                <span className="w-8 h-8 bg-orange-100 text-orange-600 rounded-lg flex items-center justify-center text-xs font-bold">!</span>
                Report Lost Item
              </button>
              <button className="w-full text-left px-4 py-3 bg-red-50 hover:bg-red-100 rounded-xl text-sm font-medium text-red-600 transition-colors flex items-center gap-3">
                <span className="w-8 h-8 bg-red-100 text-red-500 rounded-lg flex items-center justify-center text-xs font-bold">▶</span>
                End Shift & Tally
              </button>
            </div>
          </div>

        </div>
      </div>
    </>
  );
}

