// app/(admin)/receipts/page.tsx
'use client';

import { useState, useMemo, useCallback } from 'react';
import { DataTable } from '@/components/admin/ui/data-table';
import { Badge } from '@/components/admin/ui/badge';
import { SearchBar } from '@/components/admin/ui/search-bar';
import { CalendarDays, Download, Filter, Wallet, Ticket, Banknote, ChevronLeft, ChevronRight, AlertCircle, RefreshCw, ReceiptText, Smartphone, Coins } from 'lucide-react';
import { useReceiptsData, type Receipt, type PaymentMethod } from '@/app/(admin)/receipts/data/receipts-data';

const ROWS_PER_PAGE = 20;

export default function ReceiptsPage() {
  const { records, isLoading, isRefreshing, error, refresh } = useReceiptsData();
  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [paymentFilter, setPaymentFilter] = useState<PaymentMethod | 'All'>('All');
  const [currentPage, setCurrentPage] = useState(1);

  const paymentOptions: (PaymentMethod | 'All')[] = ['All', 'Cash', 'Gcash', 'Voucher'];

  // Reset to page 1 when filters change — uses the "adjust state during
  // render" pattern instead of useEffect to avoid cascading renders.
  const [prevFilterKey, setPrevFilterKey] = useState('');
  const filterKey = `${searchQuery}|${startDate}|${endDate}|${paymentFilter}`;
  if (filterKey !== prevFilterKey) {
    setPrevFilterKey(filterKey);
    setCurrentPage(1);
  }

  // Filtered data
  const filteredData = useMemo(() => {
    return records.filter((item: Receipt) => {
      const matchesPayment = paymentFilter === 'All' || item.paymentMethod === paymentFilter;
      const matchesSearch = item.commuterName.toLowerCase().includes(searchQuery.toLowerCase()) || item.id.toLowerCase().includes(searchQuery.toLowerCase());
      const itemDate = new Date(item.date);
      const matchesStart = !startDate || itemDate >= new Date(startDate);
      const matchesEnd = !endDate || itemDate <= new Date(endDate);
      return matchesPayment && matchesSearch && matchesStart && matchesEnd;
    });
  }, [records, searchQuery, startDate, endDate, paymentFilter]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredData.length / ROWS_PER_PAGE));
  const safeCurrentPage = currentPage > totalPages ? 1 : currentPage;
  const paginatedData = useMemo(() => {
    const startIndex = (safeCurrentPage - 1) * ROWS_PER_PAGE;
    return filteredData.slice(startIndex, startIndex + ROWS_PER_PAGE);
  }, [filteredData, safeCurrentPage]);

  // ── CSV Export ──
  // Generates a CSV from the currently-filtered data (not just the current
  // page) and triggers a download. All fields are quoted + escaped to handle
  // commas/newlines in values.
  const handleExportCSV = useCallback(() => {
    const headers = ['Transaction ID', 'Commuter Name', 'Commuter ID', 'Plate Number', 'Route', 'Fare', 'Payment Method', 'Status', 'Date', 'Time'];
    const rows = filteredData.map(r => [
      r.id,
      r.commuterName,
      r.commuterId,
      r.plateNumber,
      r.route,
      r.fare.toFixed(2),
      r.paymentMethod,
      r.status,
      r.date,
      r.time,
    ]);

    // Escape each value: wrap in quotes, double any existing quotes.
    const escapeCsv = (val: string | number) => `"${String(val).replace(/"/g, '""')}"`;
    const csvContent = [
      headers.map(escapeCsv).join(','),
      ...rows.map(row => row.map(escapeCsv).join(',')),
    ].join('\n');

    // Add BOM so Excel opens UTF-8 correctly.
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `chatco-receipts-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [filteredData]);

  // Summary stats
  const totalFare = filteredData.reduce((sum: number, item: Receipt) => sum + item.fare, 0);
  const cashCount = filteredData.filter((item: Receipt) => item.paymentMethod === 'Cash').length;
  const gcashCount = filteredData.filter((item: Receipt) => item.paymentMethod === 'Gcash').length;

  const columns = [
    { key: 'id', label: 'Receipt ID' },
    { key: 'commuterName', label: 'Passenger' },
    { key: 'plateNumber', label: 'Vehicle' },
    { key: 'route', label: 'Route' },
    { key: 'fare', label: 'Fare', render: (value: number) => (
      <span className="text-slate-200 font-medium">₱{value.toFixed(2)}</span>
    )},
    {
      key: 'paymentMethod',
      label: 'Payment',
      render: (value: PaymentMethod) => (
        <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${
          value === 'Gcash' ? 'bg-[#62A0EA]/15 text-[#62A0EA]'
          : value === 'Voucher' ? 'bg-pink-500/15 text-pink-400'
          : 'bg-emerald-500/15 text-emerald-400'
        }`}>
          {value === 'Gcash' && <Wallet size={12} />}
          {value === 'Voucher' && <Ticket size={12} />}
          {value === 'Cash' && <Banknote size={12} />}
          {value}
        </span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (value: string) => {
        switch (value) {
          case 'Completed': return <Badge variant="success">Completed</Badge>;
          case 'Pending':   return <Badge variant="warning">Pending</Badge>;
          case 'Failed':    return <Badge variant="danger">Failed</Badge>;
          case 'Cancelled': return <Badge variant="danger">Cancelled</Badge>;
          case 'Expired':   return <Badge variant="warning">Expired</Badge>;
          case 'Refunded':  return <Badge variant="info">Refunded</Badge>;
          default:          return <Badge variant="success">Completed</Badge>;
        }
      },
    },
    { key: 'date', label: 'Date' },
    { key: 'time', label: 'Time' },
  ];

  const hasActiveFilters = searchQuery || startDate || endDate || paymentFilter !== 'All';

  // ─── Initial Loading State (Skeleton) ───
  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        {/* Skeleton Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-[#131C2E] border border-[#1E2D45] rounded-lg p-4 h-24" />
          ))}
        </div>
        {/* Skeleton Header */}
        <div className="flex items-center justify-between">
          <div className="h-8 w-32 rounded bg-[#131C2E]" />
          <div className="h-10 w-28 rounded bg-[#131C2E]" />
        </div>
        {/* Skeleton Filters */}
        <div className="flex gap-3">
          <div className="h-10 w-64 rounded bg-[#131C2E]" />
          <div className="h-10 w-48 rounded bg-[#131C2E]" />
          <div className="h-10 w-48 rounded bg-[#131C2E]" />
        </div>
        {/* Skeleton Table */}
        <div className="bg-[#131C2E] border border-[#1E2D45] rounded-lg p-5 space-y-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-10 w-full rounded bg-[#0E1628]" />
          ))}
        </div>
      </div>
    );
  }

  // ─── Error State (Only on initial load failure) ───
  if (error && records.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <AlertCircle className="h-12 w-12 text-red-400 mb-4" />
        <h2 className="text-lg font-semibold text-white mb-2">Failed to load receipts</h2>
        <p className="text-sm text-slate-400 mb-4">{error}</p>
        <button
          onClick={() => refresh(false)}
          className="px-4 py-2 bg-[#62A0EA] hover:bg-[#4A8BD4] text-white rounded-md text-sm font-medium transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div style={{ touchAction: 'manipulation' }}>
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-lg bg-[#62A0EA]/15 flex items-center justify-center shrink-0">
            <ReceiptText size={22} className="text-[#62A0EA]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white leading-tight">Fare Receipts</h1>
            <p className="text-sm text-slate-400 mt-1 max-w-xl">
              A complete log of every fare recorded across all trips and conductors — each row is one
              passenger&apos;s payment, with its method and status. Use it to search, audit, and export the
              raw payment history.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {/* Manual Refresh Button */}
          <button
            onClick={() => refresh(false)}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-3 py-2 bg-[#0E1628] border border-[#1E2D45] rounded-md text-slate-300 hover:bg-[#1A2540] hover:text-white transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            title="Refresh data"
          >
            <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={handleExportCSV}
            disabled={filteredData.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-[#62A0EA] text-white text-sm font-medium rounded-md hover:bg-[#4A8BD4] transition-colors shadow-lg shadow-[#62A0EA]/25 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            title={filteredData.length === 0 ? 'No data to export' : `Export ${filteredData.length} receipts to CSV`}
          >
            <Download size={16} />
            <span className="hidden sm:inline">Export CSV</span>
          </button>
        </div>
      </div>

      {/* ── Summary Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mb-6">
        <div className="bg-[#131C2E] border border-[#1E2D45] rounded-xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-slate-500/15 flex items-center justify-center shrink-0">
            <ReceiptText size={18} className="text-slate-300" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] text-slate-500 uppercase tracking-wider">Receipts Shown</p>
            <p className="text-xl font-bold text-white truncate">{filteredData.length}</p>
          </div>
        </div>
        <div className="bg-[#131C2E] border border-[#1E2D45] rounded-xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#62A0EA]/15 flex items-center justify-center shrink-0">
            <Wallet size={18} className="text-[#62A0EA]" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] text-slate-500 uppercase tracking-wider">Total Fares</p>
            <p className="text-xl font-bold text-[#62A0EA] truncate">₱{totalFare.toFixed(2)}</p>
          </div>
        </div>
        <div className="bg-[#131C2E] border border-[#1E2D45] rounded-xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-500/15 flex items-center justify-center shrink-0">
            <Coins size={18} className="text-emerald-400" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] text-slate-500 uppercase tracking-wider">Cash Payments</p>
            <p className="text-xl font-bold text-emerald-400 truncate">{cashCount}</p>
          </div>
        </div>
        <div className="bg-[#131C2E] border border-[#1E2D45] rounded-xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#62A0EA]/15 flex items-center justify-center shrink-0">
            <Smartphone size={18} className="text-[#62A0EA]" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] text-slate-500 uppercase tracking-wider">GCash Payments</p>
            <p className="text-xl font-bold text-[#62A0EA] truncate">{gcashCount}</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-6 mb-6">

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

        {/* Search & Date Filters + Refresh */}
        <div className="flex flex-col lg:flex-row gap-3 w-full">
          <SearchBar
            placeholder="Search by Passenger or Receipt ID..."
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
                className="block w-full lg:w-48 pl-10 pr-3 py-2 bg-[#0E1628] border border-[#1E2D45] rounded-md text-white text-sm focus:outline-none focus:ring-1 focus:ring-[#62A0EA] focus:border-[#62A0EA] scheme-dark"
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
                className="block w-full lg:w-48 pl-10 pr-3 py-2 bg-[#0E1628] border border-[#1E2D45] rounded-md text-white text-sm focus:outline-none focus:ring-1 focus:ring-[#62A0EA] focus:border-[#62A0EA] scheme-dark"
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

      {/* Table card */}
      <div className="bg-[#0B1220] border border-[#1E2D45] rounded-xl p-4 sm:p-5">
        <DataTable
          data={paginatedData}
          columns={columns}
          searchQuery=""
          emptyMessage="No receipts match your filters."
        />

      {/* Pagination Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-center mt-4 pt-4 border-t border-[#1E2D45] gap-4 text-xs text-slate-400">
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
    </div>
  );
}
