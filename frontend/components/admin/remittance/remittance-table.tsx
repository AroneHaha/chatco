// components/admin/remittance/remittance-table.tsx
'use client';

import { useState, useMemo, useCallback } from 'react';
import { DataTable } from '@/components/admin/ui/data-table';
import { Badge } from '@/components/admin/ui/badge';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  useRemittanceData,
  type RemittanceRow,
  type RemittanceStatus,
} from '@/app/(admin)/remittance/data/remittance-data';
import { ConductorDetailModal } from '@/components/admin/remittance/conductor-detail-modal';

// ─── Helper: format PHP currency ───────────────────────────────────────
const fmtPHP = (n: number) =>
  `₱${n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

interface RemittanceTableProps {
  searchQuery: string;
  selectedDate: string;
  statusFilter: RemittanceStatus | 'All';
}

const ROWS_PER_PAGE = 10;

export function RemittanceTable({ searchQuery, selectedDate, statusFilter }: RemittanceTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const { records, total, lastPage, isLoading, error, refresh } = useRemittanceData(currentPage, searchQuery, selectedDate, statusFilter);
  const [selectedRecord, setSelectedRecord] = useState<RemittanceRow | null>(null);
  const [conductorFilter, setConductorFilter] = useState('');
  const [driverFilter, setDriverFilter] = useState('');

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
      label: 'Remitted Amount',
      // Computed column — grand total of cash + GCash
      render: (_: unknown, row: RemittanceRow) =>
        fmtPHP(row.cashDeclared + row.gcashTotal),
    },
    {
      key: 'remittanceStatus',
      label: 'Status',
      render: (value: RemittanceStatus) => (
        <Badge variant={value === 'Remitted' ? 'success' : value === 'Pending' || value === 'Overdue' ? 'warning' : 'danger'}>{value}</Badge>
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

      const matchesDate = !selectedDate || item.date === selectedDate;
      const matchesConductor = !conductorFilter || item.conductorName === conductorFilter;
      const matchesDriver = !driverFilter || item.driverName === driverFilter;

      return matchesStatus && matchesSearch && matchesDate && matchesConductor && matchesDriver;
    });
  }, [records, searchQuery, selectedDate, statusFilter, conductorFilter, driverFilter]);

  const conductorOptions = useMemo(
    () => [...new Set(records.map((record) => record.conductorName).filter((name) => name && name !== '—'))].sort(),
    [records],
  );
  const driverOptions = useMemo(
    () => [...new Set(records.map((record) => record.driverName).filter((name) => name && name !== '—'))].sort(),
    [records],
  );

  const filterKey = `${searchQuery}|${selectedDate}|${statusFilter}|${conductorFilter}|${driverFilter}`;
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
    <div>
      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="space-y-1">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Conductor</span>
          <select
            value={conductorFilter}
            onChange={(event) => setConductorFilter(event.target.value)}
            className="w-full rounded-md border border-[#1E2D45] bg-[#0E1628] px-3 py-2 text-sm text-white [color-scheme:dark]"
          >
            <option value="">All conductors</option>
            {conductorOptions.map((name) => <option key={name} value={name}>{name}</option>)}
          </select>
        </label>
        <label className="space-y-1">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Driver</span>
          <select
            value={driverFilter}
            onChange={(event) => setDriverFilter(event.target.value)}
            className="w-full rounded-md border border-[#1E2D45] bg-[#0E1628] px-3 py-2 text-sm text-white [color-scheme:dark]"
          >
            <option value="">All drivers</option>
            {driverOptions.map((name) => <option key={name} value={name}>{name}</option>)}
          </select>
        </label>
      </div>
      {/* Click hint */}
      <p className="text-xs text-slate-600 mb-3 flex items-center gap-1.5">
        <span className="px-1.5 py-0.5 bg-[#0E1628] rounded text-[10px] text-slate-500 border border-[#1E2D45] font-mono">click</span>
        Click a row to view conductor details &amp; transaction history
      </p>

      <DataTable
        data={paginatedData}
        columns={columns}
        searchQuery=""
        emptyMessage="No remittance records match your filters."
        height="32rem"
        stickyHeader
        tableClassName="table-fixed"
        onRowDoubleClick={handleRowClick}
      />

      {/* Pagination Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-center mt-4 gap-4 text-xs text-slate-400">
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
        allRecords={records}
      />
    </div>
  );
}
