"use client";

import { useState } from "react";
import type { AnalyticsRemittance } from "@/app/(admin)/analytics/data/analytics-data";
import { formatPeso } from "@/lib/admin/services/analytics.service";
import { REMITTANCE_STATUS_LABEL, SummaryBoxes as SummaryBoxGrid } from "@/components/admin/analytics/report-tables";
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

// Plain text, no colour per status (UI rules): the label carries the state
// and a shortage/overage shows its amount, so a short shift no longer reads
// as "Remitted" the way the old two-state badge did.
function StatusText({ row }: { row: AnalyticsRemittance }) {
  const label = REMITTANCE_STATUS_LABEL[row.status] ?? row.status;
  const amount = row.status === "SHORTAGE" ? row.shortage : row.status === "OVERAGE" ? row.overage : null;
  return (
    <span className={`text-xs font-medium whitespace-nowrap ${row.status === "PENDING" ? "text-slate-500" : "text-slate-300 admin-light:text-slate-700"}`}>
      {label}
      {amount !== null && <span className="text-slate-500"> · {formatPeso(amount)}</span>}
    </span>
  );
}

/** Fares, cash, GCash and the cash not yet handed in. GCash settles online,
 * so only cash is ever awaited from a conductor. */
function SummaryBoxes({ rows }: { rows: AnalyticsRemittance[] }) {
  const cash = rows.reduce((total, row) => total + row.cashAmount, 0);
  const gcash = rows.reduce((total, row) => total + row.gcashAmount, 0);
  const awaiting = rows
    .filter((row) => row.status === "PENDING")
    .reduce((total, row) => total + row.cashAmount, 0);

  return (
    <SummaryBoxGrid
      items={[
        { label: "Total fares", value: formatPeso(cash + gcash) },
        { label: "Cash", value: formatPeso(cash) },
        { label: "GCash", value: formatPeso(gcash) },
        { label: "Awaiting cash", value: formatPeso(awaiting) },
      ]}
    />
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

  return (
    <Modal isOpen={!!conductor} onClose={onClose} maxWidth="max-w-2xl" adminThemed>
      <div className="mb-5 pr-6">
        <h2 className="text-lg font-bold text-white admin-light:text-slate-900">{conductor}</h2>
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-xs text-slate-500">{conductorRows.length} shift{conductorRows.length === 1 ? "" : "s"} in this range</p>
          {(dateFrom || dateTo) && (
            <span className="text-xs text-slate-400 admin-light:text-slate-500 whitespace-nowrap">
              From: {formatUSDate(dateFrom)} To: {formatUSDate(dateTo)}
            </span>
          )}
        </div>
      </div>

      <div className="mb-5">
        <SummaryBoxes rows={conductorRows} />
      </div>

      {/* Fixed height (not max-height), matching ConductorDetailModal in the
          Remittance module — the header/summary above and pagination below
          stay put, and only the row list scrolls once it exceeds this box. */}
      <div className="h-[45vh] overflow-y-auto scrollbar-themed pr-1">
        {conductorRows.length === 0 ? (
          <div className="flex items-center justify-center h-full text-slate-600 admin-light:text-slate-500 text-xs">
            No shifts for this conductor in the selected range.
          </div>
        ) : (
          <div className="space-y-2">
            {pageRows.map((row) => (
              <div key={row.shiftId} className="bg-[#0E1628] admin-light:bg-[#F1F5F9] border border-[#1E2D45] admin-light:border-[#E2E8F0] rounded-lg p-3 flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs text-slate-300 admin-light:text-slate-700 font-mono font-medium">{row.shiftId}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{row.unit} · {row.date}</p>
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  {[
                    ["Cash", row.cashAmount],
                    ["GCash", row.gcashAmount],
                    ["Remitted", row.remittedAmount],
                  ].map(([label, value]) => (
                    <div key={label as string} className="text-right">
                      <p className="text-[10px] text-slate-500">{label}</p>
                      <p className="text-xs tabular-nums text-white admin-light:text-slate-900 font-semibold">
                        {value === null ? "—" : formatPeso(value as number)}
                      </p>
                    </div>
                  ))}
                  <StatusText row={row} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {conductorRows.length > 0 && (
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-[#1E2D45] admin-light:border-[#E2E8F0]">
          <p className="text-xs text-slate-500">
            Page <span className="text-white admin-light:text-slate-900 font-medium">{safePage}</span> of <span className="text-white admin-light:text-slate-900 font-medium">{totalPages}</span>
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(Math.max(safePage - 1, 1))}
              disabled={safePage === 1}
              className="px-3 py-1.5 rounded-md text-xs font-medium bg-[#0E1628] admin-light:bg-[#F1F5F9] border border-[#1E2D45] admin-light:border-[#E2E8F0] text-slate-400 admin-light:text-slate-500 hover:bg-[#1A2540] admin-light:hover:bg-[#EEF2F7] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              Previous
            </button>
            <button
              onClick={() => setPage(Math.min(safePage + 1, totalPages))}
              disabled={safePage === totalPages}
              className="px-3 py-1.5 rounded-md text-xs font-medium bg-[#62A0EA] admin-light:bg-[#1A5FB4] text-white hover:bg-[#4A8BD4] admin-light:hover:bg-[#164A8F] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
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
  const safePage = Math.min(currentPage, totalPages);

  const currentTableData = data.slice(
    (safePage - 1) * ROWS_PER_PAGE,
    safePage * ROWS_PER_PAGE
  );

  return (
    // 600px below lg; on lg it stretches to the bottom of the Reports tab.
    <div className="bg-[#131C2E] admin-light:bg-white border border-[#1E2D45] admin-light:border-[#E2E8F0] rounded-lg p-5 h-150 lg:h-auto lg:flex-1 lg:min-h-[28rem] flex flex-col">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-4 shrink-0">
        <div className="min-w-0">
          <h2 className="text-lg font-bold text-white admin-light:text-slate-900">Shift Remittance</h2>
          <p className="text-xs text-slate-400 admin-light:text-slate-500">Each ended shift&apos;s fares and the cash the admin counted. Select a row for that conductor&apos;s shifts.</p>
        </div>
        <span className="shrink-0 text-xs tabular-nums text-slate-500">
          {data.length} {data.length === 1 ? "shift" : "shifts"}
        </span>
      </div>

      <div className="mb-4 shrink-0">
        <SummaryBoxes rows={data} />
      </div>

      {/* Table Container. overflow-y-auto (not overflow-hidden) — the card's
          height stays fixed at 600px regardless of row count, so once rows
          exceed what fits, the body scrolls instead of clipping silently or
          growing the card. */}
      <div className="flex-1 min-h-0 overflow-auto scrollbar-themed">
        {data.length === 0 ? (
          <div className="flex items-center justify-center h-full text-slate-600 admin-light:text-slate-500 text-xs">
            No ended shifts in this date range.
          </div>
        ) : (
          <table className="w-full min-w-[40rem] text-left">
            <thead className="sticky top-0 bg-[#131C2E] admin-light:bg-white z-10">
              <tr className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold border-b border-[#1E2D45] admin-light:border-[#E2E8F0]">
                <th className="pb-3 pr-3 font-medium">Shift ID</th>
                <th className="pb-3 pr-3 font-medium">Conductor</th>
                <th className="pb-3 pr-3 font-medium">Unit</th>
                <th className="pb-3 pr-3 font-medium">Date</th>
                <th className="pb-3 pr-3 font-medium text-right">Cash</th>
                <th className="pb-3 pr-3 font-medium text-right">GCash</th>
                <th className="pb-3 pr-3 font-medium text-right">Cash Remitted</th>
                <th className="pb-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1E2D45] admin-light:divide-[#E2E8F0]">
              {currentTableData.map((row) => (
                <tr
                  key={row.shiftId}
                  onClick={() => setSelectedConductor(row.conductor)}
                  title={`View ${row.conductor}'s shift history`}
                  className="transition-colors hover:bg-[#0E1628] admin-light:hover:bg-[#F8FAFC] cursor-pointer"
                >
                  <td className="py-3 pr-3 text-xs text-slate-300 admin-light:text-slate-700 font-mono font-medium whitespace-nowrap">{row.shiftId}</td>
                  <td className="py-3 pr-3 text-xs text-slate-300 admin-light:text-slate-700 font-medium">
                    <span className="flex items-center gap-2">
                      {row.conductor}
                      <svg className="w-3 h-3 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                      </svg>
                    </span>
                  </td>
                  <td className="py-3 pr-3 text-xs text-slate-400 admin-light:text-slate-500">{row.unit}</td>
                  <td className="py-3 pr-3 text-xs text-slate-500 whitespace-nowrap">{row.date}</td>
                  <td className="py-3 pr-3 text-xs tabular-nums text-slate-300 admin-light:text-slate-700 text-right">{formatPeso(row.cashAmount)}</td>
                  <td className="py-3 pr-3 text-xs tabular-nums text-slate-300 admin-light:text-slate-700 text-right">{formatPeso(row.gcashAmount)}</td>
                  <td className="py-3 pr-3 text-xs tabular-nums text-white admin-light:text-slate-900 font-semibold text-right">
                    {row.remittedAmount === null ? "—" : formatPeso(row.remittedAmount)}
                  </td>
                  <td className="py-3">
                    <StatusText row={row} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination Controls */}
      <div className="flex items-center justify-between mt-4 pt-4 border-t border-[#1E2D45] admin-light:border-[#E2E8F0] shrink-0">
        <p className="text-xs text-slate-500">
          Page <span className="text-white admin-light:text-slate-900 font-medium">{safePage}</span> of <span className="text-white admin-light:text-slate-900 font-medium">{totalPages}</span>
        </p>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentPage(Math.max(safePage - 1, 1))}
            disabled={safePage === 1}
            className="px-3 py-1.5 rounded-md text-xs font-medium bg-[#0E1628] admin-light:bg-[#F1F5F9] border border-[#1E2D45] admin-light:border-[#E2E8F0] text-slate-400 admin-light:text-slate-500 hover:bg-[#1A2540] admin-light:hover:bg-[#EEF2F7] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            Previous
          </button>

          <button
            onClick={() => setCurrentPage(Math.min(safePage + 1, totalPages))}
            disabled={safePage === totalPages}
            className="px-3 py-1.5 rounded-md text-xs font-medium bg-[#62A0EA] admin-light:bg-[#1A5FB4] text-white hover:bg-[#4A8BD4] admin-light:hover:bg-[#164A8F] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
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
