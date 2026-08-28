// app/(admin)/activity-logs/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { History, Search, CalendarDays, X, ChevronUp, AlertTriangle } from 'lucide-react';
import { RequestCancelledError } from '@/lib/api/client';
import { listForAdmin, type ActivityLog } from '@/lib/shared/services/activity-log.service';
import { StickyPageHeader } from '@/components/admin/layout/sticky-page-header';
import { TablePagination } from '@/components/admin/ui/table-pagination';

const PER_PAGE = 30;
/** Debounce window before a keystroke fires a server search request. */
const SEARCH_DEBOUNCE_MS = 300;

type DateRange = 'today' | 'last_7_days' | 'last_30_days' | 'all';

const DATE_RANGE_OPTIONS: { value: DateRange; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: 'last_7_days', label: 'Last 7 Days' },
  { value: 'last_30_days', label: 'Last 30 Days' },
  { value: 'all', label: 'All Time' },
];

/** Category values match the ActivityLog backend taxonomy (App\Enums\ActivityLogCategory). */
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

const CATEGORY_LABELS: Record<string, string> = Object.fromEntries(
  CATEGORY_OPTIONS.map((option) => [option.value, option.label])
);

function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function CategoryBadge({ category }: { category: string }) {
  return (
    <span className="inline-block rounded bg-[#62A0EA]/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#62A0EA] border border-[#62A0EA]/20">
      {CATEGORY_LABELS[category] ?? category}
    </span>
  );
}

/**
 * Server-paginated (30/page), server-filtered audit trail of admin actions.
 * Search/category/date filters are resolved server-side (ActivityLogService::
 * listForAdmin) so they stay correct across the whole dataset, not just
 * whatever page happens to be loaded. Read-only — no create/edit/archive
 * actions, rows are written by the admin endpoints that produced them.
 */
