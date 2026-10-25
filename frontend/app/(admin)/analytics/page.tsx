// app/(admin)/analytics/page.tsx
'use client';

import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  AlertCircle,
  CalendarDays,
  TrendingUp,
  TrendingDown,
  Minus,
  Smartphone,
  Banknote,
  BarChart3,
  FileText,
  Download,
  ChevronDown,
  Receipt,
} from 'lucide-react';
import {
  useAnalytics,
  computeDelta,
  formatPeso,
  formatNumber,
  formatDateRangeLabel,
  formatShortDate,
  toLocalISODate,
  type AnalyticsData,
  type AnalyticsRange,
} from '@/lib/admin/services/analytics.service';
import { RemittanceTable } from '@/components/admin/analytics/remittance-table';
import { DemandHeatmapData } from '@/components/admin/analytics/demand-heatmap-data';
import { DailyRevenueChart } from '@/components/admin/analytics/daily-revenue-chart';
import { PeakHoursChart } from '@/components/admin/analytics/peak-hours-chart';
import { PerformanceTable } from '@/components/admin/analytics/performance-table';
import { MetricPairTile } from '@/components/admin/analytics/metric-pair-tile';
import {
  REPORTS,
  ReportTable,
  buildConductorsReport,
  buildDailyReport,
  buildGcashReport,
  buildPickupsReport,
  buildRemittanceReport,
  buildUnitsReport,
  exportRows,
  formatCell,
  isReportId,
  type RemittanceRow,
  type ReportId,
  type ReportSpec,
} from '@/components/admin/analytics/report-tables';
import { SkeletonCard } from '@/components/admin/ui/skeleton';
import { StickyPageHeader } from '@/components/admin/layout/sticky-page-header';
import { AdminDatePicker } from '@/components/admin/ui/admin-date-picker';
import { InlineError } from '@/components/admin/ui/inline-error';
import { exportReport, type ReportFormat } from '@/lib/utils/export-report';
import type { AnalyticsRemittance } from './data/analytics-data';

// ═══════════════════════════════════════════════════════════════════════
// TAB TYPE
// ═══════════════════════════════════════════════════════════════════════

type AnalyticsTab = 'overview' | 'reports';

// ═══════════════════════════════════════════════════════════════════════
// QUICK DATE RANGE PRESETS
// ═══════════════════════════════════════════════════════════════════════

type PresetKey = '7d' | '30d' | '90d' | 'custom';

const PRESET_DAYS: Record<Exclude<PresetKey, 'custom'>, number> = {
  '7d': 7,
  '30d': 30,
  '90d': 90,
};

/**
 * Build the range for a preset.
 *
 * Uses local date parts, NOT toISOString(). The latter converts to UTC, so
 * in Manila (UTC+8) every call before 08:00 local produced yesterday's date
 * and silently excluded the current day from every preset window.
 */
function presetToRange(preset: PresetKey): AnalyticsRange {
  if (preset === 'custom') return {};
  const today = new Date();
  const from = new Date(today);
  from.setDate(from.getDate() - (PRESET_DAYS[preset] - 1));
  return { date_from: toLocalISODate(from), date_to: toLocalISODate(today) };
}

// ═══════════════════════════════════════════════════════════════════════
// METRIC CARD
// ═══════════════════════════════════════════════════════════════════════

function DeltaBadge({ current, previous }: { current: number; previous: number }) {
  const { pct, direction } = computeDelta(current, previous);

  if (pct === null) {
    return (
      <span className="text-[10px] text-slate-600 admin-light:text-slate-500" title="No data in the preceding period to compare against">
        no prior data
      </span>
    );
  }

  const Icon = direction === 'up' ? TrendingUp : direction === 'down' ? TrendingDown : Minus;
  return (
    <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-slate-500 admin-light:text-slate-600">
      <Icon size={11} />
      {Math.abs(pct).toFixed(1)}%
    </span>
  );
}

