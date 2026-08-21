"use client";

import { useState } from "react";
import type { AnalyticsRemittance } from "@/app/(admin)/analytics/data/analytics-data";
import { formatPeso } from "@/lib/admin/services/analytics.service";
import { Modal } from "@/components/admin/ui/modal";

const ROWS_PER_PAGE = 20;
const MODAL_ROWS_PER_PAGE = 20;

interface RemittanceTableProps {
  data: AnalyticsRemittance[];
  /** Selected analytics range, as YYYY-MM-DD. Shown top-right as From/To. */
  dateFrom?: string;
  dateTo?: string;
}

// "2026-07-21" -> "7-21-2026". Matches how the requester wrote the example
// (no zero-padding), so this deliberately doesn't reuse formatDateRangeLabel
// (which renders "Jul 21, 2026" style) or toLocalISODate (zero-padded ISO).
function formatUSDate(iso?: string): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return "—";
  return `${m}-${d}-${y}`;
}

function StatusBadge({ status }: { status: AnalyticsRemittance["status"] }) {
  return (
    <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
      status === "Remitted"
        ? "bg-sky-400/15 text-sky-400"
        : "bg-red-500/15 text-red-400"
    }`}>
      {status}
    </span>
  );
}

// Drill-down now opens in a modal instead of swapping the table's rows in
// place — the in-place swap kept the same shape (header, summary cards,
// table) with only small text changes, so clicking a row looked like nothing
// had happened. A modal overlay is unmistakable, and it leaves the full
// table underneath untouched so there's nothing to navigate "back" from.
function ConductorShiftsModal({
  conductor,
  rows,
  dateFrom,
  dateTo,
  onClose,
}: {
  conductor: string | null;
  rows: AnalyticsRemittance[];
  dateFrom?: string;
  dateTo?: string;
  onClose: () => void;
}) {
  const [page, setPage] = useState(1);

  const conductorRows = conductor ? rows.filter((r) => r.conductor === conductor) : [];
  const totalPages = Math.max(1, Math.ceil(conductorRows.length / MODAL_ROWS_PER_PAGE));
  const safePage = Math.min(page, totalPages);
  const pageRows = conductorRows.slice(
    (safePage - 1) * MODAL_ROWS_PER_PAGE,
    safePage * MODAL_ROWS_PER_PAGE
  );

  const totalAmount = conductorRows.reduce((sum, row) => sum + row.remittedAmount, 0);
  const totalCash = conductorRows.reduce((sum, row) => sum + row.cashAmount, 0);
  const totalGCash = conductorRows.reduce((sum, row) => sum + row.gcashAmount, 0);
  const pendingAmount = conductorRows
    .filter((row) => row.status === "Pending")
    .reduce((sum, row) => sum + row.remittedAmount, 0);

  return (
    <Modal isOpen={!!conductor} onClose={onClose} maxWidth="max-w-2xl">
      <div className="mb-5 pr-6">
        <h2 className="text-lg font-bold text-white">{conductor}</h2>
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-xs text-slate-500">{conductorRows.length} shift{conductorRows.length === 1 ? "" : "s"} in this range</p>
          {(dateFrom || dateTo) && (
            <span className="text-xs text-slate-400 whitespace-nowrap">
              From: {formatUSDate(dateFrom)} To: {formatUSDate(dateTo)}
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-5">
        <div className="bg-[#0E1628] rounded-lg p-2.5 border border-[#1E2D45]">
          <p className="text-[9px] uppercase tracking-wider text-slate-500 font-semibold">Total</p>
          <p className="text-sm font-bold text-white mt-0.5">{formatPeso(totalAmount)}</p>
        </div>
        <div className="bg-[#0E1628] rounded-lg p-2.5 border border-[#1E2D45]">
          <p className="text-[9px] uppercase tracking-wider text-slate-500 font-semibold">Cash</p>
          <p className="text-sm font-bold text-emerald-400 mt-0.5">{formatPeso(totalCash)}</p>
        </div>
        <div className="bg-[#0E1628] rounded-lg p-2.5 border border-[#1E2D45]">
          <p className="text-[9px] uppercase tracking-wider text-slate-500 font-semibold">GCash</p>
          <p className="text-sm font-bold text-blue-400 mt-0.5">{formatPeso(totalGCash)}</p>
        </div>
        <div className="bg-[#0E1628] rounded-lg p-2.5 border border-[#1E2D45]">
          <p className="text-[9px] uppercase tracking-wider text-slate-500 font-semibold">Pending</p>
          <p className="text-sm font-bold text-red-400 mt-0.5">{formatPeso(pendingAmount)}</p>
        </div>
      </div>

      {/* Fixed height (not max-height), matching ConductorDetailModal in the
          Remittance module — the header/summary above and pagination below
          stay put, and only the row list scrolls once it exceeds this box. */}
      <div className="h-[45vh] overflow-y-auto scrollbar-themed pr-1">
        {conductorRows.length === 0 ? (
          <div className="flex items-center justify-center h-full text-slate-600 text-xs">
            No shifts for this conductor in the selected range.
          </div>
        ) : (
          <div className="space-y-2">
            {pageRows.map((row) => (
              <div key={row.shiftId} className="bg-[#0E1628] border border-[#1E2D45] rounded-lg p-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs text-[#62A0EA] font-mono font-medium">{row.shiftId}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{row.vehiclePlate} · {row.date}</p>
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  <div className="text-right">
                    <p className="text-[10px] text-slate-500">Cash</p>
                    <p className="text-xs text-emerald-400 font-semibold">{formatPeso(row.cashAmount)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-slate-500">GCash</p>
                    <p className="text-xs text-blue-400 font-semibold">{formatPeso(row.gcashAmount)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-slate-500">Total</p>
                    <p className="text-xs text-white font-semibold">{formatPeso(row.remittedAmount)}</p>
                  </div>
                  <StatusBadge status={row.status} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {conductorRows.length > 0 && (
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-[#1E2D45]">
          <p className="text-xs text-slate-500">
            Page <span className="text-white font-medium">{safePage}</span> of <span className="text-white font-medium">{totalPages}</span>
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(Math.max(safePage - 1, 1))}
              disabled={safePage === 1}
              className="px-3 py-1.5 rounded-md text-xs font-medium bg-[#0E1628] border border-[#1E2D45] text-slate-400 hover:bg-[#1A2540] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              Previous
            </button>
            <button
              onClick={() => setPage(Math.min(safePage + 1, totalPages))}
              disabled={safePage === totalPages}
              className="px-3 py-1.5 rounded-md text-xs font-medium bg-[#62A0EA] text-white hover:bg-[#4A8BD4] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}

export function RemittanceTable({ data, dateFrom, dateTo }: RemittanceTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedConductor, setSelectedConductor] = useState<string | null>(null);

  const totalPages = Math.max(1, Math.ceil(data.length / ROWS_PER_PAGE));

  const currentTableData = data.slice(
    (currentPage - 1) * ROWS_PER_PAGE,
    currentPage * ROWS_PER_PAGE
  );

  const totalAmount = data.reduce((sum, row) => sum + row.remittedAmount, 0);
  const totalCash = data.reduce((sum, row) => sum + row.cashAmount, 0);
  const totalGCash = data.reduce((sum, row) => sum + row.gcashAmount, 0);
  const pendingAmount = data
    .filter((row) => row.status === "Pending")
    .reduce((sum, row) => sum + row.remittedAmount, 0);

  return (
    <div className="bg-[#131C2E] border border-[#1E2D45] rounded-lg p-5 h-150 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 shrink-0">
        <h3 className="text-sm font-semibold text-white">Conductor Remittance</h3>
        <span className="text-[10px] bg-[#0E1628] text-slate-500 px-2 py-0.5 rounded">
          {data.length} Shifts
        </span>
      </div>

      {/* Mini Summary Cards */}
      <div className="grid grid-cols-4 gap-2 mb-4 shrink-0">
        <div className="bg-[#0E1628] rounded-lg p-2.5 border border-[#1E2D45]">
          <p className="text-[9px] uppercase tracking-wider text-slate-500 font-semibold">Total</p>
          <p className="text-sm font-bold text-white mt-0.5">{formatPeso(totalAmount)}</p>
        </div>
        <div className="bg-[#0E1628] rounded-lg p-2.5 border border-[#1E2D45]">
          <p className="text-[9px] uppercase tracking-wider text-slate-500 font-semibold">Cash</p>
          <p className="text-sm font-bold text-emerald-400 mt-0.5">{formatPeso(totalCash)}</p>
        </div>
        <div className="bg-[#0E1628] rounded-lg p-2.5 border border-[#1E2D45]">
          <p className="text-[9px] uppercase tracking-wider text-slate-500 font-semibold">GCash</p>
          <p className="text-sm font-bold text-blue-400 mt-0.5">{formatPeso(totalGCash)}</p>
        </div>
        <div className="bg-[#0E1628] rounded-lg p-2.5 border border-[#1E2D45]">
          <p className="text-[9px] uppercase tracking-wider text-slate-500 font-semibold">Pending</p>
          <p className="text-sm font-bold text-red-400 mt-0.5">{formatPeso(pendingAmount)}</p>
        </div>
      </div>

      {/* Table Container. overflow-y-auto (not overflow-hidden) — the card's
          height stays fixed at 600px regardless of row count, so once rows
          exceed what fits, the body scrolls instead of clipping silently or
          growing the card. */}
      <div className="flex-1 min-h-0 overflow-y-auto scrollbar-themed">
        {data.length === 0 ? (
          <div className="flex items-center justify-center h-full text-slate-600 text-xs">
            No remittance data available.
          </div>
        ) : (
          <table className="w-full text-left h-full">
            <thead className="sticky top-0 bg-[#131C2E] z-10">
              <tr className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold border-b border-[#1E2D45]">
                <th className="pb-3 pr-2 font-medium">Shift ID</th>
                <th className="pb-3 pr-2 font-medium">Conductor</th>
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
                  onClick={() => setSelectedConductor(row.conductor)}
                  title={`View ${row.conductor}'s shift history`}
                  className="transition-colors hover:bg-[#0E1628] cursor-pointer"
                >
                  <td className="py-3 pr-2 text-xs text-[#62A0EA] font-mono font-medium">{row.shiftId}</td>
                  <td className="py-3 pr-2 text-xs text-slate-300 font-medium">
                    <span className="flex items-center gap-2">
                      {row.conductor}
                      <svg className="w-3 h-3 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                      </svg>
                    </span>
                  </td>
                  <td className="py-3 pr-2 text-xs text-slate-500 hidden md:table-cell">{row.date}</td>
                  <td className="py-3 pr-2 text-xs text-emerald-400 font-semibold text-right">{formatPeso(row.cashAmount)}</td>
                  <td className="py-3 pr-2 text-xs text-blue-400 font-semibold text-right">{formatPeso(row.gcashAmount)}</td>
                  <td className="py-3 pr-2 text-xs text-white font-semibold text-right">{formatPeso(row.remittedAmount)}</td>
                  <td className="py-3 text-center">
                    <StatusBadge status={row.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination Controls */}
      <div className="flex items-center justify-between mt-4 pt-4 border-t border-[#1E2D45] shrink-0">
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

      {/* Keyed by conductor so the modal fully remounts (and its `page`
          state resets to 1) whenever a different row is clicked, instead of
          persisting stale pagination across conductors. */}
      <ConductorShiftsModal
        key={selectedConductor ?? "none"}
        conductor={selectedConductor}
        rows={data}
        dateFrom={dateFrom}
        dateTo={dateTo}
        onClose={() => setSelectedConductor(null)}
      />
    </div>
  );
}
