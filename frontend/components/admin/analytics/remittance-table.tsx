"use client";

import { useState } from "react";

// Expanded mock data (Multiple entries per conductor to show history)
const REMITTANCE_DATA = [
  // --- Jose Ngani History ---
  { shiftId: "S - 101", conductor: "Jose Ngani", vehiclePlate: "XQJ 4728", date: "2024-05-01", remittedAmount: 2500, status: "Remitted" },
  { shiftId: "S - 109", conductor: "Jose Ngani", vehiclePlate: "XQJ 4728", date: "2024-05-05", remittedAmount: 3100, status: "Remitted" },
  { shiftId: "S - 117", conductor: "Jose Ngani", vehiclePlate: "XQJ 4728", date: "2024-05-09", remittedAmount: 3000, status: "Pending" },
  { shiftId: "S - 125", conductor: "Jose Ngani", vehiclePlate: "XQJ 4728", date: "2024-05-13", remittedAmount: 1800, status: "Pending" },
  // --- Ericks Son History ---
  { shiftId: "S - 102", conductor: "Ericks Son", vehiclePlate: "LKW 3579", date: "2024-05-01", remittedAmount: 2200, status: "Remitted" },
  { shiftId: "S - 110", conductor: "Ericks Son", vehiclePlate: "LKW 3579", date: "2024-05-05", remittedAmount: 2050, status: "Pending" },
  { shiftId: "S - 118", conductor: "Ericks Son", vehiclePlate: "LKW 3579", date: "2024-05-09", remittedAmount: 2450, status: "Remitted" },
  // --- Pedro Penduko History ---
  { shiftId: "S - 103", conductor: "Pedro Penduko", vehiclePlate: "VMY 9183", date: "2024-05-02", remittedAmount: 2600, status: "Pending" },
  { shiftId: "S - 111", conductor: "Pedro Penduko", vehiclePlate: "VMY 9183", date: "2024-05-06", remittedAmount: 2750, status: "Remitted" },
  { shiftId: "S - 119", conductor: "Pedro Penduko", vehiclePlate: "VMY 9183", date: "2024-05-10", remittedAmount: 3200, status: "Remitted" },
  // --- Luigi Mansion History ---
  { shiftId: "S - 104", conductor: "Luigi Mansion", vehiclePlate: "RZP 6041", date: "2024-05-02", remittedAmount: 2000, status: "Remitted" },
  { shiftId: "S - 112", conductor: "Luigi Mansion", vehiclePlate: "RZP 6041", date: "2024-05-06", remittedAmount: 2300, status: "Remitted" },
  { shiftId: "S - 120", conductor: "Luigi Mansion", vehiclePlate: "RZP 6041", date: "2024-05-10", remittedAmount: 2100, status: "Pending" },
  // --- Sisa Doe History ---
  { shiftId: "S - 105", conductor: "Sisa Doe", vehiclePlate: "TNB 8462", date: "2024-05-03", remittedAmount: 2100, status: "Pending" },
  { shiftId: "S - 113", conductor: "Sisa Doe", vehiclePlate: "TNB 8462", date: "2024-05-07", remittedAmount: 2650, status: "Remitted" },
  { shiftId: "S - 121", conductor: "Sisa Doe", vehiclePlate: "TNB 8462", date: "2024-05-11", remittedAmount: 2700, status: "Remitted" },
  // --- Juan Dela Cruz History ---
  { shiftId: "S - 106", conductor: "Juan Dela Cruz", vehiclePlate: "JHX 7905", date: "2024-05-03", remittedAmount: 2800, status: "Remitted" },
  { shiftId: "S - 114", conductor: "Juan Dela Cruz", vehiclePlate: "JHX 7905", date: "2024-05-07", remittedAmount: 2150, status: "Pending" },
  { shiftId: "S - 122", conductor: "Juan Dela Cruz", vehiclePlate: "JHX 7905", date: "2024-05-11", remittedAmount: 2550, status: "Remitted" },
  // --- Maria Makiling History ---
  { shiftId: "S - 107", conductor: "Maria Makiling", vehiclePlate: "PVR 6894", date: "2024-05-04", remittedAmount: 2400, status: "Remitted" },
  { shiftId: "S - 115", conductor: "Maria Makiling", vehiclePlate: "PVR 6894", date: "2024-05-08", remittedAmount: 2850, status: "Remitted" },
  { shiftId: "S - 123", conductor: "Maria Makiling", vehiclePlate: "PVR 6894", date: "2024-05-12", remittedAmount: 2900, status: "Pending" },
  // --- Mhaku Jose History ---
  { shiftId: "S - 108", conductor: "Mhaku Jose", vehiclePlate: "QFD 2316", date: "2024-05-04", remittedAmount: 1900, status: "Pending" },
  { shiftId: "S - 116", conductor: "Mhaku Jose", vehiclePlate: "QFD 2316", date: "2024-05-08", remittedAmount: 1950, status: "Remitted" },
  { shiftId: "S - 124", conductor: "Mhaku Jose", vehiclePlate: "QFD 2316", date: "2024-05-12", remittedAmount: 3400, status: "Remitted" },
  // --- Karding Dela Paz (Single entry example) ---
  { shiftId: "S - 110", conductor: "Karding Dela Paz", vehiclePlate: "LKW 3579", date: "2024-05-05", remittedAmount: 2050, status: "Pending" },
];

const ROWS_PER_PAGE = 10;

export function RemittanceTable() {
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedConductor, setSelectedConductor] = useState<string | null>(null);

  // Filter data based on whether a conductor is selected
  const activeData = selectedConductor 
    ? REMITTANCE_DATA.filter(row => row.conductor === selectedConductor)
    : REMITTANCE_DATA;

  // Calculate total pages dynamically based on filtered data
  const totalPages = Math.max(1, Math.ceil(activeData.length / ROWS_PER_PAGE));

  // Get data for the current page
  const currentTableData = activeData.slice(
    (currentPage - 1) * ROWS_PER_PAGE,
    currentPage * ROWS_PER_PAGE
  );

  // Calculate total amounts for the summary header
  const totalAmount = activeData.reduce((sum, row) => sum + row.remittedAmount, 0);
  const remittedAmount = activeData.filter(row => row.status === "Remitted").reduce((sum, row) => sum + row.remittedAmount, 0);
  const pendingAmount = activeData.filter(row => row.status === "Pending").reduce((sum, row) => sum + row.remittedAmount, 0);

  // Handle clicking a conductor row
  const handleRowClick = (conductorName: string) => {
    setSelectedConductor(conductorName);
    setCurrentPage(1); // Reset to page 1 when viewing new history
  };

  // Handle going back to the main table
  const handleBackToAll = () => {
    setSelectedConductor(null);
    setCurrentPage(1);
  };

  return (
    <div className="bg-white/[0.04] border border-white/10 rounded-xl p-5 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-semibold text-white">
            {selectedConductor ? `History: ${selectedConductor}` : "Conductor Remittance"}
          </h3>
          {selectedConductor && (
            <button
              onClick={handleBackToAll}
              className="text-[10px] bg-white/[0.08] hover:bg-white/[0.12] text-white/60 px-2 py-0.5 rounded-md transition-colors flex items-center gap-1"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
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
        <table className="w-full text-left">
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
            {currentTableData.map((row) => (
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