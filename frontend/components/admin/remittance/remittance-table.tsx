// components/admin/remittance/remittance-table.tsx
'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { DataTable } from '@/components/admin/ui/data-table';
import { BADGE_VARIANT_CLASSES } from '@/components/shared/badge';
import { ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';
import {
  useRemittanceData,
  type RemittanceRow,
  type RemittanceStatus,
} from '@/app/(admin)/remittance/data/remittance-data';
import { ConductorDetailModal } from '@/components/admin/remittance/conductor-detail-modal';
import { CashDeclarationModal } from '@/components/admin/remittance/cash-declaration-modal';
import { remittanceStatusVariant } from '@/lib/shared/remittance-status';

/** Real, ended remittances still awaiting the admin's cash count — the only
 * rows eligible for the "Declare Cash" action. A plain "Pending" row is a
 * still-active shift with no Remittance row yet to attach a declaration to. */
const canDeclareCash = (status: RemittanceStatus) => status === 'For Cash Declaration' || status === 'Overdue';

// Fixed size shared by both the "Declare" trigger and a plain status pill in
// the Status column, so the column never reflows depending on which one a
// given row happens to render.
const STATUS_PILL_CLASSES = 'inline-flex w-24 items-center justify-center gap-1 px-2 py-1 text-xs font-semibold rounded-full transition-colors';

// ─── Helper: format PHP currency ───────────────────────────────────────
const fmtPHP = (n: number) =>
  `₱${n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

interface RemittanceTableProps {
  searchQuery: string;
  selectedDate: string;
  /** Inclusive lower bound for the range presets (Today/7 Days/Month) — used
   * only when `selectedDate` (the exact-date picker) is empty. */
  dateFrom: string;
  statusFilter: RemittanceStatus | 'All';
  /** Conductor/driver dropdowns now render in the page header, alongside
   * search + date, so their value is a controlled prop instead of local state. */
  conductorFilter: string;
  driverFilter: string;
  /** Reports the current page's conductor/driver name lists up to the page
   * header so it can render the dropdown options without duplicating the fetch. */
  onOptionsChange: (conductorOptions: string[], driverOptions: string[]) => void;
  /** Set by a notification-bell deep-link (?shiftId=...) — once a fetched
   * record matches this shift_id, its Conductor Detail modal opens automatically. */
  autoOpenShiftId?: string | null;
  /** Called once the auto-open above has fired, so the page can clear it. */
  onAutoOpenHandled?: () => void;
}

const ROWS_PER_PAGE = 20;

export function RemittanceTable({ searchQuery, selectedDate, dateFrom, statusFilter, conductorFilter, driverFilter, onOptionsChange, autoOpenShiftId, onAutoOpenHandled }: RemittanceTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const { records, total, lastPage, isLoading, error, refresh } = useRemittanceData(currentPage, searchQuery, selectedDate, statusFilter, dateFrom, conductorFilter, driverFilter);
  const [selectedRecord, setSelectedRecord] = useState<RemittanceRow | null>(null);
  const [declaringRecord, setDeclaringRecord] = useState<RemittanceRow | null>(null);

  // Auto-open the deep-linked record's modal the moment it shows up in a
  // fetch. A render-phase adjustment (not an effect) so it takes effect the
  // instant `records` updates, same pattern as the "adjust state when a prop
  // changes" case in use-conductor-transactions.ts.
  const [autoOpenedFor, setAutoOpenedFor] = useState<string | null>(null);
  if (autoOpenShiftId && autoOpenShiftId !== autoOpenedFor) {
    const match = records.find((r) => r.shiftId === autoOpenShiftId);
    if (match) {
      setAutoOpenedFor(autoOpenShiftId);
      setSelectedRecord(match);
    }
  }

  // Tell the parent the auto-open fired so it can clear autoOpenShiftId —
  // a call to a prop function, not local state, so it belongs in an effect.
  useEffect(() => {
    if (autoOpenedFor) onAutoOpenHandled?.();
  }, [autoOpenedFor, onAutoOpenHandled]);

  const handleRowClick = useCallback((item: RemittanceRow) => {
    setSelectedRecord(item);
  }, []);

  // Column definitions now reference canonical RemittanceRecord field names
  const columns = [
    { key: 'shiftId', label: 'Shift ID' },
    { key: 'conductorName', label: 'Conductor' },
    { key: 'unitNumber', label: 'Unit Number' },
    { key: 'date', label: 'Date' },
    {
      key: '_totalAmount' as const,
      label: 'Amount',
      // Computed column — grand total of cash + GCash
      render: (_: unknown, row: RemittanceRow) =>
        fmtPHP(row.cashTotal + row.gcashTotal),
    },
    {
      key: 'remittanceStatus',
      label: 'Status',
      // Fixed-width column — both pill variants below share the exact same
      // size (STATUS_PILL_CLASSES), so which rows happen to be "Declare" vs
      // a plain status never reflows this column or the table around it.
      headerClassName: 'w-28',
      cellClassName: 'w-28',
      // When the row is eligible, the status pill itself is the trigger (a
      // chevron marks it as clickable) instead of a second element next to
      // it. Label is shortened to "Declare" (not the full status text) so a
      // long value like "For Cash Declaration" can't blow out the pill; the
      // full status is still the pill's color + the tooltip on hover.
      render: (value: RemittanceStatus, row: RemittanceRow) =>
        canDeclareCash(value) ? (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setDeclaringRecord(row); }}
            title={value}
            className={`${STATUS_PILL_CLASSES} hover:brightness-125 ${BADGE_VARIANT_CLASSES[remittanceStatusVariant(value)]}`}
          >
            Declare
            <ChevronDown size={12} />
          </button>
        ) : (
          <span className={`${STATUS_PILL_CLASSES} ${BADGE_VARIANT_CLASSES[remittanceStatusVariant(value)]}`}>{value}</span>
        ),
    },
  ];

  // Combined filter logic — now uses live hook data instead of static import
  const filteredData = useMemo(() => {
    return records.filter((item) => {
      // Status filter
      const matchesStatus = statusFilter === 'All' || item.remittanceStatus === statusFilter;

      // Search filter — match on conductor name or shift ID
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        item.conductorName.toLowerCase().includes(q) ||
        item.driverName.toLowerCase().includes(q) ||
        item.shiftId.toLowerCase().includes(q);

      // Exact date wins when set; otherwise fall back to the range preset's lower bound.
      const matchesDate = selectedDate
        ? item.date === selectedDate
        : !dateFrom || item.date >= dateFrom;
      const matchesConductor = !conductorFilter || item.conductorName === conductorFilter;
      const matchesDriver = !driverFilter || item.driverName === driverFilter;

      return matchesStatus && matchesSearch && matchesDate && matchesConductor && matchesDriver;
    });
  }, [records, searchQuery, selectedDate, dateFrom, statusFilter, conductorFilter, driverFilter]);

  const conductorOptions = useMemo(
    () => [...new Set(records.map((record) => record.conductorName).filter((name) => name && name !== '—'))].sort(),
    [records],
  );
  const driverOptions = useMemo(
    () => [...new Set(records.map((record) => record.driverName).filter((name) => name && name !== '—'))].sort(),
    [records],
  );

  // The dropdowns themselves render in the page header now; just report the
  // current option lists up so it can populate them without a second fetch.
  useEffect(() => {
    onOptionsChange(conductorOptions, driverOptions);
  }, [conductorOptions, driverOptions, onOptionsChange]);

  const filterKey = `${searchQuery}|${selectedDate}|${dateFrom}|${statusFilter}|${conductorFilter}|${driverFilter}`;
  const [previousFilterKey, setPreviousFilterKey] = useState(filterKey);
  if (filterKey !== previousFilterKey) {
    setPreviousFilterKey(filterKey);
    setCurrentPage(1);
  }

  // Pagination
  const totalPages = Math.max(1, lastPage);
  const safeCurrentPage = Math.min(currentPage, totalPages);

  const paginatedData = filteredData;

  const handlePrevPage = () => {
    if (safeCurrentPage > 1) setCurrentPage(safeCurrentPage - 1);
  };

  const handleNextPage = () => {
    if (safeCurrentPage < totalPages) setCurrentPage(safeCurrentPage + 1);
  };

  // Loading & error states
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-sm text-slate-400">Loading remittances...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3">
        <p className="text-sm text-red-400">{error}</p>
        <button
          onClick={refresh}
          className="px-4 py-2 bg-[#1A2540] border border-[#1E2D45] rounded-md text-xs text-slate-300 hover:text-white hover:bg-[#1E2D45]"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Click hint */}
      <p className="shrink-0 text-xs text-slate-600 mb-3 flex items-center gap-1.5">
        <span className="px-1.5 py-0.5 bg-[#0E1628] rounded text-[10px] text-slate-500 border border-[#1E2D45] font-mono">click</span>
        Click a row to view conductor details &amp; transaction history
      </p>

      <div className="flex-1 min-h-0">
        <DataTable
          data={paginatedData}
          columns={columns}
          searchQuery=""
          emptyMessage="No remittance records match your filters."
          height="100%"
          stickyHeader
          tableClassName="table-fixed"
          onRowDoubleClick={handleRowClick}
        />
      </div>

      {/* Pagination Controls */}
      <div className="shrink-0 flex flex-col sm:flex-row justify-between items-center mt-4 pt-4 border-t border-[#1E2D45] gap-4 text-xs text-slate-400">
        <div>
          Showing {paginatedData.length > 0 ? (safeCurrentPage - 1) * ROWS_PER_PAGE + 1 : 0} to{' '}
          {(safeCurrentPage - 1) * ROWS_PER_PAGE + paginatedData.length} of <span className="text-slate-300 font-medium">{total}</span> results
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handlePrevPage}
            disabled={safeCurrentPage === 1}
            className="p-2 rounded-md bg-[#0E1628] border border-[#1E2D45] hover:bg-[#1A2540] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft size={16} />
          </button>

          <span className="px-4 py-2 bg-[#62A0EA]/20 text-[#62A0EA] rounded-md font-medium text-xs">
            Page {safeCurrentPage} of {totalPages}
          </span>

          <button
            onClick={handleNextPage}
            disabled={safeCurrentPage === totalPages}
            className="p-2 rounded-md bg-[#0E1628] border border-[#1E2D45] hover:bg-[#1A2540] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Conductor Detail Modal */}
      <ConductorDetailModal
        isOpen={selectedRecord !== null}
        onClose={() => setSelectedRecord(null)}
        record={selectedRecord}
      />

      {/* Cash Declaration Modal — admin's physical cash count for a real,
          ended, undeclared remittance (see canDeclareCash above). */}
      <CashDeclarationModal
        isOpen={declaringRecord !== null}
        onClose={() => setDeclaringRecord(null)}
        onDeclared={refresh}
        record={declaringRecord}
      />
    </div>
  );
}
