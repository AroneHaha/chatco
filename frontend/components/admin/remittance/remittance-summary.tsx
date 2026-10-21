// components/admin/remittance/remittance-summary.tsx
'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Users, Banknote, Smartphone, Wallet, CircleMinus, CirclePlus, HandCoins, ClockAlert } from 'lucide-react';
import {
  useRemittanceData,
  type RemittanceTrendBucket,
  type RemittanceTrendBy,
} from '@/app/(admin)/remittance/data/remittance-data';
import { STATUS_TEXT_CLASSES } from '@/components/admin/remittance/remittance-status-text';

// ─── Helpers ───────────────────────────────────────────────────────────
const fmtPHP = (n: number) =>
  `₱${n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// Local (Asia/Manila) date in YYYY-MM-DD — matches the record `date` field.
const todayStr = () => new Date().toLocaleDateString('en-CA');

const fmtDate = (date: string, options: Intl.DateTimeFormatOptions) =>
  new Date(`${date}T00:00:00`).toLocaleDateString('en-PH', options);

/** "Oct 18" for a day, "Oct 12–18" / "Sep 28–Oct 4" for a week, "Oct 2026" for a month. */
function bucketLabel({ start, end }: RemittanceTrendBucket, by: RemittanceTrendBy) {
  if (by === 'month') return fmtDate(start, { month: 'short', year: 'numeric' });
  const startLabel = fmtDate(start, { month: 'short', day: 'numeric' });
  if (by === 'day') return startLabel;
  const sameMonth = start.slice(0, 7) === end.slice(0, 7);
  return `${startLabel}–${fmtDate(end, sameMonth ? { day: 'numeric' } : { month: 'short', day: 'numeric' })}`;
}

const TREND_CAPTIONS: Record<RemittanceTrendBy, string> = {
  day: 'Last 7 days',
  week: 'Last 6 weeks',
  month: 'Last 6 months',
};

interface CardTrend {
  /** What the whole line covers, e.g. "Last 6 weeks". */
  caption: string;
  /** One per point, oldest first; the last point is the current bucket. */
  labels: string[];
  values: number[];
  format: (value: number) => string;
}

const SPARK_W = 80;
const SPARK_H = 32;
const SPARK_PAD = 4; // keeps the 4px end dot and its ring inside the box

/**
 * 7-day line in a recessive slate with today's point in the accent (the
 * stat-tile trend). Hovering a day draws a hairline and reports it via
 * `onActiveChange`, so the card's caption — not a floating tooltip that the
 * card would clip — shows that day's value. The full series is in the
 * aria-label for screen readers.
 */
function Sparkline({ trend, label, activeIndex, onActiveChange }: {
  trend: CardTrend;
  label: string;
  activeIndex: number | null;
  onActiveChange: (index: number | null) => void;
}) {
  const { values, labels } = trend;
  const max = Math.max(...values, 0);
  const step = (SPARK_W - SPARK_PAD * 2) / Math.max(values.length - 1, 1);
  const x = (i: number) => SPARK_PAD + i * step;
  // An all-zero week sits on the baseline rather than inventing a slope.
  const y = (v: number) => (max > 0 ? SPARK_H - SPARK_PAD - (v / max) * (SPARK_H - SPARK_PAD * 2) : SPARK_H - SPARK_PAD);
  const path = values.map((v, i) => `${i ? 'L' : 'M'}${x(i)},${y(v)}`).join(' ');
  const marked = activeIndex ?? values.length - 1;

  return (
    <svg
      width={SPARK_W}
      height={SPARK_H}
      viewBox={`0 0 ${SPARK_W} ${SPARK_H}`}
      role="img"
      aria-label={`${label}, ${trend.caption.toLowerCase()}: ${values.map((v, i) => `${labels[i]} ${trend.format(v)}`).join(', ')}`}
      className="hidden shrink-0 xl:block"
      onPointerLeave={() => onActiveChange(null)}
    >
      {activeIndex !== null && (
        <line x1={x(activeIndex)} x2={x(activeIndex)} y1={0} y2={SPARK_H} strokeWidth={1} className="stroke-slate-600 admin-light:stroke-slate-300" />
      )}
      <path d={path} fill="none" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="stroke-slate-500 admin-light:stroke-slate-400" />
      <circle
        cx={x(marked)}
        cy={y(values[marked])}
        r={4}
        strokeWidth={2}
        className="fill-[#62A0EA] stroke-[#0E1628] admin-light:fill-[#1A5FB4] admin-light:stroke-white"
      />
      {/* Full-height column per day: a hit target far bigger than the line itself. */}
      {values.map((_, i) => (
        <rect key={labels[i]} x={x(i) - step / 2} y={0} width={step} height={SPARK_H} fill="transparent" onPointerEnter={() => onActiveChange(i)} />
      ))}
    </svg>
  );
}

interface StatCardProps {
  label: string;
  value: string;
  icon: React.ReactNode;
  /** Status colour for the value, used only when the figure needs attention. */
  valueClassName?: string;
  /** Last-7-days sparkline — only at xl:, where the cards sit in a full-height
   * side column with room for it. */
  trend?: CardTrend;
}

function StatCard({ label, value, icon, valueClassName = 'text-slate-100 admin-light:text-slate-900', trend }: StatCardProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const hasTrend = Boolean(trend && trend.values.length > 1);

  return (
    <div className="relative overflow-hidden bg-[#0E1628] admin-light:bg-white border border-[#1E2D45] admin-light:border-[#E2E8F0] rounded-xl p-3 xl:py-2.5 flex items-center gap-4">
      <div className="w-11 h-11 shrink-0 flex items-center justify-center text-[#62A0EA] admin-light:text-[#1A5FB4]">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] text-slate-500 uppercase tracking-wider xl:leading-tight">{label}</p>
        <p className={`text-lg font-bold truncate xl:leading-6 ${valueClassName}`}>{value}</p>
        {trend && hasTrend && (
          <p className="hidden truncate text-[10px] leading-tight text-slate-500 tabular-nums xl:block">
            {activeIndex === null
              ? trend.caption
              : `${trend.labels[activeIndex]}: ${trend.format(trend.values[activeIndex])}`}
          </p>
        )}
      </div>
      {trend && hasTrend && (
        <Sparkline trend={trend} label={label} activeIndex={activeIndex} onActiveChange={setActiveIndex} />
      )}
    </div>
  );
}

// Matches the scroller's `gap-3`: every page is one scroller width plus this gap apart.
const PAGE_GAP_PX = 12;
const pageOffset = (el: HTMLElement, index: number) => index * (el.clientWidth + PAGE_GAP_PX);

// Matches the filters' collapse transition (`duration-300` in page.tsx), so
// the cards and the filters move together.
const RESIZE_MS = 300;

// Only the swipeable layout below md: changes height; the md:+ grid never does.
const canAnimateResize = () =>
  !window.matchMedia('(min-width: 768px)').matches &&
  !window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Height of the top row of cards on the given page. */
const firstRowHeight = (scroller: HTMLElement, page: number) =>
  (scroller.children[page]?.firstElementChild as HTMLElement | null)?.offsetHeight ?? 0;

/** Transitions `wrapper` from `from`px to `to`px, then runs `onDone`. */
function animateHeight(wrapper: HTMLElement, timer: { current: number | undefined }, from: number, to: number, onDone: () => void) {
  window.clearTimeout(timer.current);
  wrapper.style.height = `${from}px`;
  void wrapper.offsetHeight; // commit the start height so the change transitions
  wrapper.style.height = `${to}px`;
  timer.current = window.setTimeout(onDone, RESIZE_MS);
}

/**
 * Below md: the cards split into pages of `perPage` (4 = a 2x2 grid, 2 = a
 * single row while the filters are collapsed) that swipe horizontally (scroll
 * snap), with dots marking the current one. From md: up the page wrappers
 * dissolve (`display: contents`) so every card sits in one grid: 2 columns at
 * md:, 4 at lg:, and a single column at xl:, where the page puts the cards in
 * a side column beside the table.
 *
 * Switching page size animates the height instead of jumping: a 2x2 page's
 * top row is exactly the matching one-row page, so collapsing clips the lower
 * row away first and only then regroups, and expanding regroups at one-row
 * height and then opens to reveal the second row.
 */
function SummaryPages({ cards, perPage }: { cards: React.ReactNode[]; perPage: number }) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const resizeTimer = useRef<number | undefined>(undefined);
  const [activePage, setActivePage] = useState(0);
  // The page size actually rendered. When shrinking it trails `perPage` until
  // the lower row is out of sight, so the cards never visibly regroup.
  const [shownPerPage, setShownPerPage] = useState(perPage);
  const pages = Array.from({ length: Math.ceil(cards.length / shownPerPage) }, (_, i) =>
    cards.slice(i * shownPerPage, (i + 1) * shownPerPage),
  );

  // Growing regroups straight away (landing on the page that holds the cards
  // that were in view); the layout effect below animates it open.
  if (perPage > shownPerPage) {
    setShownPerPage(perPage);
    setActivePage(Math.floor((activePage * shownPerPage) / perPage));
  }

  useEffect(() => {
    const wrapper = wrapperRef.current;
    const scroller = scrollerRef.current;
    if (!wrapper || !scroller) return;
    if (perPage < shownPerPage) {
      const regroup = () => {
        setActivePage((page) => Math.floor((page * shownPerPage) / perPage));
        setShownPerPage(perPage);
      };
      if (canAnimateResize()) {
        animateHeight(wrapper, resizeTimer, wrapper.offsetHeight, firstRowHeight(scroller, activePage), regroup);
      } else {
        window.clearTimeout(resizeTimer.current);
        resizeTimer.current = window.setTimeout(regroup, 0);
      }
    } else if (wrapper.style.height) {
      // Expanded again before a collapse finished: open back up from wherever it got to.
      animateHeight(wrapper, resizeTimer, wrapper.offsetHeight, scroller.offsetHeight, () => {
        wrapper.style.height = '';
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reacts to a requested page-size change only.
  }, [perPage]);

  const previousShownPerPage = useRef(shownPerPage);
  useLayoutEffect(() => {
    const wrapper = wrapperRef.current;
    const scroller = scrollerRef.current;
    if (!wrapper || !scroller) return;
    const grew = shownPerPage > previousShownPerPage.current;
    previousShownPerPage.current = shownPerPage;
    scroller.scrollLeft = pageOffset(scroller, activePage);
    if (grew && canAnimateResize()) {
      // Runs before paint, so the regrouped 2x2 page never shows at full height first.
      animateHeight(wrapper, resizeTimer, firstRowHeight(scroller, activePage), scroller.offsetHeight, () => {
        wrapper.style.height = '';
      });
    } else {
      // A collapse just regrouped into one row, which fits the clipped height exactly.
      wrapper.style.height = '';
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only on a regroup; following activePage would fight the user's swipe.
  }, [shownPerPage]);

  useEffect(() => () => window.clearTimeout(resizeTimer.current), []);

  const handleScroll = () => {
    const el = scrollerRef.current;
    if (!el || el.clientWidth === 0) return;
    setActivePage(Math.min(pages.length - 1, Math.round(el.scrollLeft / (el.clientWidth + PAGE_GAP_PX))));
  };

  const goToPage = (index: number) => {
    const el = scrollerRef.current;
    el?.scrollTo({ left: pageOffset(el, index), behavior: 'smooth' });
  };

  return (
    // xl: the flex chain lets the single card column stretch to the side
    // column's full height, every row sharing it equally (`auto-rows-fr`).
    <div className="xl:flex xl:flex-1 xl:flex-col">
      <div ref={wrapperRef} className="overflow-hidden transition-[height] duration-300 ease-in-out xl:flex xl:flex-1 xl:flex-col">
        <div
          ref={scrollerRef}
          onScroll={handleScroll}
          className="scrollbar-hide flex snap-x snap-mandatory gap-3 overflow-x-auto md:grid md:snap-none md:grid-cols-2 md:overflow-visible lg:grid-cols-4 xl:flex-1 xl:grid-cols-1 xl:auto-rows-fr xl:gap-2.5"
        >
          {pages.map((page, i) => (
            <div key={i} className="grid w-full shrink-0 snap-start grid-cols-2 gap-3 md:contents">
              {page}
            </div>
          ))}
        </div>
      </div>
      <div className="mt-1 flex justify-center md:hidden">
        {pages.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => goToPage(i)}
            aria-label={`Show summary page ${i + 1} of ${pages.length}`}
            aria-current={activePage === i}
            className="p-1.5"
          >
            <span
              className={`block h-1.5 w-1.5 rounded-full transition-colors ${activePage === i ? 'bg-[#62A0EA] admin-light:bg-[#1A5FB4]' : 'bg-slate-600 admin-light:bg-slate-300'}`}
            />
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * At-a-glance totals for the selected period in the Remittance Tracker.
 *
 * Totals come from the backend's `summary` aggregate (`?summary=1`), computed
 * over every row matching the period rather than only the first page of 20.
 *
 * Passengers, Cash, GCash, Total, Shortage and Overage count only shifts whose
 * cash an admin has declared via the Cash Declaration action (see
 * cash-declaration-modal.tsx), within the period. For Cash Declaration and
 * Overdue count ended shifts still awaiting that count — including an earlier
 * day's carry-over, the same rows the table keeps visible under a range
 * preset — so they carry no period label. Active shifts ("Pending") are never
 * counted as ready for declaration.
 */
export function RemittanceSummary({ selectedDate = '', dateFrom = todayStr(), rangeLabel = 'Today', trendBy = 'day', refreshKey = 0, compact = false }: {
  selectedDate?: string;
  dateFrom?: string;
  rangeLabel?: string;
  /** Sparkline bucket size, picked by the page from the range filter. */
  trendBy?: RemittanceTrendBy;
  /** Bumped by the page after a cash declaration so the cards update right away. */
  refreshKey?: number;
  /** Below md: one row of cards per swipe page instead of two — set while the
   * filters are collapsed so the table gets the extra height. */
  compact?: boolean;
}) {
  // per_page=1: the cards only need the `summary`, not the rows themselves.
  const { summary, isLoading, refreshSilently } = useRemittanceData(1, '', selectedDate, 'All', dateFrom, '', '', 1, trendBy);

  const lastRefreshKey = useRef(refreshKey);
  useEffect(() => {
    if (lastRefreshKey.current === refreshKey) return;
    lastRefreshKey.current = refreshKey;
    void refreshSilently();
  }, [refreshKey, refreshSilently]);

  const perPage = compact ? 2 : 4;
  const periodLabel = selectedDate
    ? new Date(`${selectedDate}T00:00:00`).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })
    : rangeLabel;

  if (isLoading) {
    const skeletons = Array.from({ length: 8 }).map((_, i) => (
      <div key={i} className="h-[76px] xl:h-auto bg-[#0E1628] admin-light:bg-white border border-[#1E2D45] admin-light:border-[#E2E8F0] rounded-xl animate-pulse" />
    ));
    return <SummaryPages cards={skeletons} perPage={perPage} />;
  }

  // No summary means the request failed — show a dash rather than a
  // misleading zero (e.g. "0 Overdue" while shifts are actually overdue).
  const amount = (n: number | undefined) => (summary && n !== undefined ? fmtPHP(n) : '—');
  const count = (n: number | undefined) => (summary && n !== undefined ? String(n) : '—');
  const shortage = summary?.shortage ?? 0;
  const overage = summary?.overage ?? 0;
  const forCashDeclaration = summary?.forCashDeclaration ?? 0;
  const overdue = summary?.overdue ?? 0;
  const collected = (summary?.cash ?? 0) + (summary?.gcash ?? 0);
  // Last-7-days series per card. Undefined while there's no summary, so a
  // failed load shows only the dash.
  const buckets = summary?.trend ?? [];
  const bucketLabels = buckets.map((bucket) => bucketLabel(bucket, trendBy));
  // An exact date's line is the 7 days up to it, not up to today.
  const trendCaption = selectedDate ? `7 days to ${periodLabel}` : TREND_CAPTIONS[trendBy];
  const shiftCount = (n: number) => `${n} shift${n === 1 ? '' : 's'}`;
  const trendOf = (pick: (bucket: RemittanceTrendBucket) => number, format: (n: number) => string): CardTrend | undefined =>
    buckets.length ? { caption: trendCaption, labels: bucketLabels, values: buckets.map(pick), format } : undefined;

  // Collections first, then reconciliation — so the full 2x2 pages split
  // cleanly between the two groups.
  const cards = [
    <StatCard
      key="passengers"
      label={`Passengers (${periodLabel})`}
      value={count(summary?.passengers)}
      icon={<Users size={36} />}
      trend={trendOf((bucket) => bucket.passengers, String)}
    />,
    <StatCard
      key="cash"
      label={`Cash (${periodLabel})`}
      value={amount(summary?.cash)}
      icon={<Banknote size={36} />}
      trend={trendOf((bucket) => bucket.cash, fmtPHP)}
    />,
    <StatCard
      key="gcash"
      label={`GCash (${periodLabel})`}
      value={amount(summary?.gcash)}
      icon={<Smartphone size={36} />}
      trend={trendOf((bucket) => bucket.gcash, fmtPHP)}
    />,
    <StatCard
      key="total"
      label={`Total (${periodLabel})`}
      value={summary ? fmtPHP(collected) : '—'}
      icon={<Wallet size={36} />}
      trend={trendOf((bucket) => bucket.cash + bucket.gcash, fmtPHP)}
    />,
    // Shortage/Overage are signed and coloured the same way as the table's Amount column.
    <StatCard
      key="shortage"
      label={`Shortage (${periodLabel})`}
      value={shortage > 0 ? `−${fmtPHP(shortage)}` : amount(summary?.shortage)}
      icon={<CircleMinus size={36} />}
      trend={trendOf((bucket) => bucket.shortage, fmtPHP)}
      valueClassName={shortage > 0 ? STATUS_TEXT_CLASSES.danger : undefined}
    />,
    <StatCard
      key="overage"
      label={`Overage (${periodLabel})`}
      value={overage > 0 ? `+${fmtPHP(overage)}` : amount(summary?.overage)}
      icon={<CirclePlus size={36} />}
      trend={trendOf((bucket) => bucket.overage, fmtPHP)}
      valueClassName={overage > 0 ? STATUS_TEXT_CLASSES.success : undefined}
    />,
    <StatCard
      key="for-cash-declaration"
      label="For Cash Declaration"
      value={count(summary?.forCashDeclaration)}
      icon={<HandCoins size={36} />}
      trend={trendOf((bucket) => bucket.forCashDeclaration, shiftCount)}
      valueClassName={forCashDeclaration > 0 ? STATUS_TEXT_CLASSES.info : undefined}
    />,
    <StatCard
      key="overdue"
      label="Overdue"
      value={count(summary?.overdue)}
      icon={<ClockAlert size={36} />}
      trend={trendOf((bucket) => bucket.overdue, shiftCount)}
      valueClassName={overdue > 0 ? STATUS_TEXT_CLASSES.warning : undefined}
    />,
  ];

  return <SummaryPages cards={cards} perPage={perPage} />;
}
