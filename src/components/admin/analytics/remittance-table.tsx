"use client";

import { useState } from "react";
import type { AnalyticsRemittance } from "@/app/(admin)/analytics/data/analytics-data";

const ROWS_PER_PAGE = 7;

interface RemittanceTableProps {
  data: AnalyticsRemittance[];
}

export function RemittanceTable({ data }: RemittanceTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedConductor, setSelectedConductor] = useState<string | null>(null);

  const activeData = selectedConductor
    ? data.filter((row) => row.conductor === selectedConductor)
    : data;

  const totalPages = Math.max(1, Math.ceil(activeData.length / ROWS_PER_PAGE));

  const currentTableData = activeData.slice(
    (currentPage - 1) * ROWS_PER_PAGE,
    currentPage * ROWS_PER_PAGE
  );

  const totalAmount = activeData.reduce((sum, row) => sum + row.remittedAmount, 0);
  const totalCash = activeData.reduce((sum, row) => sum + row.cashAmount, 0);
  const totalGCash = activeData.reduce((sum, row) => sum + row.gcashAmount, 0);
  const pendingAmount = activeData
    .filter((row) => row.status === "Pending")
    .reduce((sum, row) => sum + row.remittedAmount, 0);

  const handleRowClick = (conductorName: string) => {
    setSelectedConductor(conductorName);
    setCurrentPage(1);
  };

  const handleBackToAll = () => {
    setSelectedConductor(null);
    setCurrentPage(1);
  };

  return (
    <div className="bg-[#131C2E] border border-[#1E2D45] rounded-lg p-5 h-[600px] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-semibold text-white">
            {selectedConductor ? `History: ${selectedConductor}` : "Conductor Remittance"}
          </h3>

          {selectedConductor && (
            <button
              onClick={handleBackToAll}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#0E1628] text-slate-200 hover:bg-[#1A2540] border border-[#1E2D45] transition-all shadow-sm"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
              Back to All
            </button>
          )}
        </div>

        <span className="text-[10px] bg-[#0E1628] text-slate-500 px-2 py-0.5 rounded">
          {activeData.length} Shifts
        </span>
      </div>

      {/* Mini Summary Cards */}
      <div className="grid grid-cols-4 gap-2 mb-4 flex-shrink-0">
        <div className="bg-[#0E1628] rounded-lg p-2.5 border border-[#1E2D45]">
          <p className="text-[9px] uppercase tracking-wider text-slate-500 font-semibold">Total</p>
          <p className="text-sm font-bold text-white mt-0.5">₱{totalAmount.toLocaleString()}</p>
        </div>
        <div className="bg-[#0E1628] rounded-lg p-2.5 border border-[#1E2D45]">
          <p className="text-[9px] uppercase tracking-wider text-slate-500 font-semibold">Cash</p>
          <p className="text-sm font-bold text-emerald-400 mt-0.5">₱{totalCash.toLocaleString()}</p>
        </div>
        <div className="bg-[#0E1628] rounded-lg p-2.5 border border-[#1E2D45]">
          <p className="text-[9px] uppercase tracking-wider text-slate-500 font-semibold">GCash</p>
          <p className="text-sm font-bold text-blue-400 mt-0.5">₱{totalGCash.toLocaleString()}</p>
        </div>
        <div className="bg-[#0E1628] rounded-lg p-2.5 border border-[#1E2D45]">
          <p className="text-[9px] uppercase tracking-wider text-slate-500 font-semibold">Pending</p>
          <p className="text-sm font-bold text-red-400 mt-0.5">₱{pendingAmount.toLocaleString()}</p>
        </div>
      </div>

      {/* Table Container */}
      <div className="flex-1 overflow-hidden">
        {activeData.length === 0 ? (
          <div className="flex items-center justify-center h-full text-slate-600 text-xs">
            No remittance data available.
          </div>
        ) : (
          <table className="w-full text-left h-full">
            <thead className="sticky top-0 bg-[#131C2E] z-10">
              <tr className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold border-b border-[#1E2D45]">
                <th className="pb-3 pr-2 font-medium">Shift ID</th>
                <th className="pb-3 pr-2 font-medium">{selectedConductor ? "Vehicle Plate" : "Conductor"}</th>
                <th className="pb-3 pr-2 font-medium hidden md:table-cell">Date</th>
                <th className="pb-3 pr-2 font-medium text-right">Cash</th>
                <th className="pb-3 pr-2 font-medium text-right">GCash</th>
                <th className="pb-3 pr-2 font-medium text-right">Total</th>
                <th className="pb-3 font-medium text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1E2D45]">
              {currentTableData.map((row) => (
                <tr
                  key={row.shiftId}
                  onClick={() => !selectedConductor && handleRowClick(row.conductor)}
                  className={`transition-colors ${!selectedConductor ? "hover:bg-[#0E1628] cursor-pointer" : "hover:bg-[#0E1628]"}`}
                >
                  <td className="py-3 pr-2 text-xs text-[#62A0EA] font-mono font-medium">{row.shiftId}</td>
                  <td className="py-3 pr-2 text-xs text-slate-300 font-medium">
                    {selectedConductor ? row.vehiclePlate : (
                      <span className="flex items-center gap-2">
                        {row.conductor}
                        <svg className="w-3 h-3 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                        </svg>
                      </span>
                    )}
                  </td>
                  <td className="py-3 pr-2 text-xs text-slate-500 hidden md:table-cell">{row.date}</td>
                  <td className="py-3 pr-2 text-xs text-emerald-400 font-semibold text-right">₱{row.cashAmount.toLocaleString()}</td>
                  <td className="py-3 pr-2 text-xs text-blue-400 font-semibold text-right">₱{row.gcashAmount.toLocaleString()}</td>
                  <td className="py-3 pr-2 text-xs text-white font-semibold text-right">₱{row.remittedAmount.toLocaleString()}</td>
                  <td className="py-3 text-center">
                    <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                      row.status === "Remitted"
                        ? "bg-sky-400/15 text-sky-400"
                        : "bg-red-500/15 text-red-400"
                    }`}>
                      {row.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination Controls */}
      <div className="flex items-center justify-between mt-4 pt-4 border-t border-[#1E2D45] flex-shrink-0">
        <p className="text-xs text-slate-500">
          Page <span className="text-white font-medium">{currentPage}</span> of <span className="text-white font-medium">{totalPages}</span>
        </p>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            className="px-3 py-1.5 rounded-md text-xs font-medium bg-[#0E1628] border border-[#1E2D45] text-slate-400 hover:bg-[#1A2540] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            Previous
          </button>

          <button
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
            className="px-3 py-1.5 rounded-md text-xs font-medium bg-[#62A0EA] text-white hover:bg-[#4A8BD4] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}