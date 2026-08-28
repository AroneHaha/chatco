// app/(admin)/activity-logs/page.tsx
'use client';

import { useState } from 'react';
import { History, Search, CalendarDays, X, ChevronUp } from 'lucide-react';
import { StickyPageHeader } from '@/components/admin/layout/sticky-page-header';
import { TablePagination } from '@/components/admin/ui/table-pagination';

type DateRange = 'today' | 'last_7_days' | 'last_30_days' | 'all';

const DATE_RANGE_OPTIONS: { value: DateRange; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: 'last_7_days', label: 'Last 7 Days' },
  { value: 'last_30_days', label: 'Last 30 Days' },
  { value: 'all', label: 'All Time' },
];

/**
 * Category values match the ActivityLog backend taxonomy (not wired up
 * yet — see the plan at .claude/plans for the full data-model design).
 */
const CATEGORY_OPTIONS: { value: string; label: string }[] = [
  { value: 'MEMBER', label: 'Member' },
  { value: 'PERSONNEL', label: 'Personnel' },
  { value: 'VEHICLE', label: 'Vehicle' },
  { value: 'ROUTE', label: 'Route' },
  { value: 'FARE_POINT', label: 'Fare Point' },
  { value: 'SETTINGS', label: 'Settings' },
  { value: 'VOUCHER', label: 'Voucher' },
  { value: 'REMITTANCE_OPTION', label: 'Remittance Option' },
  { value: 'FAQ', label: 'FAQ' },
  { value: 'ANNOUNCEMENT', label: 'Announcement' },
  { value: 'LOST_FOUND', label: 'Lost & Found' },
  { value: 'SOS', label: 'SOS' },
  { value: 'SHIFT_DEVICE', label: 'Shift Device' },
];

/**
 * UI-only pass — the ActivityLog backend (table, service, per-controller
 * instrumentation) doesn't exist yet, so this page has no data source: the
 * table always renders its empty state. Filters are fully interactive
 * (local state only) so the layout/interaction can be reviewed before the
 * backend is built. Structure mirrors the Announcements admin page
 * (search + exact date + date-range dropdown + category filter + a
 * server-paginated table), simplified since this is read-only (no
 * create/edit/archive actions).
 */
