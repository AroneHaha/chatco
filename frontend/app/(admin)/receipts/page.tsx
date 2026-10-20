// app/(admin)/receipts/page.tsx
'use client';

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { ReceiptsLedger, type DayStats } from '@/components/admin/receipts/receipts-ledger';
import { SearchBar } from '@/components/admin/ui/search-bar';
import { AdminDatePicker } from '@/components/admin/ui/admin-date-picker';
import { Download, Wallet, ChevronLeft, ChevronRight, ChevronDown, AlertCircle, AlertTriangle, RefreshCw, ReceiptText, Smartphone, Coins, SlidersHorizontal } from 'lucide-react';
import { useReceiptsData, type Receipt, type PaymentMethod } from '@/app/(admin)/receipts/data/receipts-data';
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
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
        setIsExportOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
  const activeRangeLabel = specificDate
    ? `Date: ${specificDate}`
    : RANGE_OPTIONS.find((option) => option.value === rangePreset)?.label ?? 'Today';
  const activePaymentLabel = paymentFilter === 'All' ? 'All Payments' : paymentFilter;
  const mobileFilterSummary = [
    searchQuery.trim() ? 'Search on' : null,
    activePaymentLabel,
    activeRangeLabel,
  ].filter(Boolean).join(' | ');

  // Per-day count and settled total for the ledger's day headings, over the
  // whole filtered set (not just this page) and settled rows only, the same
  // rule as the summary line.
  const dayStats = useMemo(() => {
    const stats = new Map<string, DayStats>();
    for (const item of filteredData) {
      const day = stats.get(item.date) ?? { count: 0, settledTotal: 0 };
      day.count += 1;
      if (item.status === 'Completed') day.settledTotal += item.fare;
      stats.set(item.date, day);
    }
    return stats;
  }, [filteredData]);

  // ─── Initial Loading State (Skeleton) ───
  if (isLoading) {
    return (
      <div className="space-y-6" role="status" aria-label="Loading receipts">
        {/* Skeleton Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-[#0E1628] admin-light:bg-white border border-[#1E2D45] admin-light:border-[#E2E8F0] rounded-lg p-4 h-24" />
          ))}
        </div>
        {/* Skeleton Header */}
        <div className="flex items-center justify-between">
          <div className="h-8 w-32 rounded bg-[#131C2E] admin-light:bg-white" />
          <div className="h-10 w-28 rounded bg-[#131C2E] admin-light:bg-white" />
        </div>
        {/* Skeleton Filters */}
        <div className="flex gap-3">
          <div className="h-10 w-64 rounded bg-[#131C2E] admin-light:bg-white" />
          <div className="h-10 w-48 rounded bg-[#131C2E] admin-light:bg-white" />
          <div className="h-10 w-48 rounded bg-[#131C2E] admin-light:bg-white" />
        </div>
        {/* Skeleton Table */}
        <div className="bg-[#131C2E] admin-light:bg-white border border-[#1E2D45] admin-light:border-[#E2E8F0] rounded-lg p-5 space-y-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-10 w-full rounded bg-[#0E1628] admin-light:bg-[#F1F5F9]" />
          ))}
        </div>
      </div>
    );
  }

  // ─── Error State (Only on initial load failure) ───
  if (error && records.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <AlertCircle className="h-12 w-12 text-red-400 admin-light:text-red-600 mb-4" />
        <h2 className="text-lg font-semibold text-white admin-light:text-slate-900 mb-2">Failed to load receipts</h2>
        <p className="text-sm text-slate-400 admin-light:text-slate-500 mb-4">{error}</p>
        <button
          onClick={() => refresh(false)}
          className="px-4 py-2 bg-[#62A0EA] admin-light:bg-[#1A5FB4] hover:bg-[#4A8BD4] admin-light:hover:bg-[#164A8F] text-white rounded-md text-sm font-medium transition-colors"
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
        <h1 className="text-2xl font-bold text-white admin-light:text-slate-900 leading-tight">Fare Receipts</h1>
        <div className="flex items-center gap-2">
          {isRefreshing && (
            <span className="flex items-center gap-1.5 text-xs text-[#62A0EA] admin-light:text-[#1A5FB4]">
              <RefreshCw size={12} className="animate-spin" />
              Refreshing…
            </span>
          )}
          {/* Single "Export" button opening a dropdown of formats, instead
              of three separate PDF/Excel/Word buttons competing for space
              in the header. */}
          <div className="relative" ref={exportMenuRef}>
            <button
              onClick={() => setIsExportOpen((open) => !open)}
              disabled={filteredData.length === 0}
              className="flex items-center gap-2 px-3 py-2 bg-[#62A0EA] admin-light:bg-[#1A5FB4] text-white text-xs font-medium rounded-md hover:bg-[#4A8BD4] admin-light:hover:bg-[#164A8F] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title={`Export ${filteredData.length} receipts`}
              aria-haspopup="menu"
              aria-expanded={isExportOpen}
            >
              <Download size={14} />
              <span>Export</span>
              <ChevronDown size={14} className={`transition-transform duration-200 ${isExportOpen ? 'rotate-180' : ''}`} />
            </button>

            {isExportOpen && (
              <div
                role="menu"
                className="absolute right-0 top-full mt-2 w-36 bg-[#131C2E] admin-light:bg-white border border-[#1E2D45] admin-light:border-[#E2E8F0] rounded-md shadow-2xl shadow-black/50 overflow-hidden z-20"
              >
                {(['pdf', 'excel', 'word'] as const).map((format) => (
                  <button
                    key={format}
                    role="menuitem"
                    onClick={() => {
                      handleReportExport(format);
                      setIsExportOpen(false);
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-slate-300 admin-light:text-slate-700 hover:bg-[#1A2540] admin-light:hover:bg-[#EEF2F7] hover:text-white admin-light:hover:text-slate-900 transition-colors"
                    title={`Export ${filteredData.length} receipts to ${format.toUpperCase()}`}
                  >
                    <Download size={13} className="text-slate-500" />
                    <span>{format === 'pdf' ? 'PDF' : format === 'excel' ? 'Excel' : 'Word'}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </StickyPageHeader>

      {/* ── Summary Cards ── */}
      {reconciliationRequired.length > 0 && (
        <div className="mb-4 flex shrink-0 items-start gap-3 rounded-lg border border-amber-700 bg-[#2A2111] p-3 text-amber-100 admin-light:border-amber-300 admin-light:bg-amber-50 admin-light:text-amber-900">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-300 admin-light:text-amber-700" />
          <div>
            <p className="text-sm font-semibold">
              {reconciliationRequired.length} late GCash {reconciliationRequired.length === 1 ? 'payment requires' : 'payments require'} refund review
            </p>
            <p className="mt-1 text-xs text-amber-200 admin-light:text-amber-800">
              PayMongo confirmed payment after local cancellation. These rides are blocked from rewards until reconciliation is resolved.
            </p>
          </div>
        </div>
      )}

      <div className="grid shrink-0 grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <div className="bg-[#0E1628] admin-light:bg-white border border-[#1E2D45] admin-light:border-[#E2E8F0] rounded-xl p-3 flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center text-[#62A0EA] admin-light:text-[#1A5FB4]">
            <ReceiptText size={36} />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] text-slate-500 uppercase tracking-wider">Receipts Shown</p>
            <p className="text-xl font-bold text-slate-100 admin-light:text-slate-900 truncate">{filteredData.length}</p>
          </div>
        </div>
        <div className="bg-[#0E1628] admin-light:bg-white border border-[#1E2D45] admin-light:border-[#E2E8F0] rounded-xl p-3 flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center text-[#62A0EA] admin-light:text-[#1A5FB4]">
            <Wallet size={36} />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] text-slate-500 uppercase tracking-wider">Settled Fares</p>
            <p className="text-xl font-bold text-slate-100 admin-light:text-slate-900 truncate">{formatPeso(totalFare)}</p>
          </div>
        </div>
        <div className="bg-[#0E1628] admin-light:bg-white border border-[#1E2D45] admin-light:border-[#E2E8F0] rounded-xl p-3 flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center text-[#62A0EA] admin-light:text-[#1A5FB4]">
            <Coins size={36} />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] text-slate-500 uppercase tracking-wider">Cash Settled</p>
            <p className="text-xl font-bold text-slate-100 admin-light:text-slate-900 truncate">{cashCount}</p>
          </div>
        </div>
        <div className="bg-[#0E1628] admin-light:bg-white border border-[#1E2D45] admin-light:border-[#E2E8F0] rounded-xl p-3 flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center text-[#62A0EA] admin-light:text-[#1A5FB4]">
            <Smartphone size={36} />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] text-slate-500 uppercase tracking-wider">GCash Settled</p>
            <p className="text-xl font-bold text-slate-100 admin-light:text-slate-900 truncate">{gcashCount}</p>
          </div>
        </div>
      </div>

      {/* ── Filters ──
          Search, date picker, range presets and payment method share one
          control height so everything lines up on a single baseline — no
          card wrapper here (matches Remittance's bare filter row) since
          this is a toolbar, not a data panel. */}
      <div className="mb-3 sm:mb-4 flex shrink-0 flex-col gap-3">
        <button
          type="button"
          onClick={() => setShowMobileFilters((value) => !value)}
          className="flex w-full items-center justify-between gap-3 rounded-lg border border-[#1E2D45] admin-light:border-[#E2E8F0] bg-[#0E1628] admin-light:bg-white px-3 py-2 text-left transition-colors active:scale-[0.99] xl:hidden"
          aria-expanded={showMobileFilters}
        >
          <span className="flex min-w-0 items-center gap-2">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#62A0EA]/15 admin-light:bg-[#1A5FB4]/10">
              <SlidersHorizontal size={15} className="text-[#62A0EA] admin-light:text-[#1A5FB4]" />
            </span>
            <span className="min-w-0">
              <span className="block text-xs font-semibold text-slate-200 admin-light:text-slate-700">Search & Filters</span>
              <span className="block truncate text-[10px] text-slate-500">{mobileFilterSummary}</span>
            </span>
          </span>
          <ChevronDown
            size={16}
            className={`shrink-0 text-slate-500 transition-transform duration-200 ${showMobileFilters ? 'rotate-180' : ''}`}
          />
        </button>

        {/* Row 1 — search + payment (left), date picker + range presets (right).
            Every element here shares one xl: breakpoint end-to-end (search,
            payment, the mobile-only range select, the date input, and the
            desktop range buttons all switch together at xl:). Below xl, the
            row stays fully stacked behind the collapse toggle above; there is
            no in-between state where content-driven flex-wrap could shove
            the date filter onto its own orphaned row — that's what happened
            here (and previously in Remittance) when the row broke into flex
            row layout before the sidebar-narrowed content column actually had
            room for the full search + payment + date + range-buttons set
            (that room only exists from xl: up — lg: still wraps the range
            buttons onto their own line). */}
        <div className={`${showMobileFilters ? 'flex' : 'hidden'} flex-col gap-3 xl:flex xl:flex-row xl:items-center`}>
          <SearchBar
            placeholder="Search by Commuter, reference, or receipt ID..."
            value={searchQuery}
            onChange={setSearchQuery}
            className="w-full xl:w-72"
          />

          <select
            value={paymentFilter}
            onChange={(e) => setPaymentFilter(e.target.value as PaymentMethod | 'All')}
            aria-label="Filter by payment method"
            className="h-9.5 w-full xl:w-40 px-3 bg-[#0E1628] admin-light:bg-white border border-[#1E2D45] admin-light:border-[#E2E8F0] rounded-lg text-white admin-light:text-slate-900 text-sm focus:outline-none focus:ring-1 focus:ring-[#62A0EA] admin-light:focus:ring-[#1A5FB4] focus:border-[#62A0EA] admin-light:focus:border-[#1A5FB4] [color-scheme:dark]"
          >
            {paymentOptions.map((filter) => (
              <option key={filter} value={filter} className="bg-gray-800 admin-light:bg-white">
                {filter === 'All' ? 'All Payments' : filter}
              </option>
            ))}
          </select>

          <div className="flex flex-col xl:flex-row xl:items-center gap-3 xl:ml-auto">
            <select
              value={specificDate ? 'date' : rangePreset}
              onChange={(e) => {
                const value = e.target.value as RangePreset | 'date';
                if (value === 'date') return;
                handlePickRange(value);
              }}
              aria-label="Filter by date range"
              className="h-9.5 w-full px-3 bg-[#0E1628] admin-light:bg-white border border-[#1E2D45] admin-light:border-[#E2E8F0] rounded-lg text-white admin-light:text-slate-900 text-sm focus:outline-none focus:ring-1 focus:ring-[#62A0EA] admin-light:focus:ring-[#1A5FB4] focus:border-[#62A0EA] admin-light:focus:border-[#1A5FB4] [color-scheme:dark] xl:hidden"
            >
              {specificDate && <option value="date" className="bg-gray-800 admin-light:bg-white">Selected Date</option>}
              {RANGE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value} className="bg-gray-800 admin-light:bg-white">
                  {option.label}
                </option>
              ))}
            </select>

            {/* Same picker as sign-up: jump by year and month instead of
                paging; no future days, since receipts can't be dated ahead. */}
            <AdminDatePicker
              value={specificDate}
              onChange={handlePickDate}
              ariaLabel="Show transactions on a specific date"
              clearLabel="Clear date"
              yearNavigation
              align="right"
              max={toLocalISODate(new Date())}
              className="w-full xl:w-48"
              triggerClassName="h-9.5 w-full text-sm"
            />

            <div className="hidden flex-wrap gap-2 xl:flex">
              {RANGE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => handlePickRange(opt.value)}
                  className={`h-9.5 px-4 rounded-lg text-sm font-medium transition-colors ${
                    !specificDate && rangePreset === opt.value
                      ? 'bg-[#62A0EA] admin-light:bg-[#1A5FB4] text-white'
                      : 'bg-[#0E1628] admin-light:bg-white border border-[#1E2D45] admin-light:border-[#E2E8F0] text-slate-300 admin-light:text-slate-700 hover:bg-[#1A2540] admin-light:hover:bg-[#EEF2F7]'
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
      <div className="flex flex-1 min-h-0 flex-col overflow-hidden rounded-lg border border-[#1E2D45] bg-[#0B1220] admin-light:border-[#E2E8F0] admin-light:bg-white">
        <div className="flex-1 min-h-0">
          <ReceiptsLedger rows={paginatedData} dayStats={dayStats} emptyMessage="No receipts match your filters." />
        </div>

      {/* Pagination Controls */}
      <div className="shrink-0 flex flex-col sm:flex-row justify-between items-center px-3 py-3 border-t border-[#1E2D45] admin-light:border-[#E2E8F0] gap-4 text-xs text-slate-400 admin-light:text-slate-500">
        <div>
          Showing {paginatedData.length > 0 ? (safeCurrentPage - 1) * ROWS_PER_PAGE + 1 : 0} to{' '}
          {(safeCurrentPage - 1) * ROWS_PER_PAGE + paginatedData.length} of{' '}
          <span className="text-slate-300 admin-light:text-slate-700 font-medium">{filteredData.length}</span> receipts
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => goToPage(safeCurrentPage - 1)}
            disabled={safeCurrentPage === 1}
            aria-label="Previous page"
            className="p-2 rounded-md bg-[#0E1628] admin-light:bg-[#F1F5F9] border border-[#1E2D45] admin-light:border-[#E2E8F0] hover:bg-[#1A2540] admin-light:hover:bg-[#EEF2F7] disabled:cursor-not-allowed disabled:text-slate-600 admin-light:disabled:text-slate-300 transition-colors"
          >
            <ChevronLeft size={16} />
          </button>

          <span className="px-3 font-medium text-xs text-slate-300 admin-light:text-slate-700">
            Page {safeCurrentPage} of {totalPages}
          </span>

          <button
            onClick={() => goToPage(safeCurrentPage + 1)}
            disabled={safeCurrentPage === totalPages}
            aria-label="Next page"
            className="p-2 rounded-md bg-[#0E1628] admin-light:bg-[#F1F5F9] border border-[#1E2D45] admin-light:border-[#E2E8F0] hover:bg-[#1A2540] admin-light:hover:bg-[#EEF2F7] disabled:cursor-not-allowed disabled:text-slate-600 admin-light:disabled:text-slate-300 transition-colors"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
      </div>
    </div>
  );
}
