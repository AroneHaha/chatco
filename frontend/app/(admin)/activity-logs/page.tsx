// app/(admin)/activity-logs/page.tsx
'use client';

import { useState, useEffect, useCallback, useMemo, useRef, Fragment } from 'react';
import { History, Search, ChevronUp, ChevronDown, AlertTriangle, ArrowRight, Download } from 'lucide-react';
import { RequestCancelledError } from '@/lib/api/client';
import {
  listForAdmin,
  exportForAdmin,
  type ActivityLog,
  type ActivityChange,
  type ActivityActorRole,
  type ActivityLogFilters,
} from '@/lib/shared/services/activity-log.service';
import { exportReport, type ReportFormat } from '@/lib/utils/export-report';
import { StickyPageHeader } from '@/components/admin/layout/sticky-page-header';
import { TablePagination } from '@/components/admin/ui/table-pagination';
import { AdminDatePicker } from '@/components/admin/ui/admin-date-picker';

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
  { value: 'SHIFT', label: 'Shift' },
  { value: 'SHIFT_DEVICE', label: 'Shift Device' },
  { value: 'REMITTANCE', label: 'Remittance' },
  { value: 'ACCOUNT', label: 'Admin Account' },
];

const CATEGORY_LABELS: Record<string, string> = Object.fromEntries(
  CATEGORY_OPTIONS.map((option) => [option.value, option.label])
);

/** Who did it — matches ActivityLogService::ACTOR_ROLES. */
const ROLE_OPTIONS: { value: ActivityActorRole; label: string }[] = [
  { value: 'ADMIN', label: 'Admins' },
  { value: 'COMMUTER', label: 'Commuters' },
  { value: 'CONDUCTOR', label: 'Conductors' },
  { value: 'SYSTEM', label: 'System' },
];

const ROLE_LABELS: Record<ActivityActorRole, string> = {
  ADMIN: 'Admin',
  COMMUTER: 'Commuter',
  CONDUCTOR: 'Conductor',
  SYSTEM: 'Automatic',
};

/** One readable line per change, for exports: "Status: Active → Suspended". */
function changesToText(changes: ActivityChange[]): string {
  return changes.map((change) => `${change.field}: ${change.from ?? 'None'} → ${change.to ?? 'None'}`).join('; ');
}

function ChangeValue({ value, previous = false }: { value: string | null; previous?: boolean }) {
  if (value === null) {
    return <span className="italic text-slate-500">None</span>;
  }
  return (
    <span className={previous ? 'text-slate-400 admin-light:text-slate-500' : 'font-medium text-white admin-light:text-slate-900'}>
      {value}
    </span>
  );
}

/** Before → after, one row per changed field. */
function ChangeList({ changes }: { changes: ActivityChange[] }) {
  return (
    <dl className="grid grid-cols-1 gap-x-4 gap-y-2 text-xs sm:grid-cols-[minmax(0,11rem)_minmax(0,1fr)] sm:gap-y-1.5">
      {changes.map((change, index) => (
        <Fragment key={`${change.field}-${index}`}>
          <dt className="text-slate-500">{change.field}</dt>
          <dd className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5 wrap-break-word">
            <span className="sr-only">changed from</span>
            <ChangeValue value={change.from} previous />
            <ArrowRight size={12} aria-hidden="true" className="shrink-0 text-slate-500" />
            <span className="sr-only">to</span>
            <ChangeValue value={change.to} />
          </dd>
        </Fragment>
      ))}
    </dl>
  );
}

function ActorCell({ item }: { item: ActivityLog }) {
  return (
    <>
      <span className="block truncate" title={item.by}>{item.by}</span>
      {item.role && item.role !== 'SYSTEM' && (
        <span className="block text-[10px] text-slate-500">{ROLE_LABELS[item.role]}</span>
      )}
    </>
  );
}

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
    <span className="text-[10px] font-semibold uppercase tracking-wider text-[#62A0EA] admin-light:text-[#1A5FB4]">
      {CATEGORY_LABELS[category] ?? category}
    </span>
  );
}

