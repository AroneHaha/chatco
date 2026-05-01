"use client";

import { useState } from "react";
import { initialRemittanceData } from "@/app/(admin)/analytics/data/analytics-data";
import type { AnalyticsRemittance } from "@/app/(admin)/analytics/data/analytics-data";

const ROWS_PER_PAGE = 7;

export function RemittanceTable() {
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedConductor, setSelectedConductor] = useState<string | null>(null);

  const activeData: AnalyticsRemittance[] = selectedConductor 
    ? initialRemittanceData.filter((row: AnalyticsRemittance) => row.conductor === selectedConductor)
    : initialRemittanceData;

  const totalPages = Math.max(1, Math.ceil(activeData.length / ROWS_PER_PAGE));

  const currentTableData: AnalyticsRemittance[] = activeData.slice(
    (currentPage - 1) * ROWS_PER_PAGE,
    currentPage * ROWS_PER_PAGE
  );

  const totalAmount = activeData.reduce((sum: number, row: AnalyticsRemittance) => sum + row.remittedAmount, 0);
  const remittedAmount = activeData.filter((row: AnalyticsRemittance) => row.status === "Remitted").reduce((sum: number, row: AnalyticsRemittance) => sum + row.remittedAmount, 0);
  const pendingAmount = activeData.filter((row: AnalyticsRemittance) => row.status === "Pending").reduce((sum: number, row: AnalyticsRemittance) => sum + row.remittedAmount, 0);

  const handleRowClick = (conductorName: string) => {
    setSelectedConductor(conductorName);
    setCurrentPage(1);
  };

  const handleBackToAll = () => {
    setSelectedConductor(null);
    setCurrentPage(1);
  };

  return (
    <div className="bg-white/[0.04] border border-white/10 rounded-xl p-5 h-[600px] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-semibold text-white">
            {selectedConductor ? `History: ${selectedConductor}` : "Conductor Remittance"}
          </h3>
        
          {selectedConductor && (
            <button
              onClick={handleBackToAll}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-700/80 text-slate-200 hover:bg-slate-600/80 border border-slate-600/50 transition-all shadow-sm"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
              Back to All
            </button>
          )}
        </div>
        
        <span className="text-[10px] bg-white/[0.06] text-white/40 px-2 py-0.5 rounded">
          {activeData.length} Shifts
        </span>
      </div>

      {/* Mini Summary Cards */}
      <div className="grid grid-cols-3 gap-3 mb-4 flex-shrink-0">
        <div className="bg-white/[0.03] rounded-lg p-2.5 border border-white/[0.04]">
          <p className="text-[9px] uppercase tracking-wider text-white/30 font-semibold">Total Collected</p>
          <p className="text-sm font-bold text-white mt-0.5">₱{totalAmount.toLocaleString()}</p>
        </div>
        <div className="bg-white/[0.03] rounded-lg p-2.5 border border-white/[0.04]">
          <p className="text-[9px] uppercase tracking-wider text-white/30 font-semibold">Remitted</p>
          <p className="text-sm font-bold text-green-400 mt-0.5">₱{remittedAmount.toLocaleString()}</p>
        </div>
        <div className="bg-white/[0.03] rounded-lg p-2.5 border border-white/[0.04]">
          <p className="text-[9px] uppercase tracking-wider text-white/30 font-semibold">Pending</p>
          <p className="text-sm font-bold text-red-400 mt-0.5">₱{pendingAmount.toLocaleString()}</p>
        </div>
      </div>
      
      {/* Table Container */}
      <div className="flex-1 overflow-hidden">
        <table className="w-full text-left h-full">
          <thead className="sticky top-0 bg-[#0c1929] z-10">
            <tr className="text-[10px] uppercase tracking-wider text-white/30 font-semibold border-b border-white/[0.06]">
              <th className="pb-3 pr-2 font-medium">Shift ID</th>
              <th className="pb-3 pr-2 font-medium">{selectedConductor ? "Vehicle Plate" : "Conductor"}</th>
              <th className="pb-3 pr-2 font-medium hidden md:table-cell">Date</th>
              <th className="pb-3 pr-2 font-medium text-right">Amount</th>
              <th className="pb-3 font-medium text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {currentTableData.map((row: AnalyticsRemittance) => (
              <tr 
                key={row.shiftId} 
                onClick={() => !selectedConductor && handleRowClick(row.conductor)}
                className={`transition-colors ${!selectedConductor ? "hover:bg-white/[0.04] cursor-pointer" : "hover:bg-white/[0.02]"}`}
              >
                <td className="py-3 pr-2 text-xs text-[#62A0EA] font-mono font-medium">{row.shiftId}</td>
                <td className="py-3 pr-2 text-xs text-white/80 font-medium">
                  {selectedConductor ? row.vehiclePlate : (
                    <span className="flex items-center gap-2">
                      {row.conductor}
                      <svg className="w-3 h-3 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                      </svg>
                    </span>
                  )}
                </td>
                <td className="py-3 pr-2 text-xs text-white/40 hidden md:table-cell">{row.date}</td>
                <td className="py-3 pr-2 text-xs text-white/70 font-semibold text-right">₱{row.remittedAmount.toLocaleString()}</td>
                <td className="py-3 text-center">
                  <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                    row.status === "Remitted" 
                      ? "bg-green-500/15 text-green-400" 
                      : "bg-red-500/15 text-red-400"
                  }`}>
                    {row.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/[0.06] flex-shrink-0">
        <p className="text-xs text-white/40">
          Page <span className="text-white font-medium">{currentPage}</span> of <span className="text-white font-medium">{totalPages}</span>
        </p>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            className="px-3 py-1.5 rounded-md text-xs font-medium bg-white/[0.04] text-white/60 hover:bg-white/[0.08] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            Previous
          </button>
          
          <button
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
            className="px-3 py-1.5 rounded-md text-xs font-medium bg-[#1A5FB4] text-white hover:bg-[#1a6fd4] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}