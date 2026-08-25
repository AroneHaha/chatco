// app/(admin)/announcements/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Megaphone, Archive, Edit3, Eye, AlertTriangle, CalendarDays, X, ChevronUp } from 'lucide-react';
import { RequestCancelledError } from '@/lib/api/client';
import {
  listForAdmin,
  countForAdmin,
  create as createAnnouncement,
  update as updateAnnouncement,
  archive as archiveAnnouncement,
  AnnouncementOperationError,
  type Announcement,
} from '@/lib/shared/services/announcement.service';
import { AnnouncementFormModal, TYPE_SUGGESTIONS, type AnnouncementFormData } from '@/components/admin/announcements/announcement-form-modal';
import { AnnouncementDetailModal } from '@/components/shared/announcement-detail-modal';
import { Modal } from '@/components/admin/ui/modal';
import { TablePagination } from '@/components/admin/ui/table-pagination';

const PER_PAGE = 30;
/** Debounce window before a keystroke fires a server search request. */
const SEARCH_DEBOUNCE_MS = 300;

type DateRange = 'today' | 'last_7_days' | 'this_month' | 'all';

const DATE_RANGE_OPTIONS: { value: DateRange; label: string }[] = [
  { value: 'this_month', label: 'This Month' },
  { value: 'today', label: 'Today' },
  { value: 'last_7_days', label: 'Last 7 Days' },
  { value: 'all', label: 'All' },
];

/**
 * Sprint 6 (S6-T9) — Admin announcement management, wired to the real backend.
 *
 *   listForAdmin() → GET /api/v1/admin/announcements (all, incl. ARCHIVED)
 *   create()       → POST /api/v1/admin/announcements
 *   update()       → PUT /api/v1/admin/announcements/{id}
 *   archive()      → PATCH /api/v1/admin/announcements/{id}/archive
 *
 * The table shows every announcement (Active + Archived) with title, message
 * preview, category, status badge, author, and timestamp, 30 rows per page.
 * The status filter (All / Active / Archived) and search are resolved
 * server-side, so both stay correct across the whole dataset rather than
 * just whatever page happens to be loaded. Create + Edit share the
 * AnnouncementFormModal. Archive asks for confirmation (archived items
 * disappear from the commuter bell immediately).
 *
 * Role:ADMIN enforced at the Laravel /admin route group.
 */