function ActivityLogSkeleton({ mobile = false }: { mobile?: boolean }) {
  return (
    <div
      role="status"
      aria-label="Loading activity logs"
      className={mobile ? "space-y-2 md:hidden" : "hidden md:block"}
    >
      <span className="sr-only">Loading activity logs…</span>
      {mobile ? (
        Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="space-y-3 rounded-lg border border-[#1E2D45] admin-light:border-[#E2E8F0] bg-[#0E1628] admin-light:bg-[#F1F5F9] p-3">
            <div className="flex items-center justify-between gap-3">
              <div className="h-5 w-20 animate-pulse rounded bg-[#1A2540] admin-light:bg-[#E2E8F0]" />
              <div className="h-3 w-28 animate-pulse rounded bg-[#1A2540] admin-light:bg-[#E2E8F0]" />
            </div>
            <div className="h-4 w-full animate-pulse rounded bg-[#1A2540] admin-light:bg-[#E2E8F0]" />
            <div className="h-3 w-2/5 animate-pulse rounded bg-[#1A2540] admin-light:bg-[#E2E8F0]" />
          </div>
        ))
      ) : (
        <div className="divide-y divide-[#1E2D45] admin-light:divide-[#E2E8F0]">
          {Array.from({ length: 7 }).map((_, index) => (
            <div key={index} className="grid grid-cols-[16%_16%_50%_18%] items-center gap-3 px-3 py-4">
              <div className="h-3 w-4/5 animate-pulse rounded bg-[#1A2540] admin-light:bg-[#E2E8F0]" />
              <div className="h-5 w-3/4 animate-pulse rounded bg-[#1A2540] admin-light:bg-[#E2E8F0]" />
              <div className="h-3 w-full animate-pulse rounded bg-[#1A2540] admin-light:bg-[#E2E8F0]" />
              <div className="h-3 w-4/5 animate-pulse rounded bg-[#1A2540] admin-light:bg-[#E2E8F0]" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Server-paginated (30/page), server-filtered audit trail: admin actions,
 * commuter account edits and automatic system events. Search/category/date/
 * actor filters are resolved server-side (ActivityLogService::listForAdmin)
 * so they stay correct across the whole dataset, not just whatever page
 * happens to be loaded. Read-only — rows are written by the endpoints and
 * jobs that produced them.
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
  const [roleFilter, setRoleFilter] = useState<ActivityActorRole | 'ALL'>('ALL');
  const [page, setPage] = useState(1);
  const [pageMeta, setPageMeta] = useState({ page: 1, lastPage: 1, total: 0 });
  // One entry open at a time; its full text and before/after values show below it.
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  // Tagged with the filters it describes, so it disappears once they change.
  const [exportMessage, setExportMessage] = useState<{ tone: 'info' | 'error'; text: string; filters: ActivityLogFilters } | null>(null);
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

  const handleRoleFilterChange = (value: ActivityActorRole | 'ALL') => {
    setRoleFilter(value);
    setPage(1);
  };

  const hasActiveFilters =
    searchQuery !== '' || selectedDate !== '' || dateRange !== 'today' || categoryFilter !== 'ALL' || roleFilter !== 'ALL';

  // The same filters drive the page and the export, so an export always
  // contains exactly what the table is showing (every page of it).
  const filters = useMemo<ActivityLogFilters>(() => ({
    category: categoryFilter === 'ALL' ? undefined : categoryFilter,
    search: searchQuery || undefined,
    date: selectedDate || undefined,
    dateRange,
    actorRole: roleFilter === 'ALL' ? undefined : roleFilter,
  }), [categoryFilter, searchQuery, selectedDate, dateRange, roleFilter]);

  // ─── Fetch the current page from the server (filters + page) ────────────
  // An in-flight request is aborted as soon as a newer one supersedes it
  // (fast typing, quick page flips), so the UI never renders stale results.
  const load = useCallback(async (signal?: AbortSignal) => {
    setIsLoading(true);
    setListError(null);
    try {
      const result = await listForAdmin({
        ...filters,
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
  }, [filters, page]);

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const refresh = useCallback(() => load(), [load]);

  const handleExport = async (format: ReportFormat) => {
    setIsExportOpen(false);
    if (isExporting) return;
    setIsExporting(true);
    setExportMessage(null);
    try {
      const { items: rows, total } = await exportForAdmin(filters);
      if (rows.length === 0) {
        setExportMessage({ tone: 'info', text: 'Nothing to export for these filters.', filters });
        return;
      }
      await exportReport({
        title: 'CHATCO Activity Log',
        fileName: `chatco-activity-log-${new Date().toLocaleDateString('en-CA')}`,
        format,
        headers: ['Timestamp', 'Category', 'Activity', 'Changes', 'By', 'Role'],
        rows: rows.map((row) => [
          formatTimestamp(row.createdAt),
          CATEGORY_LABELS[row.category] ?? row.category,
          row.description,
          changesToText(row.changes),
          row.by,
          row.role ? ROLE_LABELS[row.role] : '',
        ]),
      });
      if (total > rows.length) {
        setExportMessage({
          tone: 'info',
          text: `Exported the latest ${rows.length.toLocaleString()} of ${total.toLocaleString()} entries. Narrow the dates to export the rest.`,
          filters,
        });
      }
    } catch (err) {
      setExportMessage({ tone: 'error', text: err instanceof Error ? err.message : 'Unable to export activity logs.', filters });
    } finally {
      setIsExporting(false);
    }
  };

  const toggleExpanded = (id: string) => setExpandedId((current) => (current === id ? null : id));

  const from = pageMeta.total === 0 ? 0 : (pageMeta.page - 1) * PER_PAGE + 1;
  const to = Math.min(pageMeta.page * PER_PAGE, pageMeta.total);

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Only the title pins on phones — the subtitle stays in the scroll
          flow so the sticky bar stays one line tall instead of eating a
          third of a small screen (same reasoning as the admin dashboard
          header). */}
      <StickyPageHeader className="flex shrink-0 items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[#62A0EA]/15 admin-light:bg-[#1A5FB4]/10">
            <History size={22} className="text-[#62A0EA] admin-light:text-[#1A5FB4]" />
          </div>
          <h1 className="text-2xl font-bold leading-tight text-white admin-light:text-slate-900">Activity Logs</h1>
        </div>
        {/* Same single Export dropdown as Receipts and Analytics. Exports
            every entry matching the filters, not only the loaded page. */}
        <div className="relative shrink-0" ref={exportMenuRef}>
          <button
            type="button"
            onClick={() => setIsExportOpen((open) => !open)}
            disabled={isExporting || (pageMeta.total === 0 && !isLoading)}
            className="flex items-center gap-2 px-3 py-2 bg-[#62A0EA] admin-light:bg-[#1A5FB4] text-white text-xs font-medium rounded-md hover:bg-[#4A8BD4] admin-light:hover:bg-[#164A8F] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title={`Export ${pageMeta.total.toLocaleString()} entries`}
            aria-haspopup="menu"
            aria-expanded={isExportOpen}
          >
            <Download size={14} />
            <span>{isExporting ? 'Exporting…' : 'Export'}</span>
            <ChevronDown size={14} className={`transition-transform duration-200 ${isExportOpen ? 'rotate-180' : ''}`} />
          </button>

          {isExportOpen && (
            <div
              role="menu"
              className="absolute right-0 top-full mt-2 w-36 bg-[#131C2E] admin-light:bg-white border border-[#1E2D45] admin-light:border-[#E2E8F0] rounded-md shadow-2xl shadow-black/50 admin-light:shadow-black/10 overflow-hidden z-20"
            >
              {(['pdf', 'excel', 'word'] as const).map((format) => (
                <button
                  key={format}
                  type="button"
                  role="menuitem"
                  onClick={() => void handleExport(format)}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-slate-300 admin-light:text-slate-700 hover:bg-[#1A2540] admin-light:hover:bg-[#EEF2F7] hover:text-white admin-light:hover:text-slate-900 transition-colors"
                >
                  <Download size={13} className="text-slate-500" />
                  <span>{format === 'pdf' ? 'PDF' : format === 'excel' ? 'Excel' : 'Word'}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </StickyPageHeader>
      <p className="mb-4 mt-1 shrink-0 text-xs text-slate-500">
        A searchable audit trail of admin actions, commuter account changes and automatic system events.
      </p>
      {exportMessage && exportMessage.filters === filters && (
        <p
          role={exportMessage.tone === 'error' ? 'alert' : 'status'}
          className={`-mt-2 mb-4 shrink-0 text-xs ${exportMessage.tone === 'error' ? 'text-red-400 admin-light:text-red-600' : 'text-amber-300 admin-light:text-amber-700'}`}
        >
          {exportMessage.text}
        </p>
      )}

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
                placeholder="Search activity or name…"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="h-11 w-full rounded-md border border-[#1E2D45] admin-light:border-[#E2E8F0] bg-[#0E1628] admin-light:bg-white pl-10 pr-4 text-sm text-white admin-light:text-slate-900 placeholder:text-slate-500 admin-light:placeholder:text-slate-400 transition-colors focus:outline-none focus:ring-1 focus:ring-[#62A0EA]/30 admin-light:focus:ring-[#1A5FB4]/30"
              />
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:ml-auto">
              {/* Exact date picker — mutually exclusive with the range preset below.
                  popover: the filters wrapper above is overflow-hidden for the
                  mobile collapse, which clipped the inline calendar; the top
                  layer escapes it (same as Remittance). */}
              <AdminDatePicker
                accent="blue"
                align="right"
                popover
                ariaLabel="Filter activity by an exact date"
                value={selectedDate}
                onChange={handleSelectedDateChange}
                triggerClassName="h-11 w-full md:w-44"
                className="w-full md:w-44"
              />

              {/* Quick date range */}
              <select
                value={dateRange}
                onChange={(e) => handleDateRangeChange(e.target.value as DateRange)}
                aria-label="Filter activity by a quick date range"
                className="h-11 w-full rounded-md border border-[#1E2D45] admin-light:border-[#E2E8F0] bg-[#0E1628] admin-light:bg-white px-3 text-sm text-slate-200 admin-light:text-slate-700 outline-none transition-colors scheme-dark admin-light:scheme-light focus:border-[#62A0EA]/50 admin-light:focus:border-[#1A5FB4] focus:ring-1 focus:ring-[#62A0EA]/30 admin-light:focus:ring-[#1A5FB4]/30 sm:w-auto"
              >
                {DATE_RANGE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value} className="bg-[#0E1628] admin-light:bg-white">
                    {option.label}
                  </option>
                ))}
              </select>

              {/* Category filter */}
              <select
                value={categoryFilter}
                onChange={(e) => handleCategoryFilterChange(e.target.value)}
                aria-label="Filter activity by category"
                className="h-11 w-full rounded-md border border-[#1E2D45] admin-light:border-[#E2E8F0] bg-[#0E1628] admin-light:bg-white px-3 text-sm text-slate-200 admin-light:text-slate-700 outline-none transition-colors scheme-dark admin-light:scheme-light focus:border-[#62A0EA]/50 admin-light:focus:border-[#1A5FB4] focus:ring-1 focus:ring-[#62A0EA]/30 admin-light:focus:ring-[#1A5FB4]/30 sm:w-auto"
              >
                <option value="ALL" className="bg-[#0E1628] admin-light:bg-white">All Categories</option>
                {CATEGORY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value} className="bg-[#0E1628] admin-light:bg-white">
                    {option.label}
                  </option>
                ))}
              </select>

              {/* Who did it */}
              <select
                value={roleFilter}
                onChange={(e) => handleRoleFilterChange(e.target.value as ActivityActorRole | 'ALL')}
                aria-label="Filter activity by who did it"
                className="h-11 w-full rounded-md border border-[#1E2D45] admin-light:border-[#E2E8F0] bg-[#0E1628] admin-light:bg-white px-3 text-sm text-slate-200 admin-light:text-slate-700 outline-none transition-colors scheme-dark admin-light:scheme-light focus:border-[#62A0EA]/50 admin-light:focus:border-[#1A5FB4] focus:ring-1 focus:ring-[#62A0EA]/30 admin-light:focus:ring-[#1A5FB4]/30 sm:w-auto"
              >
                <option value="ALL" className="bg-[#0E1628] admin-light:bg-white">Everyone</option>
                {ROLE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value} className="bg-[#0E1628] admin-light:bg-white">
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
          className="mt-2 flex w-full shrink-0 items-center justify-center border-t border-white/5 admin-light:border-[#E2E8F0] py-1.5 text-slate-500 transition-colors hover:bg-white/5 admin-light:hover:bg-[#F1F5F9] hover:text-slate-300 admin-light:text-slate-700 active:bg-white/10 admin-light:active:bg-slate-100 md:hidden"
        >
          <ChevronUp className={`h-4 w-4 transition-transform duration-300 ${isMobileFiltersExpanded ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* Table — bounded height; only the rows scroll internally so the
          header row and pagination bar stay put. */}
      <div className="flex flex-1 min-h-0 flex-col rounded-xl border border-[#1E2D45] admin-light:border-[#E2E8F0] bg-[#131C2E] admin-light:bg-white p-3 sm:p-4">
        <div className="hidden flex-1 min-h-0 flex-col overflow-hidden rounded-lg border border-[#1E2D45] admin-light:border-[#E2E8F0] md:flex">
          <div className="flex-1 min-h-0 overflow-y-auto">
            <table className="w-full table-fixed">
              <thead className="sticky top-0 z-10">
                <tr>
                  <th className="w-[16%] bg-[#0E1628] admin-light:bg-[#F1F5F9] px-3 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-500 shadow-[inset_0_-1px_0_#1E2D45] admin-light:shadow-[inset_0_-1px_0_#E2E8F0]">Timestamp</th>
                  <th className="w-[16%] bg-[#0E1628] admin-light:bg-[#F1F5F9] px-3 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-500 shadow-[inset_0_-1px_0_#1E2D45] admin-light:shadow-[inset_0_-1px_0_#E2E8F0]">Category</th>
                  <th className="w-[50%] bg-[#0E1628] admin-light:bg-[#F1F5F9] px-3 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-500 shadow-[inset_0_-1px_0_#1E2D45] admin-light:shadow-[inset_0_-1px_0_#E2E8F0]">Activity</th>
                  <th className="w-[18%] bg-[#0E1628] admin-light:bg-[#F1F5F9] px-3 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-500 shadow-[inset_0_-1px_0_#1E2D45] admin-light:shadow-[inset_0_-1px_0_#E2E8F0]">By</th>
                </tr>
              </thead>
              {!isLoading && !listError && items.length > 0 && (
                <tbody className="divide-y divide-[#1E2D45] admin-light:divide-[#E2E8F0]">
                  {items.map((item) => {
                    const isExpanded = expandedId === item.id;
                    return (
                      <Fragment key={item.id}>
                        <tr className={`transition-colors ${isExpanded ? 'bg-[#1A2540]/60 admin-light:bg-[#F8FAFC]' : 'hover:bg-[#1A2540] admin-light:hover:bg-[#EEF2F7]'}`}>
                          <td className="px-3 py-3 align-top text-xs text-slate-400 admin-light:text-slate-500">{formatTimestamp(item.createdAt)}</td>
                          <td className="px-3 py-3 align-top"><CategoryBadge category={item.category} /></td>
                          <td className="px-3 py-1.5 align-top">
                            {/* Only entries with recorded before/after values
                                open; the rest have nothing more to show (older
                                entries, and actions like a sign-in), so they
                                stay plain text with the full line on hover. */}
                            {item.changes.length > 0 ? (
                              <button
                                type="button"
                                onClick={() => toggleExpanded(item.id)}
                                aria-expanded={isExpanded}
                                aria-controls={`activity-detail-${item.id}`}
                                title={item.description}
                                className="group flex w-full min-w-0 items-center gap-2 rounded-md py-1.5 text-left text-sm text-slate-200 admin-light:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#62A0EA]/50 admin-light:focus-visible:ring-[#1A5FB4]/50"
                              >
                                <span className="min-w-0 flex-1 truncate">{item.description}</span>
                                <span className="shrink-0 text-[10px] text-slate-500 group-hover:text-slate-300 admin-light:group-hover:text-slate-700">
                                  {isExpanded ? 'Hide' : 'View'} {item.changes.length} {item.changes.length === 1 ? 'change' : 'changes'}
                                </span>
                                <ChevronDown size={14} aria-hidden="true" className={`shrink-0 text-slate-500 transition-transform duration-200 group-hover:text-slate-300 admin-light:group-hover:text-slate-700 ${isExpanded ? 'rotate-180' : ''}`} />
                              </button>
                            ) : (
                              <p className="truncate py-1.5 text-sm text-slate-200 admin-light:text-slate-700" title={item.description}>
                                {item.description}
                              </p>
                            )}
                          </td>
                          <td className="px-3 py-3 align-top text-xs text-slate-400 admin-light:text-slate-500"><ActorCell item={item} /></td>
                        </tr>
                        {isExpanded && item.changes.length > 0 && (
                          <tr id={`activity-detail-${item.id}`} className="bg-[#1A2540]/60 admin-light:bg-[#F8FAFC]">
                            <td colSpan={4} className="px-3 pb-4 pt-1">
                              {/* Lined up under the Activity column (Timestamp
                                  and Category are 16% each). */}
                              <div className="md:ml-[32%]">
                                <ChangeList changes={item.changes} />
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              )}
            </table>

            {isLoading && (
              <ActivityLogSkeleton />
            )}

            {!isLoading && listError && (
              <div className="flex flex-col items-center justify-center px-4 py-16 text-center">
                <AlertTriangle size={32} className="mb-3 text-red-400/60 admin-light:text-red-600/60" />
                <p className="mb-3 text-sm font-medium text-red-400 admin-light:text-red-600">{listError}</p>
                <button
                  onClick={() => void refresh()}
                  className="rounded-md bg-[#62A0EA] admin-light:bg-[#1A5FB4] px-4 py-2 text-xs font-semibold text-white"
                >
                  Try again
                </button>
              </div>
            )}

            {!isLoading && !listError && items.length === 0 && (
              <div className="flex flex-col items-center justify-center px-4 py-16 text-center">
                <History size={40} className="mb-3 text-slate-600 admin-light:text-slate-500" />
                <h3 className="mb-1 font-semibold text-slate-300 admin-light:text-slate-700">No activity logged yet</h3>
                <p className="text-sm text-slate-500">
                  {hasActiveFilters ? 'Try adjusting your search or filters.' : 'Activity will appear here as it happens.'}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Mobile */}
        <div className="flex flex-1 min-h-0 flex-col md:hidden">
          {isLoading ? (
            <ActivityLogSkeleton mobile />
          ) : listError ? (
            <div className="flex flex-1 min-h-0 flex-col items-center justify-center px-4 py-16 text-center">
              <AlertTriangle size={32} className="mb-3 text-red-400/60 admin-light:text-red-600/60" />
              <p className="mb-3 text-sm font-medium text-red-400 admin-light:text-red-600">{listError}</p>
              <button
                onClick={() => void refresh()}
                className="rounded-md bg-[#62A0EA] admin-light:bg-[#1A5FB4] px-4 py-2 text-xs font-semibold text-white"
              >
                Try again
              </button>
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-1 min-h-0 flex-col items-center justify-center px-4 py-16 text-center">
              <History size={40} className="mb-3 text-slate-600 admin-light:text-slate-500" />
              <h3 className="mb-1 font-semibold text-slate-300 admin-light:text-slate-700">No activity logged yet</h3>
              <p className="text-sm text-slate-500">
                {hasActiveFilters ? 'Try adjusting your search or filters.' : 'Activity will appear here as it happens.'}
              </p>
            </div>
          ) : (
            <div className="flex-1 min-h-0 space-y-2 overflow-y-auto">
              {items.map((item) => (
                <div key={item.id} className="rounded-lg border border-[#1E2D45] admin-light:border-[#E2E8F0] bg-[#0E1628] admin-light:bg-[#F1F5F9] p-3">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <CategoryBadge category={item.category} />
                    <span className="shrink-0 text-[10px] text-slate-500">{formatTimestamp(item.createdAt)}</span>
                  </div>
                  <p className="text-sm text-slate-200 admin-light:text-slate-700 wrap-break-word">{item.description}</p>
                  <p className="mt-1.5 text-xs text-slate-500">
                    {item.by}
                    {item.role && item.role !== 'SYSTEM' && <span> · {ROLE_LABELS[item.role]}</span>}
                  </p>
                  {item.changes.length > 0 && (
                    <div className="mt-2 border-t border-[#1E2D45] admin-light:border-[#E2E8F0] pt-2">
                      <button
                        type="button"
                        onClick={() => toggleExpanded(item.id)}
                        aria-expanded={expandedId === item.id}
                        className="flex min-h-9 w-full items-center justify-between gap-2 text-xs font-medium text-slate-400 admin-light:text-slate-600"
                      >
                        {expandedId === item.id ? 'Hide changes' : `Show ${item.changes.length} ${item.changes.length === 1 ? 'change' : 'changes'}`}
                        <ChevronDown size={14} aria-hidden="true" className={`transition-transform duration-200 ${expandedId === item.id ? 'rotate-180' : ''}`} />
                      </button>
                      {expandedId === item.id && <div className="pt-1"><ChangeList changes={item.changes} /></div>}
                    </div>
                  )}
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