function MetricCard({
  label,
  value,
  sublabel,
  icon: Icon,
  current,
  previous,
  emphasis = false,
}: {
  label: string;
  value: string;
  sublabel?: string;
  icon: React.ElementType;
  /** Supply both to render a period-over-period delta. */
  current?: number;
  previous?: number;
  /** The headline card: larger figure. */
  emphasis?: boolean;
}) {
  return (
    <div className="h-full min-w-0 flex flex-col gap-1.5 rounded-lg border border-[#1E2D45] admin-light:border-[#E2E8F0] bg-[#131C2E] admin-light:bg-white px-5 py-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 admin-light:text-slate-500">{label}</p>
        <Icon size={18} aria-hidden="true" className="shrink-0 text-slate-500" />
      </div>
      {/* title carries the full value: the truncate here used to clip large
          peso figures on narrow/mobile cards with no way to read them. */}
      <p className={`${emphasis ? 'text-2xl sm:text-3xl' : 'text-xl sm:text-2xl'} font-bold leading-tight tabular-nums text-white admin-light:text-slate-900 truncate`} title={value}>{value}</p>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
        {current !== undefined && previous !== undefined && (
          <DeltaBadge current={current} previous={previous} />
        )}
        {sublabel && <p className="text-xs text-slate-400 admin-light:text-slate-500 truncate">{sublabel}</p>}
      </div>
    </div>
  );
}

/** 545 → "9h 5m"; under an hour → "45m". */
function formatMinutes(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return hours > 0 ? `${hours}h ${rest}m` : `${rest}m`;
}

/** Overview panel surface. */
const PANEL = 'bg-[#131C2E] admin-light:bg-white border border-[#1E2D45] admin-light:border-[#E2E8F0] rounded-lg p-5';
/** Chart beside a column of two tiles; both columns share the row's height. */
const ROW_CHART_TILES = 'grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]';

// A small uppercase "eyebrow" that groups a block of cards under a named
// category — the dashboard used to lay all 8 KPI tiles out as two visually
// identical rows with nothing distinguishing "money" from "operations to
// watch."
function SectionEyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#62A0EA]" />
      <h2 className="text-xs font-semibold text-slate-400 admin-light:text-slate-500 uppercase tracking-wider">{children}</h2>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// REPORTS TAB
// ═══════════════════════════════════════════════════════════════════════

function useRemittanceRows(range: AnalyticsRange, enabled: boolean) {
  const [rows, setRows] = useState<RemittanceRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Tracks the range this hook has already fetched (or is fetching) for,
  // so switching back to the Reports tab without changing the date range
  // doesn't re-fire the request.
  const fetchedRangeKey = useRef<string | null>(null);

  const fetchRows = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ per_page: '500' });
      if (range.date_from) params.set('date_from', range.date_from);
      if (range.date_to) params.set('date_to', range.date_to);
      const res = await fetch(`/api/admin/remittances?${params}`, { headers: { Accept: 'application/json' } });
      if (!res.ok) throw new Error('Failed to fetch remittances');
      const json = await res.json();
      const payload = json.data;
      const records = Array.isArray(payload) ? payload : payload?.data ?? [];
      // The API serializes decimal columns (cash_total, gcash_total) as JSON
      // strings, not numbers. Left uncoerced, `r.cash_total + r.gcash_total`
      // downstream does string concatenation ("57.75" + "0.00" ->
      // "57.750.00") instead of addition, which then cascades into every
      // running total. Coerce once here so the rest of the tab can trust
      // these are numbers.
      const normalized = (Array.isArray(records) ? records : []).map((r: Record<string, unknown>) => ({
        ...r,
        cash_total: Number(r.cash_total) || 0,
        gcash_total: Number(r.gcash_total) || 0,
        remitted_amount: Number(r.remitted_amount) || 0,
        shortage: Number(r.shortage) || 0,
        overage: Number(r.overage) || 0,
        total_passengers: Number(r.total_passengers) || 0,
      }));
      setRows(normalized as RemittanceRow[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load remittances');
    } finally {
      setIsLoading(false);
    }
  }, [range.date_from, range.date_to]);

  // Only fetches while the Reports tab (the only consumer of this data) is
  // active. Loading it on the Overview tab was pure waste: a full
  // /api/admin/remittances request with eager-loaded relations that
  // Overview never renders.
  useEffect(() => {
    if (!enabled) return;
    const rangeKey = `${range.date_from ?? ''}|${range.date_to ?? ''}`;
    if (fetchedRangeKey.current === rangeKey) return;
    fetchedRangeKey.current = rangeKey;
    fetchRows();
  }, [enabled, range.date_from, range.date_to, fetchRows]);

  return { rows, isLoading, error, refetch: fetchRows };
}

function ReportsLoading() {
  return <SkeletonCard count={1} height="560px" adminThemed />;
}

function ReportsError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <AlertCircle className="h-12 w-12 text-red-400 admin-light:text-red-600 mb-4" />
      <p className="text-sm text-slate-400 admin-light:text-slate-500 mb-4">{message}</p>
      <button
        onClick={onRetry}
        className="px-4 py-2 bg-[#62A0EA] admin-light:bg-[#1A5FB4] hover:bg-[#99C1F1] admin-light:hover:bg-[#164A8F] text-white rounded-md text-sm font-medium transition-colors"
      >
        Try Again
      </button>
    </div>
  );
}