export default function AnnouncementsPage() {
  const [items, setItems] = useState<Announcement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Status filter + search are resolved server-side so pagination stays
  // correct across the whole dataset, not just the currently loaded page.
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'ARCHIVED'>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  // Mutually exclusive: picking an exact date clears the range dropdown back
  // to its "no preset active" placeholder, and vice versa — see the two
  // handlers below.
  const [selectedDate, setSelectedDate] = useState('');
  const [dateRange, setDateRange] = useState<DateRange>('this_month');
  const [page, setPage] = useState(1);
  const [pageMeta, setPageMeta] = useState({ page: 1, lastPage: 1, total: 0 });
  // Active/archived counts for the header strip — independent of the current
  // filter/search/page so they always reflect the whole table.
  const [statusCounts, setStatusCounts] = useState({ active: 0, archived: 0 });

  // Modal state.
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Announcement | null>(null);
  const [detailItem, setDetailItem] = useState<Announcement | null>(null);
  const [archivingItem, setArchivingItem] = useState<Announcement | null>(null);

  // Form submit state.
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]> | undefined>(undefined);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [isArchiving, setIsArchiving] = useState(false);

  // Mobile-only collapse: the search/date/category/status filter row hides
  // behind a toggle so just the title + New Announcement button stay visible
  // on small screens — same pattern as the admin Lost & Found and Remittance
  // pages (and the conductor dashboard's MobileDashboardCard).
  const [isMobileFiltersExpanded, setIsMobileFiltersExpanded] = useState(true);

  // ─── Debounce the search box → a server-side query, resetting to page 1 ──
  useEffect(() => {
    const id = window.setTimeout(() => {
      setSearchQuery(searchInput.trim());
      setPage(1);
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(id);
  }, [searchInput]);

  const handleStatusFilterChange = (key: 'ALL' | 'ACTIVE' | 'ARCHIVED') => {
    setStatusFilter(key);
    setPage(1);
  };

  const handleCategoryFilterChange = (type: string) => {
    setCategoryFilter(type);
    setPage(1);
  };

  const handleDateRangeChange = (range: DateRange) => {
    setDateRange(range);
    setSelectedDate('');
    setPage(1);
  };

  const handleSelectedDateChange = (date: string) => {
    setSelectedDate(date);
    // An exact date overrides the preset — drop the dropdown to "All" so it
    // doesn't keep showing a stale range that's no longer actually applied.
    if (date) setDateRange('all');
    setPage(1);
  };

  // ─── Fetch the current page from the server (status + search + page) ────
  // An in-flight request is aborted as soon as a newer one supersedes it
  // (fast typing, quick page flips), so the UI never renders stale results.
  const load = useCallback(async (signal?: AbortSignal) => {
    setIsLoading(true);
    setListError(null);
    try {
      const result = await listForAdmin({
        // "All" means all active announcements, not literally every status —
        // archived items should only surface when the Archived tab is picked,
        // never mixed into the default view.
        status: statusFilter === 'ALL' ? 'ACTIVE' : statusFilter,
        type: categoryFilter === 'ALL' ? undefined : categoryFilter,
        search: searchQuery || undefined,
        date: selectedDate || undefined,
        dateRange,
        page,
        perPage: PER_PAGE,
        signal,
      });
      setItems(result.items);
      setPageMeta({ page: result.page, lastPage: result.lastPage, total: result.total });
      // The active page can end up past the new last page (e.g. archiving the
      // last item on the final page) — snap back instead of showing empty.
      if (page > result.lastPage && result.lastPage >= 1) {
        setPage(result.lastPage);
      }
    } catch (err) {
      if (err instanceof RequestCancelledError) return;
      setListError(
        err instanceof AnnouncementOperationError
          ? err.message
          : 'Unable to load announcements.'
      );
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, categoryFilter, searchQuery, selectedDate, dateRange, page]);

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const refresh = useCallback(() => load(), [load]);

  // ─── Active/archived counts for the header strip (whole table, not just
  // the current page/filter) ───────────────────────────────────────────
  // countForAdmin hits the same endpoint with ?count_only=1 — a plain COUNT
  // query, no page of rows, no creator eager-load — instead of the full
  // paginate(1) that listForAdmin({ perPage: 1 }) used to run per number.
  const refreshCounts = useCallback(async () => {
    try {
      const [active, archived] = await Promise.all([
        countForAdmin({ status: 'ACTIVE' }),
        countForAdmin({ status: 'ARCHIVED' }),
      ]);
      setStatusCounts({ active, archived });
    } catch {
      // Supplementary data — the table itself already loaded successfully.
    }
  }, []);

  useEffect(() => {
    void refreshCounts();
  }, [refreshCounts]);

  const activeCount = statusCounts.active;
  const archivedCount = statusCounts.archived;
  const totalCount = activeCount + archivedCount;
  const from = pageMeta.total === 0 ? 0 : (pageMeta.page - 1) * PER_PAGE + 1;
  const to = Math.min(pageMeta.page * PER_PAGE, pageMeta.total);

  // ─── Open create / edit ─────────────────────────────────────────────
  const handleOpenCreate = () => {
    setEditingItem(null);
    setFieldErrors(undefined);
    setSubmitError(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (item: Announcement) => {
    setEditingItem(item);
    setFieldErrors(undefined);
    setSubmitError(null);
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    if (isSubmitting) return;
    setIsFormOpen(false);
    setEditingItem(null);
    setFieldErrors(undefined);
    setSubmitError(null);
  };

  // ─── Submit create / edit ───────────────────────────────────────────
  const handleSubmitForm = async (data: AnnouncementFormData) => {
    setIsSubmitting(true);
    setFieldErrors(undefined);
    setSubmitError(null);
    try {
      if (editingItem) {
        await updateAnnouncement(editingItem.id, {
          title: data.title,
          message: data.message,
          type: data.type || null,
        });
      } else {
        await createAnnouncement({
          title: data.title,
          message: data.message,
          ...(data.type ? { type: data.type } : {}),
        });
      }
      setIsFormOpen(false);
      setEditingItem(null);
      void refresh();
      void refreshCounts();
    } catch (err) {
      if (err instanceof AnnouncementOperationError) {
        if (err.code === 'validation') {
          setFieldErrors(err.fieldErrors);
          setSubmitError(err.message);
        } else {
          setSubmitError(err.message);
        }
      } else {
        setSubmitError('Unable to save this announcement.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─── Archive flow (with confirm) ────────────────────────────────────
  const handleConfirmArchive = async () => {
    if (!archivingItem) return;
    setIsArchiving(true);
    setActionError(null);
    try {
      await archiveAnnouncement(archivingItem.id);
      setArchivingItem(null);
      void refresh();
      void refreshCounts();
    } catch (err) {
      setActionError(
        err instanceof AnnouncementOperationError
          ? err.message
          : 'Unable to archive this announcement.'
      );
    } finally {
      setIsArchiving(false);
    }
  };

  // ─── Helpers ────────────────────────────────────────────────────────
  const formatRelativeTime = (iso: string): string => {
    if (!iso) return '—';
    const diff = Date.now() - new Date(iso).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(iso).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const searchInputClasses =
    'h-11 w-full bg-[#0E1628] border border-[#1E2D45] rounded-md pl-10 pr-4 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-[#62A0EA] transition-colors';

  return (
    <div className="h-full w-[calc(100%+2rem)] flex flex-col overflow-hidden relative -mx-4 -mt-4 md:w-full md:mx-0 md:mt-0">
      {/* Header. On phones it breaks out of <main>'s padding to sit flush at the
          top edge-to-edge (like the shared sticky header). On desktop it drops
          the boxed-card look and becomes a borderless, transparent full-width
          header — flush to the content edges like every other admin module —
          with just a full-width bottom divider. */}
      <div className="flex-shrink-0 bg-[#131C2E] border-b border-[#1E2D45] p-4 z-10 mb-4 md:bg-transparent md:rounded-none md:px-0 md:pt-0 md:pb-5 md:mb-6">
        <div className="flex flex-col sm:flex-row lg:flex-row lg:items-center lg:justify-between gap-4 mb-5">
          <div className="min-w-0">
            <h1 className="text-white font-bold text-xl lg:text-2xl flex items-center gap-2">
              <Megaphone size={22} className="text-[#62A0EA]" />
              Announcements
            </h1>
            <p className="text-slate-500 text-xs mt-1">
              {totalCount} total • {activeCount} active • {archivedCount} archived
            </p>
          </div>
          <button
            onClick={handleOpenCreate}
            className="inline-flex h-11 w-full flex-shrink-0 items-center justify-center gap-2 rounded-lg bg-[#62A0EA] px-4 text-sm font-bold text-white shadow-lg shadow-[#62A0EA]/25 transition-colors hover:bg-[#4A8BD4] sm:w-auto"
          >
            <Plus size={16} />
            <span>New Announcement</span>
          </button>
        </div>

        {/* Mobile-only collapse: the filter row hides behind a toggle so just
            the title + New Announcement button above stay visible on small
            screens. The md:!max-h-none override means this never collapses
            at md: and up. */}
        <div
          className="overflow-hidden transition-all duration-300 ease-in-out md:max-h-none!"
          style={{ maxHeight: isMobileFiltersExpanded ? '500px' : '0px' }}
        >
          {/* Filters — search on the left, date picker/dropdown/status filter
              pushed to the right edge via justify-between (sm:+; they just
              stack after the search on mobile). */}
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
            {/* Search — capped width so it doesn't stretch across the whole header.
                Nudged right on desktop (md:) so the focus ring isn't clipped by
                the header's flush-left edge (md:px-0 on the parent). */}
            <div className="relative w-full sm:w-80 sm:flex-none md:ml-1">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
              <input
                type="text"
                placeholder="Search title or message…"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className={searchInputClasses}
              />
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              {/* Exact date picker — resolved server-side (whereDate created_at).
                  Picking a date overrides the range dropdown below (see
                  handleSelectedDateChange), same relationship as the two date
                  filters on the Lost & Found admin page. */}
              <div className="relative w-full sm:w-auto">
                <CalendarDays className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => handleSelectedDateChange(e.target.value)}
                  aria-label="Filter announcements by an exact date"
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
              {/* Quick date range — same today/last_7_days/this_month convention
                  as Fleet Management's shift history filter. Defaults to This
                  Month. Mutually exclusive with the exact date picker above. */}
              <select
                value={dateRange}
                onChange={(e) => handleDateRangeChange(e.target.value as DateRange)}
                aria-label="Filter announcements by a quick date range"
                className="h-11 w-full rounded-md border border-[#1E2D45] bg-[#0E1628] px-3 text-sm text-slate-200 outline-none transition-colors scheme-dark focus:border-[#62A0EA]/50 focus:ring-1 focus:ring-[#62A0EA]/30 sm:w-auto"
              >
                {DATE_RANGE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value} className="bg-[#0E1628]">
                    {option.label}
                  </option>
                ))}
              </select>
              {/* Category filter — same suggested categories offered when creating
                  a new announcement (TYPE_SUGGESTIONS), so this list can't drift
                  from what an admin can actually assign. */}
              <select
                value={categoryFilter}
                onChange={(e) => handleCategoryFilterChange(e.target.value)}
                aria-label="Filter announcements by category"
                className="h-11 w-full rounded-md border border-[#1E2D45] bg-[#0E1628] px-3 text-sm text-slate-200 outline-none transition-colors scheme-dark focus:border-[#62A0EA]/50 focus:ring-1 focus:ring-[#62A0EA]/30 sm:w-auto"
              >
                <option value="ALL" className="bg-[#0E1628]">All Categories</option>
                {TYPE_SUGGESTIONS.map((type) => (
                  <option key={type} value={type} className="bg-[#0E1628]">
                    {type}
                  </option>
                ))}
              </select>
              {/* Status filter — same h-11 as every other control in this row
                  (font-size/padding alone made it read visibly shorter). */}
              <div className="flex h-11 w-full items-stretch gap-1 rounded-md border border-[#1E2D45] bg-[#0E1628] p-1 sm:w-auto">
                {([['ALL', 'All'], ['ACTIVE', 'Active'], ['ARCHIVED', 'Archived']] as const).map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => handleStatusFilterChange(key)}
                    className={`flex-1 rounded-md px-4 text-sm font-semibold transition-all sm:flex-none ${
                      statusFilter === key
                        ? 'bg-[#62A0EA] text-white shadow-lg shadow-[#62A0EA]/30'
                        : 'text-slate-500 hover:text-slate-300 hover:bg-[#1A2540]'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsMobileFiltersExpanded((prev) => !prev)}
          aria-expanded={isMobileFiltersExpanded}
          aria-label={isMobileFiltersExpanded ? 'Collapse filters' : 'Expand filters'}
          className="-mx-4 -mb-4 mt-2 flex w-[calc(100%+2rem)] flex-shrink-0 items-center justify-center border-t border-white/5 py-1.5 text-slate-500 transition-colors hover:bg-white/5 hover:text-slate-300 active:bg-white/10 md:hidden"
        >
          <ChevronUp className={`h-4 w-4 transition-transform duration-300 ${isMobileFiltersExpanded ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* Action error */}
      {actionError && (
        <div className="mx-4 md:mx-0 mb-4 bg-red-500/10 border border-red-500/30 rounded-md p-3 flex items-center gap-2">
          <AlertTriangle size={16} className="text-red-400 flex-shrink-0" />
          <p className="text-red-400 text-xs font-medium">{actionError}</p>
          <button
            onClick={() => setActionError(null)}
            className="ml-auto text-red-400/60 hover:text-red-400 text-xs"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Table — bounded height; only the rows scroll internally so the
          header row and the pagination bar stay put instead of scrolling
          away with the content. */}
      <div className="flex-1 min-h-0 flex flex-col px-4 md:px-0">
        {isLoading ? (
          <div className="h-full flex flex-col items-center justify-center">
            <div className="w-8 h-8 border-2 border-[#1E2D45] border-t-[#62A0EA] rounded-full animate-spin" />
            <p className="text-slate-500 text-sm mt-4">Loading announcements…</p>
          </div>
        ) : listError ? (
          <div className="h-full flex flex-col items-center justify-center text-center px-4">
            <AlertTriangle size={32} className="text-red-400/60 mb-3" />
            <p className="text-red-400 font-medium text-sm mb-3">{listError}</p>
            <button
              onClick={() => void refresh()}
              className="px-4 py-2 rounded-md text-xs font-semibold bg-[#62A0EA] text-white"
            >
              Try again
            </button>
          </div>
        ) : items.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center px-4">
            <Megaphone size={40} className="text-slate-600 mb-3" />
            <h3 className="text-slate-300 font-semibold mb-1">No announcements found</h3>
            <p className="text-slate-500 text-sm">
              {searchQuery || statusFilter !== 'ALL' || dateRange !== 'all' || selectedDate
                ? 'Try adjusting your search or filters.'
                : 'Click "New Announcement" to publish your first one.'}
            </p>
          </div>
        ) : (
          <div className="flex-1 min-h-0 flex flex-col gap-3">
            {/* Desktop table — header row stays pinned while only the body scrolls. */}
            <div className="hidden md:flex md:flex-1 md:min-h-0 md:flex-col bg-[#131C2E] border border-[#1E2D45] rounded-lg overflow-hidden">
              <div className="flex-1 min-h-0 overflow-y-auto">
                <table className="w-full table-fixed">
                  <thead className="sticky top-0 z-10">
                    <tr>
                      {/* Percentage widths (not rem) so every column scales together —
                          with only Title unconstrained, it soaked up 100% of the
                          leftover space on wide screens, stranding Category far from
                          it while Category and Status (both narrow, fixed) ended up
                          shoulder-to-shoulder. Proportional widths keep the gaps
                          between all six columns visually even at any table width. */}
                      <th className="text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wider px-3 py-3 w-[36%] bg-[#0E1628] shadow-[inset_0_-1px_0_#1E2D45]">Title</th>
                      <th className="text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wider px-3 py-3 w-[12%] bg-[#0E1628] shadow-[inset_0_-1px_0_#1E2D45]">Category</th>
                      <th className="text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wider px-3 py-3 w-[11%] bg-[#0E1628] shadow-[inset_0_-1px_0_#1E2D45]">Status</th>
                      <th className="text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wider px-3 py-3 w-[15%] bg-[#0E1628] shadow-[inset_0_-1px_0_#1E2D45]">Author</th>
                      <th className="text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wider px-3 py-3 w-[13%] bg-[#0E1628] shadow-[inset_0_-1px_0_#1E2D45]">Posted</th>
                      <th className="text-right text-[10px] font-semibold text-slate-500 uppercase tracking-wider px-3 py-3 w-[13%] bg-[#0E1628] shadow-[inset_0_-1px_0_#1E2D45]">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1E2D45]">
                    {items.map((item) => (
                    <tr key={item.id} className="hover:bg-[#1A2540] transition-colors">
                      <td className="px-3 py-3">
                        <p className="text-sm font-semibold text-white truncate">{item.title}</p>
                        <p className="text-xs text-slate-500 truncate mt-0.5">
                          {item.message.slice(0, 80)}
                          {item.message.length > 80 ? '…' : ''}
                        </p>
                      </td>
                      <td className="px-3 py-3">
                        {item.type ? (
                          <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-[#62A0EA]/10 border border-[#62A0EA]/20 text-[#62A0EA]">
                            {item.type}
                          </span>
                        ) : (
                          <span className="text-slate-600 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                            item.status === 'ARCHIVED'
                              ? 'border-slate-500/30 bg-slate-500/10 text-slate-400'
                              : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                          }`}
                        >
                          {item.displayStatus}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-xs text-slate-400 truncate">
                        {item.createdBy ?? '—'}
                      </td>
                      <td className="px-3 py-3 text-xs text-slate-500 truncate">
                        {formatRelativeTime(item.createdAt)}
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setDetailItem(item)}
                            title="View"
                            className="p-1.5 rounded-md text-slate-500 hover:text-[#62A0EA] hover:bg-[#62A0EA]/10 transition-colors"
                          >
                            <Eye size={15} />
                          </button>
                          <button
                            onClick={() => handleOpenEdit(item)}
                            title="Edit"
                            className="p-1.5 rounded-md text-slate-500 hover:text-[#62A0EA] hover:bg-[#62A0EA]/10 transition-colors"
                          >
                            <Edit3 size={15} />
                          </button>
                          <button
                            onClick={() => setArchivingItem(item)}
                            title="Archive"
                            disabled={item.status === 'ARCHIVED'}
                            className="p-1.5 rounded-md text-slate-500 hover:text-amber-400 hover:bg-amber-400/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            <Archive size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden flex-1 min-h-0 overflow-y-auto space-y-3">
              {items.map((item) => (
                <div key={item.id} className="bg-[#131C2E] border border-[#1E2D45] rounded-lg p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <p className="text-sm font-semibold text-white flex-1">{item.title}</p>
                    <span
                      className={`flex-shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                        item.status === 'ARCHIVED'
                          ? 'border-slate-500/30 bg-slate-500/10 text-slate-400'
                          : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                      }`}
                    >
                      {item.displayStatus}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 line-clamp-2 mb-3">
                    {item.message.slice(0, 120)}
                    {item.message.length > 120 ? '…' : ''}
                  </p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-[10px] text-slate-600">
                      {item.type && (
                        <span className="px-1.5 py-0.5 rounded bg-[#62A0EA]/10 text-[#62A0EA] font-bold uppercase">
                          {item.type}
                        </span>
                      )}
                      <span>{formatRelativeTime(item.createdAt)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => setDetailItem(item)} className="p-1.5 rounded-md text-slate-500 hover:text-[#62A0EA] hover:bg-[#62A0EA]/10">
                        <Eye size={15} />
                      </button>
                      <button onClick={() => handleOpenEdit(item)} className="p-1.5 rounded-md text-slate-500 hover:text-[#62A0EA] hover:bg-[#62A0EA]/10">
                        <Edit3 size={15} />
                      </button>
                      <button
                        onClick={() => setArchivingItem(item)}
                        disabled={item.status === 'ARCHIVED'}
                        className="p-1.5 rounded-md text-slate-500 hover:text-amber-400 hover:bg-amber-400/10 disabled:opacity-30"
                      >
                        <Archive size={15} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination — outside the scrollable areas above, so it never scrolls out of view. */}
            <div className="flex-shrink-0 bg-[#131C2E] border border-[#1E2D45] rounded-lg px-3 pb-3">
              <TablePagination
                currentPage={pageMeta.page}
                totalPages={pageMeta.lastPage}
                from={from}
                to={to}
                total={pageMeta.total}
                label="announcements"
                onPageChange={setPage}
              />
            </div>
          </div>
        )}
      </div>

      {/* Create / Edit modal */}
      <AnnouncementFormModal
        isOpen={isFormOpen}
        onClose={handleCloseForm}
        onSubmit={handleSubmitForm}
        initial={editingItem}
        fieldErrors={fieldErrors}
        submitError={submitError}
        isSubmitting={isSubmitting}
      />

      {/* Detail modal */}
      <AnnouncementDetailModal
        announcement={detailItem}
        isOpen={detailItem !== null}
        onClose={() => setDetailItem(null)}
      />

      {/* Archive confirm modal */}
      <Modal isOpen={archivingItem !== null} onClose={() => !isArchiving && setArchivingItem(null)} maxWidth="max-w-sm">
        {archivingItem && (
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                <Archive size={18} className="text-amber-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Archive this announcement?</h3>
                <p className="text-xs text-slate-400 mt-1">
                  It will immediately disappear from the commuter bell and the user-facing feed. You can still see it by filtering to Archived.
                </p>
              </div>
            </div>
            <div className="bg-[#0E1628] border border-[#1E2D45] rounded-md p-3">
              <p className="text-sm font-semibold text-white">{archivingItem.title}</p>
              <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{archivingItem.message}</p>
            </div>
            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setArchivingItem(null)}
                disabled={isArchiving}
                className="px-4 py-2 rounded-md text-xs font-semibold text-slate-400 hover:text-white bg-[#0E1628] border border-[#1E2D45] hover:bg-[#1A2540] transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmArchive}
                disabled={isArchiving}
                className="flex items-center justify-center gap-2 px-4 py-2 bg-amber-500 text-white text-xs font-semibold rounded-md hover:bg-amber-600 transition-colors disabled:opacity-50"
              >
                {isArchiving && (
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                )}
                Archive
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
