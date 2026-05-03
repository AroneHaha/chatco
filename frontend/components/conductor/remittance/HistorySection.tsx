// components/conductor/remittance/HistorySection.tsx
"use client";

import { useState } from "react";
import { RemittanceRecord } from "@/lib/remittance-history";
import { fmtDate, fmt } from "@/app/(conductor)/conductor-dashboard/end-of-day/helpers";

const RECORDS_PER_PAGE = 5;

interface HistorySectionProps {
  showHistory: boolean;
  setShowHistory: (v: boolean) => void;
  filteredHistory: RemittanceRecord[];
  historyFilter: "all" | "week" | "month";
  setHistoryFilter: (v: "all" | "week" | "month") => void;
  openOfficialReport: (record?: RemittanceRecord) => void;
}

export default function HistorySection({ showHistory, setShowHistory, filteredHistory, historyFilter, setHistoryFilter, openOfficialReport }: HistorySectionProps) {
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(filteredHistory.length / RECORDS_PER_PAGE));
  const paginatedHistory = filteredHistory.slice(
    (currentPage - 1) * RECORDS_PER_PAGE,
    currentPage * RECORDS_PER_PAGE
  );

  // Reset to page 1 when filter changes
  const handleFilterChange = (filter: "all" | "week" | "month") => {
    setHistoryFilter(filter);
    setCurrentPage(1);
  };

  return (
    <div className="space-y-3">
      <button onClick={() => setShowHistory(!showHistory)} className="w-full bg-[#071A2E] border border-white/[0.06] rounded-2xl p-4 flex items-center justify-between hover:border-white/[0.1] transition-all active:scale-[0.99]">
        <div className="flex items-center gap-3"><div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center"><svg className="w-4.5 h-4.5 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg></div><div className="text-left"><p className="text-xs font-semibold text-white/60">Remittance History</p><p className="text-[10px] text-white/25 mt-0.5">{filteredHistory.length} record{filteredHistory.length !== 1 ? "s" : ""} total</p></div></div>
        <svg className={`w-5 h-5 text-white/20 transition-transform duration-300 ${showHistory ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" /></svg>
      </button>
      <div className="overflow-hidden transition-all duration-300 ease-in-out" style={{ maxHeight: showHistory ? "2000px" : "0px", opacity: showHistory ? 1 : 0 }}>
        <div className="space-y-3 pt-1">
          <div className="flex gap-2">
            {([ { key: "all", label: "All" }, { key: "week", label: "This Week" }, { key: "month", label: "This Month" }] as const).map((f) => (
              <button key={f.key} onClick={() => handleFilterChange(f.key)} className={`px-3.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all duration-200 ${historyFilter === f.key ? "bg-[#1A5FB4] text-white shadow-md shadow-[#1A5FB4]/20" : "bg-white/5 text-white/35 border border-white/5 hover:bg-white/8 hover:text-white/50"}`}>{f.label}</button>
            ))}
          </div>
          {filteredHistory.length === 0 ? (
            <div className="bg-[#071A2E] border border-white/[0.04] rounded-2xl p-8 flex flex-col items-center"><div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-3"><svg className="w-6 h-6 text-white/15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" /></svg></div><p className="text-xs font-medium text-white/20">No records yet</p><p className="text-[10px] text-white/15 mt-0.5">Remittances will appear here after each shift</p></div>
          ) : (
            <>
              <div className="space-y-2.5">
                {paginatedHistory.map((record, idx) => (
                  <div key={`${record.shiftId}-${idx}`} className="bg-[#071A2E] border border-white/[0.06] rounded-2xl p-4 space-y-2.5">
                    <div className="flex items-center justify-between"><span className="text-xs font-bold text-white/70">{fmtDate(record.date)}</span><span className="text-[9px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full">{record.remittanceStatus}</span></div>
                    <div className="flex items-center gap-3 text-[11px] text-white/35 font-medium flex-wrap"><div className="flex items-center gap-1.5"><div className="w-4 h-4 rounded-full bg-[#1A5FB4]/30 flex items-center justify-center"><span className="text-[7px] font-bold text-[#62A0EA]">{record.conductorName[0]}</span></div><span className="text-white/60 font-semibold">{record.conductorName}</span></div><div className="flex items-center gap-1.5"><svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0" /></svg><span className="text-white/50">{record.driverName}</span></div></div>
                    <div className="grid grid-cols-2 gap-2"><div className="bg-white/[0.03] rounded-lg px-2.5 py-2"><p className="text-[8px] font-semibold text-white/30 uppercase tracking-wider">Cashless</p><p className="text-sm font-extrabold text-[#62A0EA] mt-0.5 tabular-nums">{fmt(record.totalCashless)}</p></div><div className="bg-white/[0.03] rounded-lg px-2.5 py-2"><p className="text-[8px] font-semibold text-white/30 uppercase tracking-wider">Cash</p><p className="text-sm font-extrabold text-amber-400 mt-0.5 tabular-nums">{fmt(record.cashDeclared)}</p></div></div>
                    <div className="flex items-center justify-between pt-1 border-t border-white/[0.04]"><span className="text-xs font-bold text-white/40">Total <span className="text-white font-extrabold tabular-nums">{fmt(record.totalCashless + record.cashDeclared)}</span></span><button onClick={() => openOfficialReport(record)} className="flex items-center gap-1 text-[#62A0EA]/70 hover:text-[#62A0EA] transition-colors active:scale-95"><svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" /></svg><span className="text-[10px] font-semibold">View Report</span></button></div>
                  </div>
                ))}
              </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between bg-[#071A2E] border border-white/[0.06] rounded-xl px-4 py-3">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className={`flex items-center gap-1.5 text-[11px] font-semibold transition-all ${
                      currentPage === 1
                        ? "text-white/15 cursor-not-allowed"
                        : "text-white/50 hover:text-white active:scale-95"
                    }`}
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" /></svg>
                    Prev
                  </button>

                  <div className="flex items-center gap-1.5">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`w-7 h-7 rounded-lg text-[11px] font-bold transition-all ${
                          currentPage === page
                            ? "bg-[#1A5FB4] text-white shadow-md shadow-[#1A5FB4]/25"
                            : "text-white/30 hover:text-white/60 hover:bg-white/5"
                        }`}
                      >
                        {page}
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className={`flex items-center gap-1.5 text-[11px] font-semibold transition-all ${
                      currentPage === totalPages
                        ? "text-white/15 cursor-not-allowed"
                        : "text-white/50 hover:text-white active:scale-95"
                    }`}
                  >
                    Next
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}