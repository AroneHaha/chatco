"use client";

import { useState } from "react";

// Bulacan Route Data & LTFRB Pricing Logic
const ROUTES = [
  { id: "marilao", name: "Marilao" },
  { id: "bocaue", name: "Bocaue" },
  { id: "balagtas", name: "Balagtas" },
  { id: "guiuginto", name: "Guiuginto" },
  { id: "tikay", name: "Tikay" },
  { id: "malolos", name: "Malolos" },
  { id: "calumpit", name: "Calumpit" },
];

const BASE_FARE = 13.00;
const PER_KM_RATE = 1.50;

const getDistance = (fromId: string, toId: string) => {
  const indexFrom = ROUTES.findIndex(r => r.id === fromId);
  const indexTo = ROUTES.findIndex(r => r.id === toId);
  const distance = Math.abs(indexTo - indexFrom) * 2; 
  return Math.max(1, distance); 
};

export default function FareCalcModal({ onClose }: { onClose: () => void }) {
  const [fromId, setFromId] = useState("marilao"); 
  const [toId, setToId] = useState("");
  const [isCalculating, setIsCalculating] = useState(false);
  const [result, setResult] = useState<{ distance: number; fare: number } | null>(null);

  // Calculates sample fare dynamically as the user changes the dropdown
  const estimatedFare = toId 
    ? (BASE_FARE + (getDistance(fromId, toId) - 1) * PER_KM_RATE).toFixed(2)
    : null;

  const handleCalculate = () => {
    if (!toId) return;
    setIsCalculating(true);
    
    setTimeout(() => {
      const distance = getDistance(fromId, toId);
      const fare = BASE_FARE + (distance - 1) * PER_KM_RATE;
      setResult({ distance, fare });
      setIsCalculating(false);
    }, 600);
  };

  const handleReset = () => {
    setToId("");
    setResult(null);
  };

  const selectClasses = "w-full px-4 py-3 rounded-xl border border-gray-200 bg-[#F8FAFC] text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#1A5FB4]/20 focus:border-[#1A5FB4] transition-all appearance-none";

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      
      {/* Modal Card */}
      <div className="relative bg-white sm:rounded-3xl rounded-t-3xl shadow-2xl w-full sm:max-w-md overflow-hidden animate-slide-in-from-bottom duration-300">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-[#071A2E]">Calculate Fare</h2>
            <p className="text-xs text-gray-500 mt-0.5">Marilao - Calumpit Route</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors">
            <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="p-5 space-y-4">
          
          {/* LIVE ESTIMATED FARE LABEL */}
          {estimatedFare && !result && (
            <div className="bg-[#F0F7FF] rounded-xl p-4 border border-[#DAEEFF] flex items-center justify-between">
              <div>
                <p className="text-xs text-[#1A5FB4] font-semibold">Estimated Fare</p>
                <p className="text-[10px] text-gray-500 mt-0.5">Based on selected route</p>
              </div>
              <span className="text-2xl font-extrabold text-[#1A5FB4]">₱{estimatedFare}</span>
            </div>
          )}

          {/* Inputs Row - Reduced spacing */}
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-700 mb-1.5">
                <span className="text-[#62A0EA]">●</span> From
              </label>
              <select value={fromId} onChange={(e) => { setFromId(e.target.value); handleReset(); }} className={selectClasses}>
                {ROUTES.map((r) => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            </div>

            {/* Inline Arrow - Doesn't push things down */}
            <div className="pb-6">
              <svg className="w-5 h-5 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
            </div>

            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-700 mb-1.5">
                <span className="text-[#FF6D3A]">●</span> To
              </label>
              <select value={toId} onChange={(e) => setToId(e.target.value)} className={selectClasses}>
                <option value="" disabled>Select Drop-off</option>
                {ROUTES.filter(r => r.id !== fromId).map((r) => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Calculate Button */}
          <button 
            onClick={handleCalculate}
            disabled={!toId || isCalculating}
            className="w-full flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl text-sm font-semibold bg-[#1A5FB4] text-white hover:bg-[#164A8F] transition-colors shadow-md shadow-[#1A5FB4]/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isCalculating ? (
              <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
            ) : (
              "View Detailed Breakdown"
            )}
          </button>

          {/* Results UI */}
          {result && (
            <div className="bg-[#F8FAFC] rounded-2xl p-5 border border-gray-100">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Fare Breakdown</h3>
              
              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Total Distance</span>
                  <span className="font-semibold text-[#071A2E]">{result.distance} km</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">First Kilometer</span>
                  <span className="font-semibold text-[#071A2E]">₱ {BASE_FARE.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Succeeding ({result.distance - 1} km x ₱{PER_KM_RATE})</span>
                  <span className="font-semibold text-[#071A2E]">₱ {((result.distance - 1) * PER_KM_RATE).toFixed(2)}</span>
                </div>
                <div className="border-t border-dashed border-gray-200 my-2" />
                <div className="flex justify-between text-base">
                  <span className="font-bold text-[#071A2E]">Total Fare</span>
                  <span className="font-extrabold text-[#1A5FB4] text-xl">₱ {result.fare.toFixed(2)}</span>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button 
                  onClick={onClose}
                  className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-[#1A5FB4] text-white hover:bg-[#164A8F] transition-colors shadow-sm"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 2.004-.41a.75.75 0 0 1-.581.201 60.026 60.026 0 0 1-15.797 2.101 48.29 48.29 0 0 0-1.753-.164A60.094 60.094 0 0 1 2.25 18.75ZM13.5 6a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" /></svg>
                  Pay Now
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}