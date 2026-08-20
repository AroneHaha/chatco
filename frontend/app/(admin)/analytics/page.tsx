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
  Users,
  Car,
  Banknote,
  Clock,
  AlertTriangle,
  BarChart3,
  FileText,
  Download,
  ChevronDown,
  Receipt,
  ShieldCheck,
} from 'lucide-react';
import {
  useAnalytics,
  computeDelta,
  formatPeso,
  formatNumber,
  formatDateRangeLabel,
  toLocalISODate,
  type AnalyticsData,
  type AnalyticsRange,
} from '@/lib/admin/services/analytics.service';
import { RemittanceTable } from '@/components/admin/analytics/remittance-table';
import { PaymentUsageTable } from '@/components/admin/analytics/payment-usage-table';
import { PickupPointsList } from '@/components/admin/analytics/pickup-points-list';
import { DemandHeatmapData } from '@/components/admin/analytics/demand-heatmap-data';
import { DailyRevenueChart } from '@/components/admin/analytics/daily-revenue-chart';
import { PeakHoursChart } from '@/components/admin/analytics/peak-hours-chart';
import type { PickupPoint } from '@/app/(admin)/analytics/data/analytics-data';
import { SkeletonCard } from '@/components/admin/ui/skeleton';
import { StickyPageHeader } from '@/components/admin/layout/sticky-page-header';
import { exportReport, type ReportFormat } from '@/lib/utils/export-report';
import type {
  AnalyticsRemittance,
  PaymentMethodUsage,
} from './data/analytics-data';

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
      <span className="text-[10px] text-slate-600" title="No data in the preceding period to compare against">
        no prior data
      </span>
    );
  }

  const Icon = direction === 'up' ? TrendingUp : direction === 'down' ? TrendingDown : Minus;
  const tone =
    direction === 'flat'
      ? 'text-slate-500'
      : direction === 'up'
        ? 'text-emerald-400'
        : 'text-red-400';

  return (
    <span className={`inline-flex items-center gap-0.5 text-[10px] font-medium ${tone}`}>
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
  color,
  current,
  previous,
}: {
  label: string;
  value: string;
  sublabel?: string;
  icon: React.ElementType;
  color: string;
  /** Supply both to render a period-over-period delta. */
  current?: number;
  previous?: number;
}) {
  return (
    <div className="bg-[#131C2E] border border-[#1E2D45] rounded-lg p-4 flex items-center space-x-4">
      <div className={`p-3 bg-[#0E1628] rounded-full ${color} flex-shrink-0`}>
        <Icon size={22} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">{label}</p>
        {/* title carries the full value: the truncate here used to clip large
            peso figures on narrow/mobile cards with no way to read them. */}
        <p className="text-xl font-bold text-white truncate" title={value}>{value}</p>
        <div className="flex items-center gap-1.5 mt-0.5">
          {current !== undefined && previous !== undefined && (
            <DeltaBadge current={current} previous={previous} />
          )}
          {sublabel && <p className="text-xs text-slate-500 truncate">{sublabel}</p>}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// PAYMENT SPLIT DONUT
// ═══════════════════════════════════════════════════════════════════════

function PaymentSplitDonut({ data }: { data: AnalyticsData['payment_split'] }) {
  const cashTotal = data.cash.total;
  const gcashTotal = data.gcash.total;
  const grandTotal = cashTotal + gcashTotal;

  // Ride counts include vouchers; revenue does not (voucher fares are ₱0).
  // The ring is drawn by revenue share, so voucher sits outside it and is
  // reported as a separate row instead of being silently dropped.
  const totalRides = data.cash.count + data.gcash.count + data.voucher.count;

  const cashPct = grandTotal > 0 ? (cashTotal / grandTotal) * 100 : 0;
  const gcashPct = grandTotal > 0 ? (gcashTotal / grandTotal) * 100 : 0;

  if (totalRides === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-center text-slate-600 text-sm">
        No paid transactions in this date range.
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col justify-center gap-6 sm:flex-row sm:items-center w-full">
      {/* Decorative: every value in the ring is stated in the legend beside
          it, and a conic-gradient div is unreadable to assistive tech. */}
      <div className="relative w-40 h-40 flex-shrink-0 mx-auto sm:mx-0" aria-hidden="true">
        <div
          className="w-full h-full rounded-full"
          style={{
            background: `conic-gradient(#10b981 0% ${cashPct}%, #3b82f6 ${cashPct}% 100%)`,
          }}
        />
        <div className="absolute inset-5 bg-[#131C2E] rounded-full flex items-center justify-center">
          <div className="text-center">
            <p className="text-[10px] text-slate-500 uppercase tracking-wider">Rides</p>
            <p className="text-2xl font-bold text-white">{formatNumber(totalRides)}</p>
            <p className="text-[10px] text-slate-500">total</p>
          </div>
        </div>
      </div>

      <div className="flex-1 space-y-3 w-full">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-emerald-500 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-300">Cash</p>
            <p className="text-xs text-slate-500">{data.cash.count} rides · {cashPct.toFixed(1)}% of revenue</p>
          </div>
          <p className="text-sm font-bold text-emerald-400 font-mono">{formatPeso(cashTotal)}</p>
        </div>

        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-blue-500 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-300">GCash</p>
            <p className="text-xs text-slate-500">{data.gcash.count} rides · {gcashPct.toFixed(1)}% of revenue</p>
          </div>
          <p className="text-sm font-bold text-blue-400 font-mono">{formatPeso(gcashTotal)}</p>
        </div>

        <div className="flex items-center gap-2 pt-3 border-t border-[#1E2D45]">
          <div className="w-3 h-3 rounded-full bg-pink-500 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-300">Voucher</p>
            <p className="text-xs text-slate-500">
              {data.voucher.count} free reward rides
            </p>
          </div>
          <p className="text-sm font-bold text-slate-500 font-mono">{formatPeso(data.voucher.total)}</p>
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-[#1E2D45]">
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Total Revenue</p>
          <p className="text-base font-bold text-white font-mono">{formatPeso(grandTotal)}</p>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// REPORTS TAB
// ═══════════════════════════════════════════════════════════════════════

interface RemittanceRow {
  shift_id: string;
  conductor_name: string;
  driver_name: string;
  unit_number: string;
  date: string;
  time_in: string | null;
  time_out: string | null;
  cash_total: number;
  gcash_total: number;
  total_passengers: number;
  remittance_status: string;
}

// The API sends the backend Remittance enum's raw uppercase codes —
// 'PENDING' | 'COMPLETE' | 'SHORTAGE' | 'OVERAGE' (see Remittance.php) —
// never the literal string 'Remitted'. Comparing against 'Remitted' directly
// was always false, so every row silently rendered as Pending regardless of
// its actual state. This mirrors the decoding the Remittance module already
// does correctly in remittance-data.tsx: any status other than PENDING means
// a remittance record exists, i.e. the shift has been remitted (SHORTAGE/
// OVERAGE still count — they're a remitted amount that didn't reconcile,
// not an un-remitted one). 'Remitted' itself is kept as a legacy fallback.
function isRemittedStatus(status: string): boolean {
  return status === 'COMPLETE' || status === 'SHORTAGE' || status === 'OVERAGE' || status === 'Remitted';
}

function useRemittanceRows(range: AnalyticsRange) {
  const [rows, setRows] = useState<RemittanceRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
        total_passengers: Number(r.total_passengers) || 0,
      }));
      setRows(normalized as RemittanceRow[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load remittances');
    } finally {
      setIsLoading(false);
    }
  }, [range.date_from, range.date_to]);

  useEffect(() => { fetchRows(); }, [fetchRows]);

  return { rows, isLoading, error, refetch: fetchRows };
}

function ReportsTab({
  analyticsData,
  rangeLabel,
  range,
  scopedRows,
  isLoading,
  error,
  refetch,
}: {
  analyticsData: AnalyticsData | null;
  rangeLabel: string;
  range: AnalyticsRange;
  /** Remittance rows already fetched + date-scoped by the parent, which also
   * owns the Export button (moved up into the shared filter row so it can
   * sit beside the day-range presets instead of its own row down here). */
  scopedRows: RemittanceRow[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}) {
  const dateFrom = range.date_from;
  const dateTo = range.date_to;

  const remittanceTableData: AnalyticsRemittance[] = useMemo(() => {
    return scopedRows.map(r => ({
      shiftId: r.shift_id.slice(0, 12),
      conductor: r.conductor_name ?? '—',
      vehiclePlate: r.unit_number ?? '—',
      date: r.date ?? '—',
      remittedAmount: r.cash_total + r.gcash_total,
      cashAmount: r.cash_total,
      gcashAmount: r.gcash_total,
      status: isRemittedStatus(r.remittance_status) ? 'Remitted' as const : 'Pending' as const,
    }));
  }, [scopedRows]);

  // Payment usage now includes Voucher, matching the donut and the Receipts
  // page. Shares are computed over ride counts, so they sum to 100%.
  const paymentUsageData: PaymentMethodUsage[] = useMemo(() => {
    if (!analyticsData) return [];
    const s = analyticsData.payment_split;
    const total = s.cash.count + s.gcash.count + s.voucher.count;
    const share = (n: number) => (total > 0 ? (n / total) * 100 : 0);
    return [
      { method: 'Cash', transactions: s.cash.count, percentage: share(s.cash.count), amount: formatPeso(s.cash.total), color: 'bg-emerald-500', icon: '💵' },
      { method: 'GCash', transactions: s.gcash.count, percentage: share(s.gcash.count), amount: formatPeso(s.gcash.total), color: 'bg-blue-500', icon: '📱' },
      { method: 'Voucher', transactions: s.voucher.count, percentage: share(s.voucher.count), amount: formatPeso(s.voucher.total), color: 'bg-pink-500', icon: '🎟️' },
    ];
  }, [analyticsData]);

  const pickupPoints: PickupPoint[] = useMemo(() => {
    if (!analyticsData?.pickup_points) return [];
    return analyticsData.pickup_points.map(p => ({ name: p.name, count: p.count }));
  }, [analyticsData]);

  if (isLoading) {
    return (
      <div className="grid lg:grid-cols-2 gap-6">
        <SkeletonCard count={2} height="300px" />
        <SkeletonCard count={2} height="300px" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <AlertCircle className="h-12 w-12 text-red-400 mb-4" />
        <p className="text-sm text-slate-400 mb-4">{error}</p>
        <button
          onClick={() => refetch()}
          className="px-4 py-2 bg-[#62A0EA] hover:bg-[#99C1F1] text-white rounded-md text-sm font-medium transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Two independent stacked columns, not a 2x2 grid: a CSS grid forces
          paired cells in the same row to share one track height, which left
          a ~100px dead gap under the shorter card whenever a row's two cards
          didn't match exactly. Each card keeps a fixed height with an
          internal scroll region (see PickupPointsList/DemandHeatmapData) so
          a card with lots of rows scrolls instead of growing the page.
          PickupPointsList's height was bumped to 500px so this column
          (500+370) totals the same as the left column (600+270). */}
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          <RemittanceTable data={remittanceTableData} dateFrom={dateFrom} dateTo={dateTo} />
          <PaymentUsageTable data={paymentUsageData} />
        </div>
        <div className="space-y-6">
          <PickupPointsList data={pickupPoints} />
          <DemandHeatmapData
            zones={analyticsData?.heatmap_zones ?? []}
            rangeLabel={rangeLabel}
          />
        </div>
      </div>
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
          <SkeletonCard count={4} height="80px" />
        </div>
        <div className="grid lg:grid-cols-2 gap-6">
          <SkeletonCard count={2} height="300px" />
          <SkeletonCard count={2} height="300px" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <AlertCircle className="h-12 w-12 text-red-400 mb-4" />
        <p className="text-sm text-slate-400 mb-4">{error}</p>
        <button
          onClick={() => refetch()}
          className="px-4 py-2 bg-[#62A0EA] hover:bg-[#99C1F1] text-white rounded-md text-sm font-medium transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (!data) return null;

  const prev = data.previous_totals;
  const health = data.gcash_health;

  return (
    <div className="space-y-6">
      {/* ── Range-scoped revenue metrics, with period-over-period deltas ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Total Fares" value={formatPeso(data.totals.total_fares)}
          sublabel={`${formatNumber(data.totals.paid_count)} paid rides`}
          icon={TrendingUp} color="text-[#62A0EA]"
          current={data.totals.total_fares} previous={prev.total_fares}
        />
        <MetricCard
          label="Cash Total" value={formatPeso(data.totals.cash_total)}
          sublabel={`${data.payment_split.cash.count} rides`}
          icon={Banknote} color="text-emerald-400"
          current={data.totals.cash_total} previous={prev.cash_total}
        />
        <MetricCard
          label="GCash Total" value={formatPeso(data.totals.gcash_total)}
          sublabel={`${data.payment_split.gcash.count} rides`}
          icon={Smartphone} color="text-blue-400"
          current={data.totals.gcash_total} previous={prev.gcash_total}
        />
        <MetricCard
          label="Avg Fare" value={formatPeso(data.totals.avg_fare)}
          sublabel="per paying ride"
          icon={Receipt} color="text-[#62A0EA]"
          current={data.totals.avg_fare} previous={prev.avg_fare}
        />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Passengers" value={formatNumber(data.totals.total_passengers)}
          sublabel={`incl. ${data.totals.voucher_count} voucher rides`}
          icon={Users} color="text-[#62A0EA]"
          current={data.totals.total_passengers} previous={prev.total_passengers}
        />
        <MetricCard
          label="GCash Success" value={health.success_rate === null ? '—' : `${health.success_rate}%`}
          sublabel={health.success_rate === null ? 'no gateway attempts' : `${health.failed + health.expired + health.cancelled} unsettled`}
          icon={ShieldCheck}
          color={health.success_rate !== null && health.success_rate < 90 ? 'text-red-400' : 'text-emerald-400'}
        />
        <MetricCard
          label="Pending" value={formatNumber(data.totals.pending_count)}
          sublabel="awaiting payment" icon={Clock} color="text-amber-400"
        />
        <MetricCard
          label="Shortage" value={formatPeso(data.remittances.total_shortage)}
          sublabel={data.remittances.total_shortage > 0 ? `${data.remittances.shortage_rate}% of collected` : 'No shortage'}
          icon={AlertTriangle}
          color={data.remittances.total_shortage > 0 ? 'text-red-400' : 'text-slate-500'}
        />
      </div>

      {/* ── Live fleet status ──
          Deliberately separated from the cards above: these are point-in-time
          "right now" counts, not range aggregates, and mixing the two in one
          grid invited them to be read as scoped to the selected window. */}
      <div className="bg-[#131C2E] border border-[#1E2D45] rounded-lg p-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Live Fleet — current status, not affected by the date range
          </h2>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <MetricCard
            label="Active Vehicles" value={`${data.fleet.active_vehicles} / ${data.fleet.total_vehicles}`}
            sublabel="on active shift now" icon={Car} color="text-[#62A0EA]"
          />
          <MetricCard
            label="Active Conductors" value={`${data.fleet.active_conductors} / ${data.fleet.total_conductors}`}
            sublabel="on shift now" icon={Users} color="text-[#62A0EA]"
          />
        </div>
      </div>

      {/* ── Charts ── */}
      <div className="bg-[#131C2E] border border-[#1E2D45] rounded-lg p-5">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <h2 className="text-lg font-bold text-white">Daily Revenue</h2>
          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-emerald-500" /><span className="text-slate-400">Cash</span></span>
            <span className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-blue-500" /><span className="text-slate-400">GCash</span></span>
            <span className="flex items-center gap-1.5"><div className="w-4 h-0.5 rounded-full bg-amber-500" /><span className="text-slate-400">7-day avg</span></span>
          </div>
        </div>
        <DailyRevenueChart data={data.daily_series} />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-[#131C2E] border border-[#1E2D45] rounded-lg p-5">
          <h2 className="text-lg font-bold text-white mb-1">Peak Hours</h2>
          <p className="text-xs text-slate-500 mb-4">Rides by hour of day across the selected range</p>
          <PeakHoursChart data={data.hourly_series} />
        </div>
        <div className="bg-[#131C2E] border border-[#1E2D45] rounded-lg p-5 flex flex-col">
          <h2 className="text-lg font-bold text-white mb-1">Payment Method Split</h2>
          <p className="text-xs text-slate-500 mb-4">Ring shows revenue share; voucher rides are free</p>
          <PaymentSplitDonut data={data.payment_split} />
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

  // Guard the custom range: an inverted from/to would silently return an
  // empty window with no explanation.
  const rangeInvalid = preset === 'custom' && !!customFrom && !!customTo && customFrom > customTo;
  const customIncomplete = preset === 'custom' && (!customFrom || !customTo);

  const range: AnalyticsRange = useMemo(() => {
    if (preset === 'custom') {
      if (rangeInvalid || customIncomplete) return {};
      return { date_from: customFrom, date_to: customTo };
    }
    return presetToRange(preset);
  }, [preset, customFrom, customTo, rangeInvalid, customIncomplete]);

  // Mirror state into the URL without pushing history entries for every click.
  useEffect(() => {
    const p = new URLSearchParams();
    p.set('tab', activeTab);
    p.set('preset', preset);
    if (preset === 'custom') {
      if (customFrom) p.set('from', customFrom);
      if (customTo) p.set('to', customTo);
    }
    router.replace(`?${p.toString()}`, { scroll: false });
  }, [activeTab, preset, customFrom, customTo, router]);

  const { data, isLoading, error, refetch } = useAnalytics(range);

  const rangeLabel = data
    ? `${data.date_range.from} → ${data.date_range.to} (${data.date_range.days}d)`
    : 'Loading…';

  // Remittance data + the Export button live up here (not inside ReportsTab)
  // so the button can sit in the shared filter row, beside the day-range
  // presets, instead of its own row inside the Reports tab body.
  const {
    rows: remittanceRows,
    isLoading: isLoadingRemittances,
    error: remittanceError,
    refetch: refetchRemittances,
  } = useRemittanceRows(range);
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

  const handleExportCSV = useCallback(() => {
    const headers = ['Shift ID', 'Conductor', 'Driver', 'Unit', 'Date', 'Time In', 'Time Out', 'Cash', 'GCash', 'Total', 'Passengers', 'Status'];
    const body = scopedRows.map(r => [
      r.shift_id,
      r.conductor_name ?? '',
      r.driver_name ?? '',
      r.unit_number ?? '',
      r.date ?? '',
      r.time_in ?? '',
      r.time_out ?? '',
      r.cash_total.toFixed(2),
      r.gcash_total.toFixed(2),
      (r.cash_total + r.gcash_total).toFixed(2),
      String(r.total_passengers ?? 0),
      r.remittance_status ?? '',
    ]);

    const esc = (v: string) => `"${String(v).replace(/"/g, '""')}"`;
    const csv = [headers.map(esc).join(','), ...body.map(row => row.map(esc).join(','))].join('\n');

    // BOM so Excel reads UTF-8 correctly (matches the Receipts export).
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `chatco-remittances-${dateFrom ?? 'all'}-to-${dateTo ?? 'all'}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [scopedRows, dateFrom, dateTo]);

  const handleReportExport = useCallback((format: ReportFormat) => {
    exportReport({
      title: 'CHATCO Remittance Analytics',
      fileName: `chatco-remittances-${dateFrom ?? 'all'}-to-${dateTo ?? 'all'}`,
      format,
      headers: ['Shift ID', 'Conductor', 'Driver', 'Unit', 'Date', 'Time In', 'Time Out', 'Cash', 'GCash', 'Total', 'Passengers', 'Status'],
      rows: scopedRows.map((row) => [
        row.shift_id,
        row.conductor_name ?? '',
        row.driver_name ?? '',
        row.unit_number ?? '',
        row.date ?? '',
        row.time_in ?? '',
        row.time_out ?? '',
        row.cash_total.toLocaleString('en-PH', { minimumFractionDigits: 2 }),
        row.gcash_total.toLocaleString('en-PH', { minimumFractionDigits: 2 }),
        (row.cash_total + row.gcash_total).toLocaleString('en-PH', { minimumFractionDigits: 2 }),
        row.total_passengers ?? 0,
        row.remittance_status ?? '',
      ]),
    });
  }, [scopedRows, dateFrom, dateTo]);

  return (
    <div className="space-y-6">
      <StickyPageHeader>
        <h1 className="text-2xl font-bold text-white">Financial &amp; Operations Analytics</h1>
      </StickyPageHeader>

      <div className="-mt-4 md:mt-0 flex items-center gap-1.5 min-w-0 text-sm text-slate-400">
        {data ? (
          <>
            <CalendarDays size={14} className="text-slate-500 shrink-0" />
            <span className="truncate">
              {formatDateRangeLabel(data.date_range.from, data.date_range.to)}
              <span className="text-slate-600"> · vs </span>
              {formatDateRangeLabel(data.previous_range.from, data.previous_range.to)}
            </span>
          </>
        ) : (
          <span className="truncate">Conductor remittances, payment breakdowns, and commuter demand.</span>
        )}
      </div>

      {/* Custom-range feedback. Selecting "Custom" used to fall back to the
          backend's 30-day default while the UI still showed Custom selected. */}
      {(rangeInvalid || customIncomplete) && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-amber-500/10 border border-amber-500/30 text-xs text-amber-300">
          <AlertTriangle size={14} className="flex-shrink-0" />
          {rangeInvalid
            ? 'Start date is after the end date — showing the default 30-day window until the range is valid.'
            : 'Pick both a start and an end date — showing the default 30-day window in the meantime.'}
        </div>
      )}

      {/* Tabs + range control share one row: tabs on the left, filters
          flush right against the same border. The range control still
          applies to BOTH tabs. */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-[#1E2D45]">
        <div className="flex space-x-1">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex items-center space-x-2 py-2.5 px-4 font-medium text-sm rounded-t-md transition-colors ${
              activeTab === 'overview'
                ? 'text-white border-b-2 border-[#62A0EA] bg-[#62A0EA]/10'
                : 'text-slate-400 hover:text-white hover:bg-[#1A2540]'
            }`}
          >
            <BarChart3 size={18} />
            <span>Overview</span>
          </button>
          <button
            onClick={() => setActiveTab('reports')}
            className={`flex items-center space-x-2 py-2.5 px-4 font-medium text-sm rounded-t-md transition-colors ${
              activeTab === 'reports'
                ? 'text-white border-b-2 border-[#62A0EA] bg-[#62A0EA]/10'
                : 'text-slate-400 hover:text-white hover:bg-[#1A2540]'
            }`}
          >
            <FileText size={18} />
            <span>Detailed Reports</span>
          </button>
        </div>

        <div className="flex items-center gap-2 flex-wrap pb-2 lg:pb-2.5">
          <div className="flex items-center gap-1 bg-[#0E1628] p-1 rounded-md border border-[#1E2D45]">
            {(['7d', '30d', '90d', 'custom'] as PresetKey[]).map(p => (
              <button
                key={p}
                onClick={() => setPreset(p)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  preset === p ? 'bg-[#62A0EA] text-white' : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                {p === '7d' ? '7 Days' : p === '30d' ? '30 Days' : p === '90d' ? '90 Days' : 'Custom'}
              </button>
            ))}
          </div>

          {preset === 'custom' && (
            <div className="flex items-center gap-1">
              <div className="relative">
                <CalendarDays size={14} className="absolute left-2 top-2.5 text-slate-500 pointer-events-none" />
                <input
                  type="date"
                  value={customFrom}
                  max={customTo || undefined}
                  aria-label="Range start date"
                  onChange={e => setCustomFrom(e.target.value)}
                  className="bg-[#0E1628] border border-[#1E2D45] rounded-md text-xs text-slate-300 pl-8 pr-2 py-1.5 focus:outline-none focus:border-[#62A0EA]/50 [color-scheme:dark]"
                />
              </div>
              <span className="text-slate-500 text-xs">to</span>
              <div className="relative">
                <CalendarDays size={14} className="absolute left-2 top-2.5 text-slate-500 pointer-events-none" />
                <input
                  type="date"
                  value={customTo}
                  min={customFrom || undefined}
                  aria-label="Range end date"
                  onChange={e => setCustomTo(e.target.value)}
                  className="bg-[#0E1628] border border-[#1E2D45] rounded-md text-xs text-slate-300 pl-8 pr-2 py-1.5 focus:outline-none focus:border-[#62A0EA]/50 [color-scheme:dark]"
                />
              </div>
            </div>
          )}

          {/* Export lives here (Reports tab only) so it sits beside the
              day-range presets — days first (leftmost), export after —
              instead of its own row inside the tab body below. */}
          {activeTab === 'reports' && (
            <div className="relative" ref={exportMenuRef}>
              <button
                onClick={() => setIsExportOpen((open) => !open)}
                disabled={scopedRows.length === 0}
                title={`Export ${scopedRows.length} remittances`}
                aria-haspopup="menu"
                aria-expanded={isExportOpen}
                className="flex items-center gap-1.5 px-2.5 py-2 bg-[#62A0EA] text-white text-xs font-medium rounded-md hover:bg-[#4A8BD4] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Download size={13} />
                <span>Export</span>
                <ChevronDown size={13} className={`transition-transform duration-200 ${isExportOpen ? 'rotate-180' : ''}`} />
              </button>

              {isExportOpen && (
                <div
                  role="menu"
                  className="absolute right-0 top-full mt-2 w-32 bg-[#131C2E] border border-[#1E2D45] rounded-md shadow-2xl shadow-black/50 overflow-hidden z-20"
                >
                  <button
                    role="menuitem"
                    onClick={() => { handleExportCSV(); setIsExportOpen(false); }}
                    title={`Export ${scopedRows.length} remittances to CSV`}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-slate-300 hover:bg-[#1A2540] hover:text-white transition-colors"
                  >
                    <Download size={13} className="text-slate-500" />
                    <span>CSV</span>
                  </button>
                  {(['pdf', 'excel', 'word'] as const).map((format) => (
                    <button
                      key={format}
                      role="menuitem"
                      onClick={() => { handleReportExport(format); setIsExportOpen(false); }}
                      title={`Export ${scopedRows.length} remittances to ${format.toUpperCase()}`}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-slate-300 hover:bg-[#1A2540] hover:text-white transition-colors"
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
          analyticsData={data}
          rangeLabel={rangeLabel}
          range={range}
          scopedRows={scopedRows}
          isLoading={isLoadingRemittances}
          error={remittanceError}
          refetch={refetchRemittances}
        />
      )}
    </div>
  );
}
