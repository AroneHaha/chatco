// app/(admin)/remittance/page.tsx
'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { RemittanceTable } from '@/components/admin/remittance/remittance-table';
import { RemittanceSummary } from '@/components/admin/remittance/remittance-summary';
import { SearchBar } from '@/components/admin/ui/search-bar';
import { CalendarDays, ChevronUp } from 'lucide-react';
import type { RemittanceStatus } from '@/app/(admin)/remittance/data/remittance-data';
import { StickyPageHeader } from '@/components/admin/layout/sticky-page-header';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { useAdminNotifications } from '@/contexts/admin-notifications-context';

// Local (Asia/Manila) YYYY-MM-DD — matches the RemittanceRecord `date` field.
const todayStr = () => new Date().toLocaleDateString('en-CA');

type RangePreset = 'today' | '7days' | 'month' | 'all';

const RANGE_OPTIONS: { value: RangePreset; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: '7days', label: 'Last 7 Days' },
  { value: 'month', label: 'This Month' },
  { value: 'all', label: 'All Time' },
];

export default function RemittancePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { markRead: markRemittanceNotificationsRead } = useAdminNotifications().remittance;
  // Opening the Remittance module clears the nav badge (new active shifts +
  // completed remittances) — mirrors the commuter Lost & Found Claims tab's
  // markClaimUpdatesRead().
  useEffect(() => {
    markRemittanceNotificationsRead();
  }, [markRemittanceNotificationsRead]);

  const [searchQuery, setSearchQuery] = useState('');
  // ─── Deep-link from the notification bell ──────────────────────
  // A REMITTANCE_COMPLETED notification links here as
  // /remittance?shiftId={shiftId}. Route it through the same search box
  // the admin would type a shift ID into (the backend already matches
  // `search` against shift_id) so the table narrows to that one row, then
  // tell RemittanceTable to auto-open its Conductor Detail modal once that
  // row shows up. Runs once on mount — the param is stripped from the URL
  // right after so a refresh/back doesn't repeat it.
  const [autoOpenShiftId, setAutoOpenShiftId] = useState<string | null>(null);
  useEffect(() => {
    const shiftId = searchParams.get('shiftId');
    if (!shiftId) return;
    setSearchQuery(shiftId);
    setAutoOpenShiftId(shiftId);
    router.replace('/remittance');
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deliberately mount-only: reacting to `router`/`searchParams` would re-fire after router.replace() strips the param.
  }, []);
  // The SearchBar updates `searchQuery` immediately (for responsive typing),
  // but RemittanceTable's search is a real server fetch (useRemittanceData),
  // so it keys off the debounced value instead of firing one request per keystroke.
  const debouncedSearchQuery = useDebouncedValue(searchQuery, 400);
  // The exact-date picker and the range dropdown are mutually exclusive —
  // choosing one clears the other, so the active date filter is never ambiguous.
  const [selectedDate, setSelectedDate] = useState('');
  // Defaults to "Today" so the admin sees today's active/pending and already-
  // remitted shifts first, instead of the full unfiltered history.
  const [rangePreset, setRangePreset] = useState<RangePreset>('today');
  const [statusFilter, setStatusFilter] = useState<RemittanceStatus | 'All'>('All'); // Quick Filter State
  const [conductorFilter, setConductorFilter] = useState('');
  const [driverFilter, setDriverFilter] = useState('');
  // Populated by RemittanceTable (via onOptionsChange) from the records it
  // already fetches — avoids a second fetch just to list conductor/driver names.
  const [conductorOptions, setConductorOptions] = useState<string[]>([]);
  const [driverOptions, setDriverOptions] = useState<string[]>([]);
  // Mobile-only collapse: the search/date/dropdown filter row hides behind a
  // toggle so just the summary cards stay visible on small screens — same
  // pattern as the conductor dashboard's MobileDashboardCard and the admin
  // Lost & Found page.
  const [isMobileFiltersExpanded, setIsMobileFiltersExpanded] = useState(true);

  const handlePickDate = (value: string) => {
    setSelectedDate(value);
  };

  const handlePickRange = (value: RangePreset) => {
    setRangePreset(value);
    setSelectedDate('');
    // Matches what the range dropdown is for: show every shift in scope
    // (Pending/active AND already-Remitted), not whatever status was left selected.
    setStatusFilter('All');
  };

  // Inclusive lower bound for the active preset, as a YYYY-MM-DD string.
  // "All Time" has no lower bound — dateFrom stays empty, so RemittanceTable
  // fetches unfiltered by date.
  const rangeStart = useMemo(() => {
    if (rangePreset === 'all') return '';
    const now = new Date();
    if (rangePreset === 'today') return todayStr();
    if (rangePreset === 'month') return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6); // 6 back + today = 7 days
    return sevenDaysAgo.toLocaleDateString('en-CA');
  }, [rangePreset]);

  const handleOptionsChange = useCallback((conductors: string[], drivers: string[]) => {
    setConductorOptions(conductors);
    setDriverOptions(drivers);
  }, []);

  const quickFilters: (RemittanceStatus | 'All')[] = ['All', 'Pending', 'For Cash Declaration', 'Overdue', 'Settled', 'Shortage', 'Overage'];

  return (
    // touch-action: manipulation prevents mobile double-tap ghost clicks
    <div style={{ touchAction: 'manipulation' }} className="flex h-full min-h-0 flex-col">
      {/* Title + quick status filters share one row (matches Receipts/Live
          Monitoring's header) and pin together on phones.

          Deliberately a direct child of the page root, NOT of the filter block
          below: a sticky element only stays pinned while its containing block
          is on screen, so nesting it in that short wrapper would have released
          the title as soon as the filters scrolled past — long before the
          remittance table, which is exactly where the title matters most. */}
      <StickyPageHeader className="flex flex-wrap items-center justify-between gap-3 mb-4 shrink-0">
        <h1 className="text-2xl font-bold text-white">Remittance Tracker</h1>

        {/* Quick Status Filters — one line, scrolls sideways instead of
            wrapping so the row never grows past a single line on narrow
            screens. min-w-0 lets it shrink inside the flex-wrap header;
            without it overflow-x-auto has no room to kick in. Buttons are
            flex-1 so they stretch to fill the full row width when they fit;
            each still has a text-driven min width (via whitespace-nowrap),
            so once they no longer fit they fall back to natural size and
            the row scrolls instead of squishing the labels. */}
        <div className="flex w-full min-w-0 flex-nowrap gap-2 overflow-x-auto scrollbar-themed">
          {quickFilters.map((filter) => (
            <button
              key={filter}
              onClick={() => setStatusFilter(filter)}
              className={`flex-1 whitespace-nowrap px-4 py-2 rounded-md text-sm font-medium text-center transition-colors ${
                statusFilter === filter
                  ? 'bg-[#62A0EA] text-white shadow-lg shadow-[#62A0EA]/25'
                  : 'bg-[#0E1628] border border-[#1E2D45] text-slate-300 hover:bg-[#1A2540]'
              }`}
            >
              {filter}
            </button>
          ))}
        </div>
      </StickyPageHeader>

      <div className="flex shrink-0 flex-col gap-4 mb-4">
        {/* Mobile-only collapse: summary cards AND the filter row both hide
            behind the toggle below, so a collapsed state actually reads as
            "collapsed" instead of leaving the cards permanently visible.
            The md:!max-h-none override means this never collapses at md:
            and up (same breakpoint the toggle button itself disappears at,
            below).

            Every element inside — the outer search/date/dropdowns row, and
            each sub-group within it — now shares that one md: breakpoint
            (previously a mix of sm:/lg:). Two independent breakpoints meant
            the layout reflowed twice as the viewport narrowed (a "row" state
            between lg and sm, then a second, different layout below sm) with
            no collapse control in between (the toggle was md:hidden while
            the row didn't break until lg) — that mismatch is what looked like
            the date filter's position "changing" on smaller screens. One
            shared breakpoint means exactly one transition: a single stacked
            column below md:, one full row at md: and up. */}
        <div
          className="overflow-hidden transition-all duration-300 ease-in-out md:max-h-none!"
          style={{ maxHeight: isMobileFiltersExpanded ? '700px' : '0px' }}
        >
          <div className="flex flex-col gap-4">
            <RemittanceSummary selectedDate={selectedDate} />

            {/* Search + date (left) — conductor/driver dropdowns (right, shorter) */}
            <div className="flex flex-col md:flex-row md:items-center gap-3 w-full">
              <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
                <SearchBar
                  placeholder="Search by Conductor or ID..."
                  value={searchQuery}
                  onChange={setSearchQuery}
                  className="w-full md:w-64"
                />

                <div className="relative w-full md:w-48">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <CalendarDays className="h-4 w-4 text-slate-400" />
                  </div>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => handlePickDate(e.target.value)}
                    aria-label="Filter remittances by date"
                    className="block w-full pl-10 pr-3 py-2 bg-[#0E1628] border border-[#1E2D45] rounded-md text-white text-sm focus:outline-none focus:ring-1 focus:ring-[#62A0EA] focus:border-[#62A0EA] scheme-dark"
                  />
                </div>
              </div>

              <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto md:ml-auto">
                {/* Shows every shift in range — Pending (still active/not yet
                    remitted) and Remitted alike — so activity is one click away. */}
                <select
                  value={rangePreset}
                  onChange={(e) => handlePickRange(e.target.value as RangePreset)}
                  aria-label="Filter by date range"
                  className="w-full md:w-36 rounded-md border border-[#1E2D45] bg-[#0E1628] px-3 py-2 text-sm text-white scheme-dark"
                >
                  {RANGE_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </select>
                <select
                  value={conductorFilter}
                  onChange={(e) => setConductorFilter(e.target.value)}
                  aria-label="Filter by conductor"
                  className="w-full md:w-36 rounded-md border border-[#1E2D45] bg-[#0E1628] px-3 py-2 text-sm text-white scheme-dark"
                >
                  <option value="">All conductors</option>
                  {conductorOptions.map((name) => <option key={name} value={name}>{name}</option>)}
                </select>
                <select
                  value={driverFilter}
                  onChange={(e) => setDriverFilter(e.target.value)}
                  aria-label="Filter by driver"
                  className="w-full md:w-36 rounded-md border border-[#1E2D45] bg-[#0E1628] px-3 py-2 text-sm text-white scheme-dark"
                >
                  <option value="">All drivers</option>
                  {driverOptions.map((name) => <option key={name} value={name}>{name}</option>)}
                </select>
              </div>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsMobileFiltersExpanded((prev) => !prev)}
          aria-expanded={isMobileFiltersExpanded}
          aria-label={isMobileFiltersExpanded ? 'Collapse filters' : 'Expand filters'}
          className="-mt-1 flex w-full shrink-0 items-center justify-center border-t border-white/5 py-1.5 text-slate-500 transition-colors hover:bg-white/5 hover:text-slate-300 active:bg-white/10 md:hidden"
        >
          <ChevronUp className={`h-4 w-4 transition-transform duration-300 ${isMobileFiltersExpanded ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* Table card — fills whatever vertical space is left, on every screen
          size, instead of a fixed height that either clips or leaves a gap. */}
      <div className="flex flex-1 min-h-0 flex-col bg-[#0B1220] border border-[#1E2D45] rounded-xl p-3 sm:p-4">
        <RemittanceTable
          searchQuery={debouncedSearchQuery}
          selectedDate={selectedDate}
          dateFrom={selectedDate ? '' : rangeStart}
          statusFilter={statusFilter}
          conductorFilter={conductorFilter}
          driverFilter={driverFilter}
          onOptionsChange={handleOptionsChange}
          autoOpenShiftId={autoOpenShiftId}
          onAutoOpenHandled={() => setAutoOpenShiftId(null)}
        />
      </div>
    </div>
  );
}