export default function ActivityLogsPage() {
  const [searchInput, setSearchInput] = useState('');
  // Mutually exclusive: picking an exact date clears the range preset back
  // to "no preset active", and vice versa — same relationship as the date
  // filters on Announcements/Lost & Found.
  const [selectedDate, setSelectedDate] = useState('');
  const [dateRange, setDateRange] = useState<DateRange>('today');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [page, setPage] = useState(1);

  // Mobile-only collapse: the filter row hides behind a toggle so just the
  // title stays visible on small screens — same pattern as Announcements/
  // Remittance/Users.
  const [isMobileFiltersExpanded, setIsMobileFiltersExpanded] = useState(true);

  const handleDateRangeChange = (range: DateRange) => {
    setDateRange(range);
    setSelectedDate('');
    setPage(1);
  };

  const handleSelectedDateChange = (date: string) => {
    setSelectedDate(date);
    if (date) setDateRange('all');
    setPage(1);
  };

  const hasActiveFilters =
    searchInput.trim() !== '' || selectedDate !== '' || dateRange !== 'today' || categoryFilter !== 'ALL';

  return (
    <div className="flex h-full min-h-0 flex-col">
      <StickyPageHeader className="mb-4 shrink-0">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-white">
          <History size={22} className="text-[#62A0EA]" />
          Activity Logs
        </h1>
        <p className="mt-1 text-xs text-slate-500">
          A searchable audit trail of admin actions across the panel.
        </p>
      </StickyPageHeader>

      {/* Filters */}
      <div className="mb-4 shrink-0">
        <div
          className="overflow-hidden transition-all duration-300 ease-in-out md:max-h-none!"
          style={{ maxHeight: isMobileFiltersExpanded ? '400px' : '0px' }}
        >
          <div className="flex flex-col gap-3 pb-1 sm:flex-row sm:flex-wrap sm:items-center">
            {/* Search */}
            <div className="relative w-full sm:w-72">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder="Search activity or admin name…"
                value={searchInput}
                onChange={(e) => { setSearchInput(e.target.value); setPage(1); }}
                className="h-11 w-full rounded-md border border-[#1E2D45] bg-[#0E1628] pl-10 pr-4 text-sm text-white placeholder:text-slate-500 transition-colors focus:outline-none focus:ring-1 focus:ring-[#62A0EA]"
              />
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:ml-auto">
              {/* Exact date picker — mutually exclusive with the range preset below. */}
              <div className="relative w-full sm:w-auto">
                <CalendarDays className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => handleSelectedDateChange(e.target.value)}
                  aria-label="Filter activity by an exact date"
                  className="h-11 w-full rounded-md border border-[#1E2D45] bg-[#0E1628] pl-10 pr-8 text-sm text-slate-200 outline-none transition-colors scheme-dark focus:border-[#62A0EA]/50 focus:ring-1 focus:ring-[#62A0EA]/30 sm:w-auto"
                />
                {selectedDate && (
                  <button
                    type="button"
                    onClick={() => handleSelectedDateChange('')}
                    aria-label="Clear date"
                    title="Clear date"
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-500 transition-colors hover:bg-white/5 hover:text-slate-200"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              {/* Quick date range */}
              <select
                value={dateRange}
                onChange={(e) => handleDateRangeChange(e.target.value as DateRange)}
                aria-label="Filter activity by a quick date range"
                className="h-11 w-full rounded-md border border-[#1E2D45] bg-[#0E1628] px-3 text-sm text-slate-200 outline-none transition-colors scheme-dark focus:border-[#62A0EA]/50 focus:ring-1 focus:ring-[#62A0EA]/30 sm:w-auto"
              >
                {DATE_RANGE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value} className="bg-[#0E1628]">
                    {option.label}
                  </option>
                ))}
              </select>

              {/* Category filter */}
              <select
                value={categoryFilter}
                onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }}
                aria-label="Filter activity by category"
                className="h-11 w-full rounded-md border border-[#1E2D45] bg-[#0E1628] px-3 text-sm text-slate-200 outline-none transition-colors scheme-dark focus:border-[#62A0EA]/50 focus:ring-1 focus:ring-[#62A0EA]/30 sm:w-auto"
              >
                <option value="ALL" className="bg-[#0E1628]">All Categories</option>
                {CATEGORY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value} className="bg-[#0E1628]">
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsMobileFiltersExpanded((prev) => !prev)}
          aria-expanded={isMobileFiltersExpanded}
          aria-label={isMobileFiltersExpanded ? 'Collapse filters' : 'Expand filters'}
          className="mt-2 flex w-full shrink-0 items-center justify-center border-t border-white/5 py-1.5 text-slate-500 transition-colors hover:bg-white/5 hover:text-slate-300 active:bg-white/10 md:hidden"
        >
          <ChevronUp className={`h-4 w-4 transition-transform duration-300 ${isMobileFiltersExpanded ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* Table — bounded height; only the rows scroll internally so the
          header row and pagination bar stay put. No data source yet, so
          this always shows the empty state. */}
      <div className="flex flex-1 min-h-0 flex-col rounded-lg border border-[#1E2D45] bg-[#131C2E] p-3 sm:p-4">
        <div className="hidden flex-1 min-h-0 flex-col overflow-hidden rounded-lg border border-[#1E2D45] md:flex">
          <div className="flex-1 min-h-0 overflow-y-auto">
            <table className="w-full table-fixed">
              <thead className="sticky top-0 z-10">
                <tr>
                  <th className="w-[16%] bg-[#0E1628] px-3 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-500 shadow-[inset_0_-1px_0_#1E2D45]">Timestamp</th>
                  <th className="w-[18%] bg-[#0E1628] px-3 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-500 shadow-[inset_0_-1px_0_#1E2D45]">Admin</th>
                  <th className="w-[16%] bg-[#0E1628] px-3 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-500 shadow-[inset_0_-1px_0_#1E2D45]">Category</th>
                  <th className="w-[50%] bg-[#0E1628] px-3 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-500 shadow-[inset_0_-1px_0_#1E2D45]">Activity</th>
                </tr>
              </thead>
            </table>
            <div className="flex flex-col items-center justify-center px-4 py-16 text-center">
              <History size={40} className="mb-3 text-slate-600" />
              <h3 className="mb-1 font-semibold text-slate-300">No activity logged yet</h3>
              <p className="text-sm text-slate-500">
                {hasActiveFilters ? 'Try adjusting your search or filters.' : 'Admin actions will appear here once logging is connected.'}
              </p>
            </div>
          </div>
        </div>

        {/* Mobile empty state */}
        <div className="flex flex-1 min-h-0 flex-col items-center justify-center px-4 py-16 text-center md:hidden">
          <History size={40} className="mb-3 text-slate-600" />
          <h3 className="mb-1 font-semibold text-slate-300">No activity logged yet</h3>
          <p className="text-sm text-slate-500">
            {hasActiveFilters ? 'Try adjusting your search or filters.' : 'Admin actions will appear here once logging is connected.'}
          </p>
        </div>

        <div className="mt-3 shrink-0">
          <TablePagination
            currentPage={page}
            totalPages={1}
            from={0}
            to={0}
            total={0}
            label="entries"
            onPageChange={setPage}
          />
        </div>
      </div>
    </div>
  );
}
