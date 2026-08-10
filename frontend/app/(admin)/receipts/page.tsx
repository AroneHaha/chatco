// app/(admin)/receipts/page.tsx
'use client';

import { useState, useMemo, useCallback } from 'react';
import { DataTable } from '@/components/admin/ui/data-table';
import { Badge } from '@/components/admin/ui/badge';
import { SearchBar } from '@/components/admin/ui/search-bar';
import { CalendarDays, Download, Wallet, Ticket, Banknote, ChevronLeft, ChevronRight, AlertCircle, AlertTriangle, RefreshCw, ReceiptText, Smartphone, Coins } from 'lucide-react';
import { useReceiptsData, type Receipt, type PaymentMethod } from '@/app/(admin)/receipts/data/receipts-data';
import { statusBadge, methodStyle } from '@/app/(admin)/receipts/data/receipt-status';
import { StickyPageHeader } from '@/components/admin/layout/sticky-page-header';
import { exportReport, type ReportFormat } from '@/lib/utils/export-report';
import { formatPeso } from '@/lib/utils/display';
import { useDebouncedValue } from '@/hooks/use-debounced-value';

const ROWS_PER_PAGE = 20;

/** Quick range presets, offered alongside the exact-date picker. */
type RangePreset = 'all' | 'today' | '7days' | 'month';

const RANGE_OPTIONS: { value: RangePreset; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: '7days', label: 'Last 7 Days' },
  { value: 'month', label: 'This Month' },
  { value: 'all', label: 'All Time' },
];