/**
 * One report at a time, picked from the switcher. The remittance report has
 * its own fetch (/admin/remittances); every other report reads the analytics
 * payload the Overview already loaded. The parent builds `spec` so the Export
 * button downloads exactly the report on screen.
 */
function ReportsTab({
  report,
  onReportChange,
  rangeLabel,
  spec,
  analyticsData,
  analyticsLoading,
  analyticsError,
  refetchAnalytics,
  range,
  scopedRows,
  remittanceLoading,
  remittanceError,
  refetchRemittances,
}: {
  report: ReportId;
  onReportChange: (report: ReportId) => void;
  /** The selected window, shown at the right end of the switcher row. */
  rangeLabel: string | null;
  spec: ReportSpec | null;
  analyticsData: AnalyticsData | null;
  analyticsLoading: boolean;
  analyticsError: string | null;
  refetchAnalytics: () => void;
  range: AnalyticsRange;
  /** Remittance rows already fetched + date-scoped by the parent. */
  scopedRows: RemittanceRow[];
  remittanceLoading: boolean;
  remittanceError: string | null;
  refetchRemittances: () => void;
}) {
  const remittanceTableData: AnalyticsRemittance[] = useMemo(() => {
    return scopedRows.map(r => ({
      shiftId: r.shift_id,
      conductor: r.conductor_name ?? '—',
      unit: r.unit_number ?? '—',
      date: r.date ?? '—',
      cashAmount: r.cash_total,
      gcashAmount: r.gcash_total,
      remittedAmount: r.remittance_status === 'PENDING' ? null : r.remitted_amount,
      shortage: r.shortage,
      overage: r.overage,
      status: r.remittance_status,
    }));
  }, [scopedRows]);

  const isRemittance = report === 'remittance';
  const isLoading = isRemittance ? remittanceLoading : analyticsLoading;
  const error = isRemittance ? remittanceError : analyticsError;

  let body: React.ReactNode;
  if (isLoading) {
    body = <ReportsLoading />;
  } else if (error) {
    body = <ReportsError message={error} onRetry={isRemittance ? refetchRemittances : refetchAnalytics} />;
  } else if (isRemittance) {
    body = <RemittanceTable data={remittanceTableData} dateFrom={range.date_from} dateTo={range.date_to} />;
  } else if (report === 'pickups') {
    body = <DemandHeatmapData zones={analyticsData?.heatmap_zones ?? []} />;
  } else {
    body = spec && <ReportTable spec={spec} />;
  }

  return (
    <div className="space-y-4 lg:flex lg:flex-col lg:flex-1 lg:min-h-0">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between lg:gap-4">
        {/* Below md the switcher scrolls sideways, bleeding to the screen edge
            like the Overview revenue cards. */}
        <div className="-mx-4 px-4 md:mx-0 md:px-0 overflow-x-auto scrollbar-hide min-w-0">
          <div role="tablist" aria-label="Report" className="inline-flex items-center gap-1 bg-[#0E1628] admin-light:bg-white p-1 rounded-md border border-[#1E2D45] admin-light:border-[#E2E8F0]">
            {REPORTS.map(item => (
              <button
                key={item.id}
                role="tab"
                aria-selected={report === item.id}
                onClick={() => onReportChange(item.id)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
                  report === item.id
                    ? 'bg-[#62A0EA] admin-light:bg-[#1A5FB4] text-white'
                    : 'text-slate-400 hover:text-white admin-light:text-slate-600 admin-light:hover:text-slate-900'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
      </div>

      {rangeLabel && (
        <p className="flex shrink-0 items-center gap-1.5 text-sm text-slate-400 admin-light:text-slate-500">
          <CalendarDays size={14} className="text-slate-500 shrink-0" />
          {rangeLabel}
        </p>
      )}
      </div>

      {body}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// OVERVIEW TAB
// ═══════════════════════════════════════════════════════════════════════

function OverviewTab({
  data,
  isLoading,
  error,
  refetch,
}: {
  data: AnalyticsData | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}) {
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <SkeletonCard count={4} height="112px" adminThemed />
        </div>
        <div className={ROW_CHART_TILES}>
          <SkeletonCard count={1} height="470px" adminThemed />
          <div className="grid gap-6 lg:grid-rows-2">
            <SkeletonCard count={2} height="223px" adminThemed />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <AlertCircle className="h-12 w-12 text-red-400 admin-light:text-red-600 mb-4" />
        <p className="text-sm text-slate-400 admin-light:text-slate-500 mb-4">{error}</p>
        <button
          onClick={() => refetch()}
          className="px-4 py-2 bg-[#62A0EA] admin-light:bg-[#1A5FB4] hover:bg-[#99C1F1] admin-light:hover:bg-[#164A8F] text-white rounded-md text-sm font-medium transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (!data) return null;

  const prev = data.previous_totals;
  const health = data.gcash_health;

  const hasShortage = data.remittances.total_shortage > 0;
  // Each method's share of revenue (voucher rides are free, so excluded).
  const revenueShare = (amount: number) =>
    data.totals.total_fares > 0 ? ` · ${((amount / data.totals.total_fares) * 100).toFixed(1)}% of revenue` : '';

  const remittances = data.remittances;
  const bestDay = data.daily_series.reduce<AnalyticsData['daily_series'][number] | null>(
    (best, day) => (day.total > 0 && (!best || day.total > best.total) ? day : best),
    null,
  );

  return (
    <div className="space-y-6">
      {/* ── Revenue: the range-scoped money metrics, with period-over-period
          deltas. Total Fares leads and is the widest. ── */}
      <div className="grid lg:grid-cols-[1.5fr_1fr_1fr_1fr] gap-4">
        <MetricCard
          label="Total Fares" value={formatPeso(data.totals.total_fares)}
          sublabel={data.totals.discount_total > 0 ? `after ${formatPeso(data.totals.discount_total)} in discounts` : 'no discounts given'}
          icon={TrendingUp} emphasis
          current={data.totals.total_fares} previous={prev.total_fares}
        />
        {/* Below lg the other three are one equal-width swipe row that bleeds
            to the screen edge (offsets match the admin main's p-4 / md:p-6),
            with the next card peeking in. At lg the wrapper is `contents`, so
            the cards become ordinary cells of the four-column grid. */}
        <div className="-mx-4 px-4 md:-mx-6 md:px-6 scroll-px-4 md:scroll-px-6 flex gap-4 overflow-x-auto snap-x snap-mandatory scrollbar-hide lg:contents">
          {[
            { label: 'Cash Total', value: data.totals.cash_total, previous: prev.cash_total, icon: Banknote, sublabel: `${data.payment_split.cash.count} rides${revenueShare(data.totals.cash_total)}` },
            { label: 'GCash Total', value: data.totals.gcash_total, previous: prev.gcash_total, icon: Smartphone, sublabel: `${data.payment_split.gcash.count} rides${revenueShare(data.totals.gcash_total)}` },
            { label: 'Avg Fare', value: data.totals.avg_fare, previous: prev.avg_fare, icon: Receipt, sublabel: 'per paying passenger' },
          ].map(card => (
            <div key={card.label} className="w-[72%] sm:w-[44%] shrink-0 snap-start lg:w-auto">
              <MetricCard
                label={card.label} value={formatPeso(card.value)}
                sublabel={card.sublabel} icon={card.icon}
                current={card.value} previous={card.previous}
              />
            </div>
          ))}
        </div>
      </div>

      {/* ── Bento rows. Each row is one grid whose items stretch to the
          tallest cell, so panel edges always line up — including when the
          chart's "View as table" opens. ── */}
      <div className={ROW_CHART_TILES}>
        <section className={`${PANEL} min-w-0 flex flex-col`}>
          <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
            <div className="min-w-0">
              <h2 className="text-lg font-bold text-white admin-light:text-slate-900">Daily Revenue</h2>
              <p className="text-xs text-slate-400 admin-light:text-slate-500">
                {bestDay ? `Best day ${formatShortDate(bestDay.date)} · ${formatPeso(bestDay.total)}` : 'Cash and GCash fares per day'}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 admin-light:text-slate-500">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-[#475569] admin-light:bg-[#94A3B8]" />Cash</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-[#62A0EA] admin-light:bg-[#1A5FB4]" />GCash</span>
              <span className="flex items-center gap-1.5"><span className="w-4 h-0.5 bg-[#E2E8F0] admin-light:bg-[#334155]" />7-day avg</span>
            </div>
          </div>
          <DailyRevenueChart data={data.daily_series} height={300} />
        </section>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-1 lg:grid-rows-2">
          <MetricPairTile
            title="Cash in Transit"
            main={{
              label: 'Awaiting remittance',
              value: formatPeso(remittances.awaiting_amount),
              note: remittances.awaiting_count > 0
                ? `${formatNumber(remittances.awaiting_count)} ${remittances.awaiting_count === 1 ? 'shift' : 'shifts'} not yet remitted`
                : 'all shifts remitted',
            }}
            second={{
              label: 'Shortage',
              value: formatPeso(remittances.total_shortage),
              note: hasShortage ? `${remittances.shortage_rate}% of collected` : 'no shortage',
            }}
          />
          <MetricPairTile
            title="Safety"
            main={{
              label: 'SOS alerts',
              value: formatNumber(data.safety.sos_alerts),
              note: data.safety.sos_alerts === 0 ? 'none raised' : data.safety.sos_open > 0 ? `${formatNumber(data.safety.sos_open)} still open` : 'all resolved',
            }}
            second={{
              label: 'Overspeeding',
              value: formatNumber(data.safety.overspeed_episodes),
              note: data.safety.overspeed_top_speed === null ? 'none recorded' : `top speed ${data.safety.overspeed_top_speed} km/h`,
            }}
          />
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)]">
        <section className={`${PANEL} min-w-0 sm:col-span-2 lg:col-span-1`}>
          <h2 className="text-lg font-bold text-white admin-light:text-slate-900 mb-1">Peak Hours</h2>
          <p className="text-xs text-slate-400 admin-light:text-slate-500 mb-4">Rides by hour of day; the three busiest hours are highlighted</p>
          <PeakHoursChart data={data.hourly_series} />
        </section>
        <MetricPairTile
          title="Riders & Payments"
          main={{
            label: 'Passengers',
            value: formatNumber(data.totals.total_passengers),
            note: `incl. ${formatNumber(data.totals.voucher_count)} voucher rides`,
          }}
          mainDelta={<DeltaBadge current={data.totals.total_passengers} previous={prev.total_passengers} />}
          second={{
            label: 'GCash success',
            value: health.success_rate === null ? '—' : `${health.success_rate}%`,
            note: health.success_rate === null ? 'no gateway attempts' : `${formatNumber(health.failed + health.expired + health.cancelled)} unsettled`,
          }}
        />
        <MetricPairTile
          title="Service"
          main={{
            label: 'Driver rating',
            value: data.service.driver_rating === null ? '—' : `${data.service.driver_rating.toFixed(1)} / 5`,
            note: data.service.review_count === 0
              ? 'no reviews yet'
              : `${data.service.conductor_rating === null ? 'conductor not rated' : `conductor ${data.service.conductor_rating.toFixed(1)}`} · ${formatNumber(data.service.review_count)} ${data.service.review_count === 1 ? 'review' : 'reviews'}`,
          }}
          second={{
            label: 'Shifts run',
            value: formatNumber(data.service.shifts_run),
            note: data.service.avg_shift_minutes === null ? 'none ended yet' : `avg ${formatMinutes(data.service.avg_shift_minutes)} per shift`,
          }}
        />
      </div>

      {/* ── Who earned it: fare revenue per unit and per conductor, ranked.
          Revenue uses the same window as Total Fares, so each table sums to it. ── */}
      <div className="space-y-3">
        <SectionEyebrow>Unit &amp; Conductor Performance</SectionEyebrow>
        <div className="grid lg:grid-cols-2 gap-6">
          <PerformanceTable
            title="Revenue by Unit"
            nameLabel="Unit"
            rows={data.performance.units.map(unit => ({ id: unit.vehicle_id, name: unit.unit_number, detail: unit.plate_number, shifts: unit.shifts, passengers: unit.passengers, revenue: unit.revenue }))}
            emptyMessage="No shifts in this date range."
          />
          <PerformanceTable
            title="Revenue by Conductor"
            nameLabel="Conductor"
            rows={data.performance.conductors.map(conductor => ({ id: conductor.conductor_id, name: conductor.name, shifts: conductor.shifts, passengers: conductor.passengers, revenue: conductor.revenue }))}
            emptyMessage="No shifts in this date range."
          />
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════════════

export default function AnalyticsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Range + tab live in the URL so a view can be linked, bookmarked, and
  // survives a reload.
  const urlPreset = searchParams.get('preset') as PresetKey | null;
  const urlTab = searchParams.get('tab') as AnalyticsTab | null;

  const [activeTab, setActiveTab] = useState<AnalyticsTab>(
    urlTab === 'reports' ? 'reports' : 'overview'
  );
  const [preset, setPreset] = useState<PresetKey>(
    urlPreset && ['7d', '30d', '90d', 'custom'].includes(urlPreset) ? urlPreset : '30d'
  );
  const [customFrom, setCustomFrom] = useState(searchParams.get('from') ?? '');
  const [customTo, setCustomTo] = useState(searchParams.get('to') ?? '');
  const urlReport = searchParams.get('report');
  const [report, setReport] = useState<ReportId>(isReportId(urlReport) ? urlReport : 'remittance');

  // Guard the custom range: an inverted from/to would silently return an
  // empty window with no explanation.
  const rangeInvalid = preset === 'custom' && !!customFrom && !!customTo && customFrom > customTo;
  const customIncomplete = preset === 'custom' && !customFrom && !customTo;

  // The range the user is asking for, or null while Custom has no usable
  // dates yet (none picked, or reversed).
  const requestedRange: AnalyticsRange | null = useMemo(() => {
    if (preset === 'custom') {
      if (rangeInvalid || customIncomplete) return null;
      // One date picked (either picker) means that single day.
      return { date_from: customFrom || customTo, date_to: customTo || customFrom };
    }
    return presetToRange(preset);
  }, [preset, customFrom, customTo, rangeInvalid, customIncomplete]);

  // The range actually loaded. Picking Custom without dates keeps the
  // previous range instead of reloading the backend's 30-day default, so
  // nothing loads until a date is chosen. (State adjusted during render, the
  // React-documented way to follow a changing value without an effect.)
  const [range, setRange] = useState<AnalyticsRange>(requestedRange ?? {});
  if (requestedRange && (requestedRange.date_from !== range.date_from || requestedRange.date_to !== range.date_to)) {
    setRange(requestedRange);
  }

  // Mirror state into the URL without pushing history entries for every click.
  useEffect(() => {
    const p = new URLSearchParams();
    p.set('tab', activeTab);
    if (activeTab === 'reports') p.set('report', report);
    p.set('preset', preset);
    if (preset === 'custom') {
      if (customFrom) p.set('from', customFrom);
      if (customTo) p.set('to', customTo);
    }
    router.replace(`?${p.toString()}`, { scroll: false });
  }, [activeTab, report, preset, customFrom, customTo, router]);

  const { data, isLoading, error, refetch } = useAnalytics(range);

  // Remittance data + the Export button live up here (not inside ReportsTab)
  // so the button can sit in the shared filter row, beside the day-range
  // presets, instead of its own row inside the Reports tab body. Only the
  // Shift Remittance report reads these rows, so only it fetches them.
  const {
    rows: remittanceRows,
    isLoading: isLoadingRemittances,
    error: remittanceError,
    refetch: refetchRemittances,
  } = useRemittanceRows(range, activeTab === 'reports' && report === 'remittance');
  const dateFrom = range.date_from;
  const dateTo = range.date_to;

  // Scope remittances to the selected window. The table used to show every
  // remittance ever recorded while the three panels beside it were range
  // filtered, so the tab silently mixed two different periods. The backend
  // also receives the range; this guard keeps proxy variants safe.
  const scopedRows = useMemo(() => {
    if (!dateFrom && !dateTo) return remittanceRows;
    return remittanceRows.filter(r => {
      if (!r.date) return false;
      if (dateFrom && r.date < dateFrom) return false;
      if (dateTo && r.date > dateTo) return false;
      return true;
    });
  }, [remittanceRows, dateFrom, dateTo]);

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

  // The report on screen, as columns + raw rows: the table renders it and
  // every export format writes it, so an export always matches the screen.
  const reportSpec: ReportSpec | null = useMemo(() => {
    if (report === 'remittance') return buildRemittanceReport(scopedRows);
    if (!data) return null;
    const builders = {
      daily: buildDailyReport,
      units: buildUnitsReport,
      conductors: buildConductorsReport,
      pickups: buildPickupsReport,
      gcash: buildGcashReport,
    };
    return builders[report](data);
  }, [report, scopedRows, data]);

  const reportBusy = report === 'remittance' ? isLoadingRemittances : isLoading;
  const exportRowCount = reportBusy || !reportSpec ? 0 : reportSpec.rows.length;
  const exportFileName = `chatco-${report}-${dateFrom ?? 'all'}-to-${dateTo ?? 'all'}`;

  const handleExportCSV = useCallback(() => {
    if (!reportSpec) return;
    const headers = reportSpec.columns.map(column => column.label);
    const body = exportRows(reportSpec).map(row => row.map((value, i) => formatCell(reportSpec.columns[i].kind, value, 'csv')));

    const esc = (v: string) => `"${String(v).replace(/"/g, '""')}"`;
    const csv = [headers.map(esc).join(','), ...body.map(row => row.map(esc).join(','))].join('\n');

    // BOM so Excel reads UTF-8 correctly (matches the Receipts export).
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${exportFileName}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [reportSpec, exportFileName]);

  const handleReportExport = useCallback((format: ReportFormat) => {
    if (!reportSpec) return;
    exportReport({
      title: `CHATCO ${reportSpec.title}`,
      fileName: exportFileName,
      format,
      headers: reportSpec.columns.map(column => column.label),
      rows: exportRows(reportSpec).map(row => row.map((value, i) => formatCell(reportSpec.columns[i].kind, value, 'doc'))),
    });
  }, [reportSpec, exportFileName]);

  return (
    // Reports on lg: the page is exactly <main>'s height, so the report
    // panel below can stretch to the bottom instead of leaving empty space.
    <div className={`space-y-6 ${activeTab === 'reports' ? 'lg:flex lg:flex-col lg:h-full' : ''}`}>
      <StickyPageHeader>
        <h1 className="text-2xl font-bold text-white admin-light:text-slate-900">Financial &amp; Operations Analytics</h1>
      </StickyPageHeader>

      {/* On the Reports tab the range moves to the right of the report
          switcher, so this row only remains for a reversed custom range. */}
      {(activeTab !== 'reports' || rangeInvalid) && (
        <div className="-mt-4 md:mt-0 space-y-1 min-w-0">
          {activeTab !== 'reports' && (
            <div className="flex items-center gap-1.5 min-w-0 text-sm text-slate-400 admin-light:text-slate-500">
              {data ? (
                <>
                  <CalendarDays size={14} className="text-slate-500 shrink-0" />
                  <span className="truncate">
                    {formatDateRangeLabel(data.date_range.from, data.date_range.to)}
                    <span className="text-slate-600 admin-light:text-slate-500"> · vs </span>
                    {formatDateRangeLabel(data.previous_range.from, data.previous_range.to)}
                  </span>
                </>
              ) : (
                <span className="truncate">Conductor remittances, payment breakdowns, and commuter demand.</span>
              )}
            </div>
          )}

          {/* Custom-range feedback, under the range it explains. Selecting
              "Custom" used to fall back to the backend's 30-day default while
              the UI still showed Custom selected. A reversed range is an
              error (red); an unfinished pick keeps the previous range. */}
          {rangeInvalid && (
            <InlineError className="pl-5">The start date is after the end date. The previous range stays on screen until it is fixed.</InlineError>
          )}
        </div>
      )}

      {/* Tabs + range control share one row: tabs on the left, filters
          flush right against the same border. The range control still
          applies to BOTH tabs. */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-[#1E2D45] admin-light:border-[#E2E8F0]">
        <div className="flex space-x-1">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex items-center space-x-2 py-2.5 px-4 font-medium text-sm rounded-t-md transition-colors ${
              activeTab === 'overview'
                ? 'text-white admin-light:text-slate-900 border-b-2 border-[#62A0EA] admin-light:border-[#1A5FB4]'
                : 'text-slate-400 admin-light:text-slate-500 hover:text-white admin-light:hover:text-slate-900 hover:bg-[#1A2540] admin-light:hover:bg-[#EEF2F7]'
            }`}
          >
            <BarChart3 size={18} />
            <span>Overview</span>
          </button>
          <button
            onClick={() => setActiveTab('reports')}
            className={`flex items-center space-x-2 py-2.5 px-4 font-medium text-sm rounded-t-md transition-colors ${
              activeTab === 'reports'
                ? 'text-white admin-light:text-slate-900 border-b-2 border-[#62A0EA] admin-light:border-[#1A5FB4]'
                : 'text-slate-400 admin-light:text-slate-500 hover:text-white admin-light:hover:text-slate-900 hover:bg-[#1A2540] admin-light:hover:bg-[#EEF2F7]'
            }`}
          >
            <FileText size={18} />
            <span>Detailed Reports</span>
          </button>
        </div>

        <div className="flex items-center gap-2 flex-wrap pb-2 lg:pb-2.5">
          <div className="flex items-center gap-1 bg-[#0E1628] admin-light:bg-white p-1 rounded-md border border-[#1E2D45] admin-light:border-[#E2E8F0]">
            {(['7d', '30d', '90d', 'custom'] as PresetKey[]).map(p => (
              <button
                key={p}
                onClick={() => setPreset(p)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  preset === p ? 'bg-[#62A0EA] admin-light:bg-[#1A5FB4] text-white' : 'text-slate-500 hover:text-slate-300 admin-light:text-slate-700 admin-light:hover:text-slate-700'
                }`}
              >
                {p === '7d' ? '7 Days' : p === '30d' ? '30 Days' : p === '90d' ? '90 Days' : 'Custom'}
              </button>
            ))}
          </div>

          {preset === 'custom' && (
            // Below lg the range spans the full width, the two dates sharing it equally.
            <div className="flex w-full items-center gap-2 lg:w-auto lg:gap-1">
              <AdminDatePicker
                value={customFrom}
                onChange={setCustomFrom}
                ariaLabel="Range start date"
                clearLabel="Clear start date"
                max={customTo || undefined}
                popover
                yearNavigation
                triggerClassName="h-9 w-full"
                className="min-w-0 flex-1 lg:w-36 lg:flex-none"
              />
              <span className="shrink-0 text-slate-500 text-xs">to</span>
              <AdminDatePicker
                value={customTo}
                onChange={setCustomTo}
                ariaLabel="Range end date"
                clearLabel="Clear end date"
                min={customFrom || undefined}
                popover
                yearNavigation
                align="right"
                triggerClassName="h-9 w-full"
                className="min-w-0 flex-1 lg:w-36 lg:flex-none"
              />
            </div>
          )}

          {/* Export lives here (Reports tab only) so it sits beside the
              day-range presets — days first (leftmost), export after —
              instead of its own row inside the tab body below. */}
          {activeTab === 'reports' && (
            <div className="relative" ref={exportMenuRef}>
              <button
                onClick={() => setIsExportOpen((open) => !open)}
                disabled={exportRowCount === 0}
                title={`Export ${reportSpec?.title ?? 'report'}`}
                aria-haspopup="menu"
                aria-expanded={isExportOpen}
                className="flex items-center gap-1.5 px-2.5 py-2 bg-[#62A0EA] admin-light:bg-[#1A5FB4] text-white text-xs font-medium rounded-md hover:bg-[#4A8BD4] admin-light:hover:bg-[#164A8F] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Download size={13} />
                <span>Export</span>
                <ChevronDown size={13} className={`transition-transform duration-200 ${isExportOpen ? 'rotate-180' : ''}`} />
              </button>

              {isExportOpen && (
                <div
                  role="menu"
                  className="absolute right-0 top-full mt-2 w-32 bg-[#131C2E] admin-light:bg-white border border-[#1E2D45] admin-light:border-[#E2E8F0] rounded-md shadow-2xl shadow-black/50 overflow-hidden z-20"
                >
                  <button
                    role="menuitem"
                    onClick={() => { handleExportCSV(); setIsExportOpen(false); }}
                    title={`Export ${reportSpec?.title ?? 'report'} to CSV`}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-slate-300 admin-light:text-slate-700 hover:bg-[#1A2540] admin-light:hover:bg-[#EEF2F7] hover:text-white admin-light:hover:text-slate-900 transition-colors"
                  >
                    <Download size={13} className="text-slate-500" />
                    <span>CSV</span>
                  </button>
                  {(['pdf', 'excel', 'word'] as const).map((format) => (
                    <button
                      key={format}
                      role="menuitem"
                      onClick={() => { handleReportExport(format); setIsExportOpen(false); }}
                      title={`Export ${reportSpec?.title ?? 'report'} to ${format.toUpperCase()}`}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-slate-300 admin-light:text-slate-700 hover:bg-[#1A2540] admin-light:hover:bg-[#EEF2F7] hover:text-white admin-light:hover:text-slate-900 transition-colors"
                    >
                      <Download size={13} className="text-slate-500" />
                      <span>{format === 'pdf' ? 'PDF' : format === 'excel' ? 'Excel' : 'Word'}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {activeTab === 'overview' ? (
        <OverviewTab data={data} isLoading={isLoading} error={error} refetch={refetch} />
      ) : (
        <ReportsTab
          report={report}
          onReportChange={setReport}
          rangeLabel={data ? formatDateRangeLabel(data.date_range.from, data.date_range.to) : null}
          spec={reportSpec}
          analyticsData={data}
          analyticsLoading={isLoading}
          analyticsError={error}
          refetchAnalytics={refetch}
          range={range}
          scopedRows={scopedRows}
          remittanceLoading={isLoadingRemittances}
          remittanceError={remittanceError}
          refetchRemittances={refetchRemittances}
        />
      )}
    </div>
  );
}
