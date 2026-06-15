// app/(admin)/receipts/page.tsx
'use client';

import { useState, useMemo } from 'react';
import { DataTable } from '@/components/admin/ui/data-table';
import { Badge } from '@/components/admin/ui/badge';
import { SearchBar } from '@/components/admin/ui/search-bar';
import { CalendarDays, Download, Filter, Wallet, Ticket, ChevronLeft, ChevronRight } from 'lucide-react';
import { initialReceiptData, type Receipt, type PaymentMethod } from '@/app/(admin)/receipts/data/receipts-data';

const ROWS_PER_PAGE = 20;

export default function ReceiptsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [paymentFilter, setPaymentFilter] = useState<PaymentMethod | 'All'>('All');
  const [currentPage, setCurrentPage] = useState(1);

  const paymentOptions: (PaymentMethod | 'All')[] = ['All', 'Gcash', 'Voucher'];

  // Filtered data
  const filteredData = useMemo(() => {
    return initialReceiptData.filter((item: Receipt) => {
      const matchesPayment = paymentFilter === 'All' || item.paymentMethod === paymentFilter;
      const matchesSearch = (item.commuterName ?? '').toLowerCase().includes(searchQuery.toLowerCase()) || item.id.toLowerCase().includes(searchQuery.toLowerCase());
      const itemDate = new Date(item.date);
      const matchesStart = !startDate || itemDate >= new Date(startDate);
      const matchesEnd = !endDate || itemDate <= new Date(endDate);
      return matchesPayment && matchesSearch && matchesStart && matchesEnd;
    });
  }, [searchQuery, startDate, endDate, paymentFilter]);

  // Reset to page 1 when filters change
  useMemo(() => { setCurrentPage(1); }, [searchQuery, startDate, endDate, paymentFilter]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredData.length / ROWS_PER_PAGE));
  const safeCurrentPage = currentPage > totalPages ? 1 : currentPage;
  const paginatedData = useMemo(() => {
    const startIndex = (safeCurrentPage - 1) * ROWS_PER_PAGE;
    return filteredData.slice(startIndex, startIndex + ROWS_PER_PAGE);
  }, [filteredData, safeCurrentPage]);

  // Summary stats
  const totalFare = filteredData.reduce((sum: number, item: Receipt) => sum + item.fare, 0);
  const gcashCount = filteredData.filter((item: Receipt) => item.paymentMethod === 'Gcash').length;
  const voucherCount = filteredData.filter((item: Receipt) => item.paymentMethod === 'Voucher').length;

  const columns = [
    { key: 'id', label: 'Receipt ID' },
    { key: 'commuterName', label: 'Commuter' },
    { key: 'plateNumber', label: 'Vehicle' },
    { key: 'route', label: 'Route' },
    { key: 'fare', label: 'Fare', render: (value: number) => (
      <span className="text-slate-200 font-medium">&#8369;{value.toFixed(2)}</span>
    )},
    {
      key: 'paymentMethod',
      label: 'Payment',
      render: (value: PaymentMethod) => (
        <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${
          value === 'Gcash' ? 'bg-[#62A0EA]/15 text-[#62A0EA]'
          : 'bg-pink-500/15 text-pink-400'
        }`}>
          {value === 'Gcash' && <Wallet size={12} />}
          {value === 'Voucher' && <Ticket size={12} />}
          {value}
        </span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: () => (
        <Badge variant="success">Completed</Badge>
      ),
    },
    { key: 'date', label: 'Date' },
    { key: 'time', label: 'Time' },
  ];

  const hasActiveFilters = searchQuery || startDate || endDate || paymentFilter !== 'All';

  return (
    <div style={{ touchAction: 'manipulation' }}>
      {/* ── Summary Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mb-6">
        <div className="bg-[#131C2E] border border-[#1E2D45] rounded-lg p-4">
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Total Receipts</p>
          <p className="text-xl lg:text-2xl font-bold text-white">{filteredData.length}</p>
        </div>
        <div className="bg-[#131C2E] border border-[#1E2D45] rounded-lg p-4">
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Total Revenue</p>
          <p className="text-xl lg:text-2xl font-bold text-[#62A0EA]">&#8369;{totalFare.toFixed(2)}</p>
        </div>
        <div className="bg-[#131C2E] border border-[#1E2D45] rounded-lg p-4">
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Gcash</p>
          <p className="text-xl lg:text-2xl font-bold text-[#62A0EA]">{gcashCount}</p>
        </div>
        <div className="bg-[#131C2E] border border-[#1E2D45] rounded-lg p-4">
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Voucher</p>
          <p className="text-xl lg:text-2xl font-bold text-pink-400">{voucherCount}</p>
        </div>
      </div>

      <div className="flex flex-col gap-6 mb-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-white">Receipts</h1>
          <button className="flex items-center gap-2 px-4 py-2 bg-[#62A0EA] text-white text-sm font-medium rounded-md hover:bg-[#4A8BD4] transition-colors shadow-lg shadow-[#62A0EA]/25 active:scale-95">
            <Download size={16} />
            <span className="hidden sm:inline">Export</span>
          </button>
        </div>

        {/* Payment Method Filter */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-500 uppercase tracking-wider">
            <Filter size={14} />
            <span>Payment Method</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {paymentOptions.map((filter) => (
              <button
                key={filter}
                onClick={() => setPaymentFilter(filter)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  paymentFilter === filter
                    ? 'bg-[#62A0EA] text-white shadow-lg shadow-[#62A0EA]/25'
                    : 'bg-[#0E1628] border border-[#1E2D45] text-slate-300 hover:bg-[#1A2540]'
                }`}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>

        {/* Search & Date Filters */}
        <div className="flex flex-col lg:flex-row gap-3 w-full">
          <SearchBar
            placeholder="Search by Commuter or Receipt ID..."
            value={searchQuery}
            onChange={setSearchQuery}
            className="w-full lg:w-64"
          />

          <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
            <div className="relative flex-1 lg:flex-none">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <CalendarDays className="h-4 w-4 text-slate-400" />
              </div>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="block w-full lg:w-48 pl-10 pr-3 py-2 bg-[#0E1628] border border-[#1E2D45] rounded-md text-white text-sm focus:outline-none focus:ring-1 focus:ring-[#62A0EA] focus:border-[#62A0EA] [color-scheme:dark]"
              />
            </div>

            <div className="relative flex-1 lg:flex-none">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <CalendarDays className="h-4 w-4 text-slate-400" />
              </div>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="block w-full lg:w-48 pl-10 pr-3 py-2 bg-[#0E1628] border border-[#1E2D45] rounded-md text-white text-sm focus:outline-none focus:ring-1 focus:ring-[#62A0EA] focus:border-[#62A0EA] [color-scheme:dark]"
              />
            </div>

            {hasActiveFilters && (
              <button
                onClick={() => {
                  setStartDate('');
                  setEndDate('');
                  setSearchQuery('');
                  setPaymentFilter('All');
                }}
                className="px-4 py-2 bg-[#0E1628] border border-[#1E2D45] rounded-md text-slate-300 hover:bg-[#1A2540] transition-colors text-sm w-full sm:w-auto"
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Table */}
      <DataTable
        data={paginatedData}
        columns={columns}
        searchQuery=""
      />

      {/* Pagination Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-center mt-4 gap-4 text-xs text-slate-400">
        <div>
          Showing {paginatedData.length > 0 ? (safeCurrentPage - 1) * ROWS_PER_PAGE + 1 : 0} to{' '}
          {(safeCurrentPage - 1) * ROWS_PER_PAGE + paginatedData.length} of{' '}
          <span className="text-slate-300 font-medium">{filteredData.length}</span> receipts
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentPage(safeCurrentPage - 1)}
            disabled={safeCurrentPage === 1}
            className="p-2 rounded-md bg-[#0E1628] border border-[#1E2D45] hover:bg-[#1A2540] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft size={16} />
          </button>

          <span className="px-4 py-2 bg-[#62A0EA]/20 text-[#62A0EA] rounded-md font-medium text-xs">
            Page {safeCurrentPage} of {totalPages}
          </span>

          <button
            onClick={() => setCurrentPage(safeCurrentPage + 1)}
            disabled={safeCurrentPage === totalPages}
            className="p-2 rounded-md bg-[#0E1628] border border-[#1E2D45] hover:bg-[#1A2540] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}