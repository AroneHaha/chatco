// components/admin/remittance/remittance-table.tsx
'use client';

import { useState, useMemo, useCallback } from 'react';
import { DataTable } from '@/components/admin/ui/data-table';
import { Badge } from '@/components/admin/ui/badge';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { initialRemittanceData, type Remittance, type RemittanceStatus } from '@/app/(admin)/remittance/data/remittance-data';
import { ConductorDetailModal } from '@/components/admin/remittance/conductor-detail-modal';

interface RemittanceTableProps {
  searchQuery: string;
  startDate: string;
  endDate: string;
  statusFilter: RemittanceStatus | 'All';
}

const ROWS_PER_PAGE = 10;

export function RemittanceTable({ searchQuery, startDate, endDate, statusFilter }: RemittanceTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedConductor, setSelectedConductor] = useState<Remittance | null>(null);

  const handleRowClick = useCallback((item: Remittance) => {
    setSelectedConductor(item);
  }, []);

  const columns = [
    { key: 'id', label: 'Shift ID' },
    { key: 'conductor', label: 'Conductor' },
    { key: 'vehicle', label: 'Vehicle Plate' },
    { key: 'date', label: 'Date' },
    { key: 'amount', label: 'Remitted Amount' },
    {
      key: 'status',
      label: 'Status',
      render: (value: Remittance['status']) => (
        <Badge variant={value === 'Remitted' ? 'success' : 'warning'}>{value}</Badge>
      ),
    },
  ];

  // Combined Filter logic (Prepped for backend integration)
  const filteredData = useMemo(() => {
    return initialRemittanceData.filter((item: Remittance) => {
      // Quick Status Filter
      const matchesStatus = statusFilter === 'All' || item.status === statusFilter;

      // Search Filter
      const matchesSearch =
        item.conductor.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.id.toLowerCase().includes(searchQuery.toLowerCase());

      // Date Range Filter
      const itemDate = new Date(item.date);
      const matchesStart = !startDate || itemDate >= new Date(startDate);
      const matchesEnd = !endDate || itemDate <= new Date(endDate);

      return matchesStatus && matchesSearch && matchesStart && matchesEnd;
    });
  }, [searchQuery, startDate, endDate, statusFilter]);

  // Pagination Logic
  const totalPages = Math.max(1, Math.ceil(filteredData.length / ROWS_PER_PAGE));

  // Reset to page 1 if filters change and current page is now out of bounds
  const safeCurrentPage = currentPage > totalPages ? 1 : currentPage;

  const paginatedData = useMemo(() => {
    const startIndex = (safeCurrentPage - 1) * ROWS_PER_PAGE;
    return filteredData.slice(startIndex, startIndex + ROWS_PER_PAGE);
  }, [filteredData, safeCurrentPage]);

  const handlePrevPage = () => {
    if (safeCurrentPage > 1) setCurrentPage(safeCurrentPage - 1);
  };

  const handleNextPage = () => {
    if (safeCurrentPage < totalPages) setCurrentPage(safeCurrentPage + 1);
  };

  return (
    <div>
      {/* Click hint */}
      <p className="text-xs text-slate-600 mb-3 flex items-center gap-1.5">
        <span className="px-1.5 py-0.5 bg-[#0E1628] rounded text-[10px] text-slate-500 border border-[#1E2D45] font-mono">click</span>
        Click a row to view conductor details &amp; transaction history
      </p>

      <DataTable data={paginatedData} columns={columns} searchQuery="" onRowDoubleClick={handleRowClick} />

      {/* Pagination Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-center mt-4 gap-4 text-xs text-slate-400">
        <div>
          Showing {paginatedData.length > 0 ? (safeCurrentPage - 1) * ROWS_PER_PAGE + 1 : 0} to{' '}
          {(safeCurrentPage - 1) * ROWS_PER_PAGE + paginatedData.length} of <span className="text-slate-300 font-medium">{filteredData.length}</span> results
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
        isOpen={selectedConductor !== null}
        onClose={() => setSelectedConductor(null)}
        conductor={selectedConductor}
      />
    </div>
  );
}