export default function ActivityLogsPage() {
  const [items, setItems] = useState<ActivityLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  // Mutually exclusive: picking an exact date clears the range preset back
  // to "no preset active", and vice versa — same relationship as the date
  // filters on Announcements/Lost & Found.
  const [selectedDate, setSelectedDate] = useState('');
  const [dateRange, setDateRange] = useState<DateRange>('today');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [page, setPage] = useState(1);
  const [pageMeta, setPageMeta] = useState({ page: 1, lastPage: 1, total: 0 });

  // Mobile-only collapse: the filter row hides behind a toggle so just the
  // title stays visible on small screens — same pattern as Announcements/
  // Remittance/Users.
  const [isMobileFiltersExpanded, setIsMobileFiltersExpanded] = useState(true);

  // ─── Debounce the search box → a server-side query, resetting to page 1 ──
  useEffect(() => {
    const id = window.setTimeout(() => {
      setSearchQuery(searchInput.trim());
      setPage(1);
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(id);
  }, [searchInput]);

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

  const handleCategoryFilterChange = (value: string) => {
    setCategoryFilter(value);
    setPage(1);
  };

  const hasActiveFilters =
    searchQuery !== '' || selectedDate !== '' || dateRange !== 'today' || categoryFilter !== 'ALL';

  // ─── Fetch the current page from the server (filters + page) ────────────
  // An in-flight request is aborted as soon as a newer one supersedes it
  // (fast typing, quick page flips), so the UI never renders stale results.
  const load = useCallback(async (signal?: AbortSignal) => {
    setIsLoading(true);
    setListError(null);
    try {
      const result = await listForAdmin({
        category: categoryFilter === 'ALL' ? undefined : categoryFilter,
        search: searchQuery || undefined,
        date: selectedDate || undefined,
        dateRange,
        page,
        perPage: PER_PAGE,
        signal,
      });
      setItems(result.items);
      setPageMeta({ page: result.page, lastPage: result.lastPage, total: result.total });
      // The active page can end up past the new last page (e.g. a filter
      // change shrinks the result set) — snap back instead of showing empty.
      if (page > result.lastPage && result.lastPage >= 1) {
        setPage(result.lastPage);
      }
    } catch (err) {
      if (err instanceof RequestCancelledError) return;
      setListError(err instanceof Error ? err.message : 'Unable to load activity logs.');
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  }, [categoryFilter, searchQuery, selectedDate, dateRange, page]);

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const refresh = useCallback(() => load(), [load]);

  const from = pageMeta.total === 0 ? 0 : (pageMeta.page - 1) * PER_PAGE + 1;
  const to = Math.min(pageMeta.page * PER_PAGE, pageMeta.total);

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Only the title pins on phones — the subtitle stays in the scroll
          flow so the sticky bar stays one line tall instead of eating a
          third of a small screen (same reasoning as the admin dashboard
          header). */}
      <StickyPageHeader className="shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[#62A0EA]/15">
            <History size={22} className="text-[#62A0EA]" />
          </div>
          <h1 className="text-2xl font-bold leading-tight text-white">Activity Logs</h1>
        </div>
      </StickyPageHeader>
      <p className="mb-4 mt-1 shrink-0 text-xs text-slate-500">
        A searchable audit trail of admin actions across the panel.
      </p>

      {/* Filters */}
      <div className="mb-4 shrink-0">
        <div
          className="-m-1 overflow-hidden transition-all duration-300 ease-in-out md:max-h-none!"
          style={{ maxHeight: isMobileFiltersExpanded ? '416px' : '0px' }}
        >
          <div className="flex flex-col gap-3 p-1 sm:flex-row sm:flex-wrap sm:items-center">
            {/* Search */}
            <div className="relative w-full sm:w-72">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder="Search activity or admin name…"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
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
                onChange={(e) => handleCategoryFilterChange(e.target.value)}
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
          header row and pagination bar stay put. */}
      <div className="flex flex-1 min-h-0 flex-col rounded-xl border border-[#1E2D45] bg-[#131C2E] p-3 sm:p-4">
        <div className="hidden flex-1 min-h-0 flex-col overflow-hidden rounded-lg border border-[#1E2D45] md:flex">
          <div className="flex-1 min-h-0 overflow-y-auto">
            <table className="w-full table-fixed">
              <thead className="sticky top-0 z-10">
                <tr>
                  <th className="w-[16%] bg-[#0E1628] px-3 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-500 shadow-[inset_0_-1px_0_#1E2D45]">Timestamp</th>
                  <th className="w-[16%] bg-[#0E1628] px-3 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-500 shadow-[inset_0_-1px_0_#1E2D45]">Category</th>
                  <th className="w-[50%] bg-[#0E1628] px-3 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-500 shadow-[inset_0_-1px_0_#1E2D45]">Activity</th>
                  <th className="w-[18%] bg-[#0E1628] px-3 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-500 shadow-[inset_0_-1px_0_#1E2D45]">By</th>
                </tr>
              </thead>
              {!isLoading && !listError && items.length > 0 && (
                <tbody className="divide-y divide-[#1E2D45]">
                  {items.map((item) => (
                    <tr key={item.id} className="hover:bg-[#1A2540] transition-colors">
                      <td className="px-3 py-3 text-xs text-slate-400">{formatTimestamp(item.createdAt)}</td>
                      <td className="px-3 py-3"><CategoryBadge category={item.category} /></td>
                      <td className="px-3 py-3 text-sm text-slate-200 truncate" title={item.description}>{item.description}</td>
                      <td className="px-3 py-3 text-xs text-slate-400 truncate" title={item.by}>{item.by}</td>
                    </tr>
                  ))}
                </tbody>
              )}
            </table>

            {isLoading && (
              <div className="flex flex-col items-center justify-center px-4 py-16 text-center">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#1E2D45] border-t-[#62A0EA]" />
                <p className="mt-4 text-sm text-slate-500">Loading activity…</p>
              </div>
            )}

            {!isLoading && listError && (
              <div className="flex flex-col items-center justify-center px-4 py-16 text-center">
                <AlertTriangle size={32} className="mb-3 text-red-400/60" />
                <p className="mb-3 text-sm font-medium text-red-400">{listError}</p>
                <button
                  onClick={() => void refresh()}
                  className="rounded-md bg-[#62A0EA] px-4 py-2 text-xs font-semibold text-white"
                >
                  Try again
                </button>
              </div>
            )}

            {!isLoading && !listError && items.length === 0 && (
              <div className="flex flex-col items-center justify-center px-4 py-16 text-center">
                <History size={40} className="mb-3 text-slate-600" />
                <h3 className="mb-1 font-semibold text-slate-300">No activity logged yet</h3>
                <p className="text-sm text-slate-500">
                  {hasActiveFilters ? 'Try adjusting your search or filters.' : 'Admin actions will appear here once logging is connected.'}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Mobile */}
        <div className="flex flex-1 min-h-0 flex-col md:hidden">
          {isLoading ? (
            <div className="flex flex-1 min-h-0 flex-col items-center justify-center px-4 py-16 text-center">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#1E2D45] border-t-[#62A0EA]" />
              <p className="mt-4 text-sm text-slate-500">Loading activity…</p>
            </div>
          ) : listError ? (
            <div className="flex flex-1 min-h-0 flex-col items-center justify-center px-4 py-16 text-center">
              <AlertTriangle size={32} className="mb-3 text-red-400/60" />
              <p className="mb-3 text-sm font-medium text-red-400">{listError}</p>
              <button
                onClick={() => void refresh()}
                className="rounded-md bg-[#62A0EA] px-4 py-2 text-xs font-semibold text-white"
              >
                Try again
              </button>
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-1 min-h-0 flex-col items-center justify-center px-4 py-16 text-center">
              <History size={40} className="mb-3 text-slate-600" />
              <h3 className="mb-1 font-semibold text-slate-300">No activity logged yet</h3>
              <p className="text-sm text-slate-500">
                {hasActiveFilters ? 'Try adjusting your search or filters.' : 'Admin actions will appear here once logging is connected.'}
              </p>
            </div>
          ) : (
            <div className="flex-1 min-h-0 space-y-2 overflow-y-auto">
              {items.map((item) => (
                <div key={item.id} className="rounded-lg border border-[#1E2D45] bg-[#0E1628] p-3">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <CategoryBadge category={item.category} />
                    <span className="shrink-0 text-[10px] text-slate-500">{formatTimestamp(item.createdAt)}</span>
                  </div>
                  <p className="text-sm text-slate-200">{item.description}</p>
                  <p className="mt-1.5 text-xs text-slate-500">{item.by}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-3 shrink-0">
          <TablePagination
            currentPage={pageMeta.page}
            totalPages={pageMeta.lastPage}
            from={from}
            to={to}
            total={pageMeta.total}
            label="entries"
            onPageChange={setPage}
          />
        </div>
      </div>
    </div>
  );
}
