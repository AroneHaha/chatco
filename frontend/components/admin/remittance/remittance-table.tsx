// components/admin/remittance/remittance-table.tsx
'use client';

import { useState, useMemo } from 'react';
import { DataTable } from '@/components/admin/ui/data-table';
import { Badge } from '@/components/admin/ui/badge';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface RemittanceTableProps {
  searchQuery: string;
  startDate: string;
  endDate: string;
  statusFilter: string;
}

// Mock data structured for backend integration
const mockData = [
  { id: 'S-101', conductor: 'Juan Dela Cruz', vehicle: 'ABC-123', status: 'Remitted', amount: '₱2,500.00', date: '2024-05-01' },
  { id: 'S-102', conductor: 'Pedro Santos', vehicle: 'XYZ-789', status: 'Pending', amount: '₱2,450.00', date: '2024-05-01' },
  { id: 'S-103', conductor: 'Maria Reyes', vehicle: 'DEF-456', status: 'Remitted', amount: '₱2,600.00', date: '2024-05-02' },
  { id: 'S-104', conductor: 'Jose Rizal', vehicle: 'GHI-789', status: 'Remitted', amount: '₱2,550.00', date: '2024-05-03' },
  { id: 'S-105', conductor: 'Andres Bonifacio', vehicle: 'JKL-012', status: 'Pending', amount: '₱2,400.00', date: '2024-05-04' },
];

const ROWS_PER_PAGE = 100;

export function RemittanceTable({ searchQuery, startDate, endDate, statusFilter }: RemittanceTableProps) {
  const [currentPage, setCurrentPage] = useState(1);

  const columns = [
    { key: 'id', label: 'Shift ID' },
    { key: 'conductor', label: 'Conductor' },
    { key: 'vehicle', label: 'Vehicle Plate' },
    { key: 'date', label: 'Date' },
    { key: 'amount', label: 'Remitted Amount' },
    {
      key: 'status',
      label: 'Status',
      render: (value: string) => (
        <Badge variant={value === 'Remitted' ? 'success' : 'warning'}>{value}</Badge>
      ),
    },
  ];

  // Combined Filter logic (Prepped for backend integration)
  const filteredData = useMemo(() => {
    return mockData.filter((item) => {
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
      <DataTable data={paginatedData} columns={columns} searchQuery={""} />
      
      {/* Pagination Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-center mt-4 gap-4 text-sm text-gray-300">
        <div>
          Showing {paginatedData.length > 0 ? (safeCurrentPage - 1) * ROWS_PER_PAGE + 1 : 0} to{' '}
          {(safeCurrentPage - 1) * ROWS_PER_PAGE + paginatedData.length} of {filteredData.length} results
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={handlePrevPage}
            disabled={safeCurrentPage === 1}
            className="p-2 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft size={16} />
          </button>
          
          <span className="px-4 py-2 bg-blue-500/20 text-blue-400 rounded-lg font-medium">
            Page {safeCurrentPage} of {totalPages}
          </span>
          
          <button
            onClick={handleNextPage}
            disabled={safeCurrentPage === totalPages}
            className="p-2 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}