/** Local YYYY-MM-DD, matching how Receipt.date is built in receipts-data.ts. */
function toLocalISODate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function ReceiptsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  // The exact-date picker and the range presets are mutually exclusive —
  // choosing one clears the other, so the active date filter is never ambiguous.
  const [specificDate, setSpecificDate] = useState('');
  // Defaults to "Today" so the initial load — and the default fetch below —
  // scopes to today's receipts instead of pulling the entire table.
  const [rangePreset, setRangePreset] = useState<RangePreset>('today');
  const [paymentFilter, setPaymentFilter] = useState<PaymentMethod | 'All'>('All');
  const [currentPage, setCurrentPage] = useState(1);

  const paymentOptions: (PaymentMethod | 'All')[] = ['All', 'Cash', 'Gcash', 'Voucher'];

  const handlePickDate = (value: string) => {
    setSpecificDate(value);
    if (value) setRangePreset('all');
  };

  const handlePickRange = (value: RangePreset) => {
    // Clicking the already-active preset resets to the default view
    // ("Today") instead of requiring a separate "Clear Filters" action.
    if (!specificDate && rangePreset === value) {
      setRangePreset('today');
      return;
    }
    setRangePreset(value);
    setSpecificDate('');
  };

  // Inclusive lower bound for the active preset, as a YYYY-MM-DD string.
  // Comparing the strings directly avoids re-parsing dates (and any timezone
  // drift) for every row. Also sent to the backend so the fetch itself is
  // scoped — "All Time" is the only preset that still pulls everything.
  const rangeStart = useMemo(() => {
    if (rangePreset === 'all') return '';
    const now = new Date();
    if (rangePreset === 'today') return toLocalISODate(now);
    if (rangePreset === 'month') return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6); // 6 back + today = 7 days
    return toLocalISODate(sevenDaysAgo);
  }, [rangePreset]);

  const { records, isLoading, isRefreshing, error, refresh } = useReceiptsData(
    specificDate || undefined,
    specificDate ? undefined : rangeStart || undefined
  );

  // The SearchBar updates `searchQuery` immediately (for responsive typing),
  // but the filtering below keys off the debounced value so every keystroke
  // doesn't re-filter and re-render the table.
  const debouncedSearchQuery = useDebouncedValue(searchQuery, 400);

  // Reset to page 1 when filters change — uses the "adjust state during
  // render" pattern instead of useEffect to avoid cascading renders.
  const [prevFilterKey, setPrevFilterKey] = useState('');
  const filterKey = `${debouncedSearchQuery}|${specificDate}|${rangePreset}|${paymentFilter}`;
  if (filterKey !== prevFilterKey) {
    setPrevFilterKey(filterKey);
    setCurrentPage(1);
  }

  // Filtered data
  const filteredData = useMemo(() => {
    const query = debouncedSearchQuery.trim().toLowerCase();
    return records.filter((item: Receipt) => {
      const matchesPayment = paymentFilter === 'All' || item.paymentMethod === paymentFilter;
      const matchesSearch =
        !query ||
        item.commuterName.toLowerCase().includes(query) ||
        item.commuterRole.toLowerCase().includes(query) ||
        item.multiplePaymentReference?.toLowerCase().includes(query) ||
        item.id.toLowerCase().includes(query);
      // Exact date wins when set; otherwise fall back to the preset range.
      const matchesDate = specificDate
        ? item.date === specificDate
        : !rangeStart || item.date >= rangeStart;
      return matchesPayment && matchesSearch && matchesDate;
    });
  }, [records, debouncedSearchQuery, specificDate, rangeStart, paymentFilter]);

  // Pagination. currentPage is clamped rather than reset to 1 — if the row
  // count shrinks under you (a filter change, or the 10s background poll),
  // you land on the last valid page instead of being thrown to the front.
  const totalPages = Math.max(1, Math.ceil(filteredData.length / ROWS_PER_PAGE));
  const safeCurrentPage = Math.min(Math.max(currentPage, 1), totalPages);
  const goToPage = (page: number) => setCurrentPage(Math.min(Math.max(page, 1), totalPages));

  const paginatedData = useMemo(() => {
    const startIndex = (safeCurrentPage - 1) * ROWS_PER_PAGE;
    return filteredData.slice(startIndex, startIndex + ROWS_PER_PAGE);
  }, [filteredData, safeCurrentPage]);

  const handleReportExport = useCallback((format: ReportFormat) => {
    exportReport({
      title: 'CHATCO Fare Receipts',
      fileName: `chatco-receipts-${new Date().toISOString().split('T')[0]}`,
      format,
      headers: ['Transaction ID', 'Multiple Payment Ref', 'Commuter', 'Role', 'Paid By', 'Plate Number', 'Route', 'Gross Fare', 'Discount', 'Final Fare', 'Payment Method', 'Status', 'Reconciliation', 'Date', 'Time'],
      rows: filteredData.map((receipt) => [
        receipt.id,
        receipt.multiplePaymentReference ?? '',
        receipt.commuterName,
        receipt.commuterRole,
        receipt.paidBy ?? '',
        receipt.plateNumber,
        receipt.route,
        receipt.grossFare.toLocaleString('en-PH', { minimumFractionDigits: 2 }),
        receipt.discountAmount.toLocaleString('en-PH', { minimumFractionDigits: 2 }),
        receipt.fare.toLocaleString('en-PH', { minimumFractionDigits: 2 }),
        receipt.paymentMethod,
        receipt.status,
        receipt.reconciliationStatus === 'REFUND_REQUIRED' ? 'Refund required' : receipt.reconciliationStatus ?? '',
        receipt.date,
        receipt.time,
      ]),
    });
  }, [filteredData]);

  // Summary stats.
  // Only settled rows count. These previously summed/counted every filtered
  // row regardless of status, so a Failed or Expired receipt — badged red in
  // the very same table — still added its fare to "Total Fares" and its row to
  // the Cash/GCash tallies. The backend's own remittance totals filter on
  // status = PAID, so this now agrees with them.
  const settled = useMemo(
    () => filteredData.filter((item: Receipt) => item.status === 'Completed'),
    [filteredData]
  );
  const totalFare = settled.reduce((sum: number, item: Receipt) => sum + item.fare, 0);
  const cashCount = settled.filter((item: Receipt) => item.paymentMethod === 'Cash').length;
  const gcashCount = settled.filter((item: Receipt) => item.paymentMethod === 'Gcash').length;
  const reconciliationRequired = records.filter(
    (item: Receipt) => item.reconciliationStatus === 'REFUND_REQUIRED'
  );

  const columns = [
    {
      key: 'id',
      label: 'Receipt',
      headerClassName: 'w-[18%] px-2 sm:px-3',
      cellClassName: 'px-2 sm:px-3 min-w-0',
      render: (value: string, row: Receipt) => (
        <div className="min-w-0">
          <span className="block truncate font-mono text-xs text-slate-400" title={value}>{value}</span>
          {row.multiplePaymentReference && (
            <span className="block truncate font-mono text-[10px] text-blue-400">{row.multiplePaymentReference}</span>
          )}
        </div>
      ),
    },
    {
      key: 'commuterName',
      label: 'Commuter',
      headerClassName: 'w-[20%] px-2 sm:px-3',
      cellClassName: 'px-2 sm:px-3 min-w-0',
      render: (value: string, row: Receipt) => (
        <div className="min-w-0">
          <p className="truncate text-sm text-slate-200" title={value}>{value}</p>
          <p className="truncate text-[10px] text-slate-500">{row.commuterRole}</p>
          {row.paidBy && <p className="truncate text-[10px] text-blue-400" title={row.paidBy}>Paid by: {row.paidBy}</p>}
        </div>
      ),
    },
    {
      key: 'plateNumber',
      label: 'Vehicle / Route',
      headerClassName: 'w-[20%] px-2 sm:px-3',
      cellClassName: 'px-2 sm:px-3 min-w-0',
      render: (value: string, row: Receipt) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-slate-200" title={value}>{value}</p>
          <p className="truncate text-[10px] text-slate-500" title={row.route}>{row.route}</p>
        </div>
      ),
    },
    {
      key: 'fare',
      label: 'Fare / Payment',
      headerClassName: 'w-[16%] px-2 sm:px-3',
      cellClassName: 'px-2 sm:px-3',
      render: (value: number, row: Receipt) => (
        <div className="space-y-1">
          <p className="text-slate-200 font-semibold">{formatPeso(value)}</p>
          {row.discountAmount > 0 && <p className="text-[10px] text-emerald-400">-{formatPeso(row.discountAmount)} discount</p>}
          <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full ${methodStyle(row.paymentMethod)}`}>
            {row.paymentMethod === 'Gcash' && <Wallet size={10} />}
            {row.paymentMethod === 'Voucher' && <Ticket size={10} />}
            {row.paymentMethod === 'Cash' && <Banknote size={10} />}
            {row.paymentMethod}
          </span>
        </div>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      headerClassName: 'w-[13%] px-2 sm:px-3',
      cellClassName: 'px-2 sm:px-3',
      render: (value: string, row: Receipt) => {
        const { label, variant } = statusBadge(value);
        return (
          <div className="space-y-1">
            <Badge variant={variant}>{label}</Badge>
            {row.reconciliationStatus === 'REFUND_REQUIRED' && (
              <p className="text-[10px] font-semibold text-amber-300" title={row.reconciliationReason ?? undefined}>
                Refund required
              </p>
            )}
          </div>
        );
      },
    },
    {
      key: 'date',
      label: 'Recorded',
      headerClassName: 'w-[13%] px-2 sm:px-3',
      cellClassName: 'px-2 sm:px-3',
      render: (value: string, row: Receipt) => (
        <div>
          <p className="text-xs text-slate-300">{value}</p>
          <p className="text-[10px] text-slate-500">{row.time}</p>
        </div>
      ),
    },
  ];

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
    <div style={{ touchAction: 'manipulation' }} className="flex h-full min-h-0 flex-col">
      {/* ── Header. Title + export actions share one row (matches Live
             Monitoring's header). Data refreshes automatically via the 10s
             background poll, so there's no manual refresh control here —
             just a quiet indicator while a refresh is in flight. ── */}
      <StickyPageHeader className="flex flex-wrap items-center justify-between gap-3 mb-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-lg bg-[#62A0EA]/15 flex items-center justify-center shrink-0">
            <ReceiptText size={22} className="text-[#62A0EA]" />
          </div>
          <h1 className="text-2xl font-bold text-white leading-tight">Fare Receipts</h1>
        </div>
        <div className="flex items-center gap-2">
          {isRefreshing && (
            <span className="flex items-center gap-1.5 text-xs text-[#62A0EA]">
              <RefreshCw size={12} className="animate-spin" />
              Refreshing…
            </span>
          )}
          {(['pdf', 'excel', 'word'] as const).map((format) => (
            <button
              key={format}
              onClick={() => handleReportExport(format)}
              disabled={filteredData.length === 0}
              className="flex items-center gap-2 px-3 py-2 bg-[#62A0EA] text-white text-xs font-medium rounded-md hover:bg-[#4A8BD4] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title={`Export ${filteredData.length} receipts to ${format.toUpperCase()}`}
            >
              <Download size={14} />
              <span>{format === 'pdf' ? 'PDF' : format === 'excel' ? 'Excel' : 'Word'}</span>
            </button>
          ))}
        </div>
      </StickyPageHeader>

      {/* ── Summary Cards ── */}
      {reconciliationRequired.length > 0 && (
        <div className="mb-4 flex shrink-0 items-start gap-3 rounded-xl border border-amber-400/40 bg-amber-500/10 p-3 text-amber-100">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" />
          <div>
            <p className="text-sm font-semibold">
              {reconciliationRequired.length} late GCash {reconciliationRequired.length === 1 ? 'payment requires' : 'payments require'} refund review
            </p>
            <p className="mt-1 text-xs text-amber-100/75">
              PayMongo confirmed payment after local cancellation. These rides are blocked from rewards until reconciliation is resolved.
            </p>
          </div>
        </div>
      )}

      <div className="grid shrink-0 grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <div className="bg-[#131C2E] border border-[#1E2D45] rounded-xl p-3 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-slate-500/15 flex items-center justify-center shrink-0">
            <ReceiptText size={18} className="text-slate-300" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] text-slate-500 uppercase tracking-wider">Receipts Shown</p>
            <p className="text-xl font-bold text-white truncate">{filteredData.length}</p>
          </div>
        </div>
        <div className="bg-[#131C2E] border border-[#1E2D45] rounded-xl p-3 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#62A0EA]/15 flex items-center justify-center shrink-0">
            <Wallet size={18} className="text-[#62A0EA]" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] text-slate-500 uppercase tracking-wider">Settled Fares</p>
            <p className="text-xl font-bold text-[#62A0EA] truncate">{formatPeso(totalFare)}</p>
          </div>
        </div>
        <div className="bg-[#131C2E] border border-[#1E2D45] rounded-xl p-3 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-500/15 flex items-center justify-center shrink-0">
            <Coins size={18} className="text-emerald-400" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] text-slate-500 uppercase tracking-wider">Cash Settled</p>
            <p className="text-xl font-bold text-emerald-400 truncate">{cashCount}</p>
          </div>
        </div>
        <div className="bg-[#131C2E] border border-[#1E2D45] rounded-xl p-3 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#62A0EA]/15 flex items-center justify-center shrink-0">
            <Smartphone size={18} className="text-[#62A0EA]" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] text-slate-500 uppercase tracking-wider">GCash Settled</p>
            <p className="text-xl font-bold text-[#62A0EA] truncate">{gcashCount}</p>
          </div>
        </div>
      </div>

      {/* ── Filters ──
          Search, date picker, range presets and payment method share one card
          and one control height so everything lines up on a single baseline. */}
      <div className="bg-[#131C2E] border border-[#1E2D45] rounded-xl p-3 mb-4 flex shrink-0 flex-col gap-3">

        {/* Row 1 — search + payment (left), date picker + range presets (right) */}
        <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-3">
          <SearchBar
            placeholder="Search by Commuter, reference, or receipt ID..."
            value={searchQuery}
            onChange={setSearchQuery}
            className="w-full sm:w-72"
          />

          <select
            value={paymentFilter}
            onChange={(e) => setPaymentFilter(e.target.value as PaymentMethod | 'All')}
            aria-label="Filter by payment method"
            className="h-9.5 w-full sm:w-40 px-3 bg-[#0E1628] border border-[#1E2D45] rounded-lg text-white text-sm focus:outline-none focus:ring-1 focus:ring-[#62A0EA] focus:border-[#62A0EA] [color-scheme:dark]"
          >
            {paymentOptions.map((filter) => (
              <option key={filter} value={filter} className="bg-gray-800">
                {filter === 'All' ? 'All Payments' : filter}
              </option>
            ))}
          </select>

          <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-3 sm:ml-auto">
            <div className="relative w-full sm:w-48">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <CalendarDays className="h-4 w-4 text-slate-400" />
              </div>
              <input
                type="date"
                value={specificDate}
                onChange={(e) => handlePickDate(e.target.value)}
                aria-label="Show transactions on a specific date"
                className="block w-full h-9.5 pl-10 pr-3 bg-[#0E1628] border border-[#1E2D45] rounded-lg text-white text-sm focus:outline-none focus:ring-1 focus:ring-[#62A0EA] focus:border-[#62A0EA] scheme-dark"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              {RANGE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => handlePickRange(opt.value)}
                  className={`h-9.5 px-4 rounded-lg text-sm font-medium transition-colors ${
                    !specificDate && rangePreset === opt.value
                      ? 'bg-[#62A0EA] text-white shadow-lg shadow-[#62A0EA]/25'
                      : 'bg-[#0E1628] border border-[#1E2D45] text-slate-300 hover:bg-[#1A2540]'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Table card — fills whatever vertical space is left below the
          header/summary/filters, on every screen size, instead of a fixed
          height that either clips or leaves a gap. */}
      <div className="flex flex-1 min-h-0 flex-col bg-[#0B1220] border border-[#1E2D45] rounded-xl p-3 sm:p-4">
        <div className="flex-1 min-h-0">
          <DataTable
            data={paginatedData}
            columns={columns}
            searchQuery=""
            emptyMessage="No receipts match your filters."
            height="100%"
            stickyHeader
            allowHorizontalScroll={false}
            tableClassName="table-fixed"
          />
        </div>

      {/* Pagination Controls */}
      <div className="shrink-0 flex flex-col sm:flex-row justify-between items-center mt-3 pt-3 border-t border-[#1E2D45] gap-4 text-xs text-slate-400">
        <div>
          Showing {paginatedData.length > 0 ? (safeCurrentPage - 1) * ROWS_PER_PAGE + 1 : 0} to{' '}
          {(safeCurrentPage - 1) * ROWS_PER_PAGE + paginatedData.length} of{' '}
          <span className="text-slate-300 font-medium">{filteredData.length}</span> receipts
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => goToPage(safeCurrentPage - 1)}
            disabled={safeCurrentPage === 1}
            aria-label="Previous page"
            className="p-2 rounded-md bg-[#0E1628] border border-[#1E2D45] hover:bg-[#1A2540] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft size={16} />
          </button>

          <span className="px-4 py-2 bg-[#62A0EA]/20 text-[#62A0EA] rounded-md font-medium text-xs">
            Page {safeCurrentPage} of {totalPages}
          </span>

          <button
            onClick={() => goToPage(safeCurrentPage + 1)}
            disabled={safeCurrentPage === totalPages}
            aria-label="Next page"
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
