// app/(admin)/analytics/page.tsx
'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
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
  RefreshCw,
  Banknote,
  Clock,
  AlertTriangle,
  BarChart3,
  FileText,
  Download,
  Receipt,
  ShieldCheck,
} from 'lucide-react';
import {
  useAnalytics,
  computeDelta,
  formatPeso,
  formatNumber,
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
      <div className="py-12 text-center text-slate-600 text-sm">
        No paid transactions in this date range.
      </div>
    );
  }

  return (
    <div className="flex items-center gap-6">
      {/* Decorative: every value in the ring is stated in the legend beside
          it, and a conic-gradient div is unreadable to assistive tech. */}
      <div className="relative w-32 h-32 flex-shrink-0" aria-hidden="true">
        <div
          className="w-full h-full rounded-full"
          style={{
            background: `conic-gradient(#10b981 0% ${cashPct}%, #3b82f6 ${cashPct}% 100%)`,
          }}
        />
        <div className="absolute inset-4 bg-[#131C2E] rounded-full flex items-center justify-center">
          <div className="text-center">
            <p className="text-[10px] text-slate-500 uppercase">Rides</p>
            <p className="text-sm font-bold text-white">{formatNumber(totalRides)}</p>
            <p className="text-[10px] text-slate-500">total</p>
          </div>
        </div>
      </div>

      <div className="flex-1 space-y-2.5">
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

        <div className="flex items-center gap-2 pt-2.5 border-t border-[#1E2D45]">
          <div className="w-3 h-3 rounded-full bg-pink-500 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-300">Voucher</p>
            <p className="text-xs text-slate-500">
              {data.voucher.count} free reward rides
            </p>
          </div>
          <p className="text-sm font-bold text-slate-500 font-mono">₱0.00</p>
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
      setRows(Array.isArray(records) ? (records as RemittanceRow[]) : []);
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
}: {
  analyticsData: AnalyticsData | null;
  rangeLabel: string;
  range: AnalyticsRange;
}) {
  const { rows, isLoading, error, refetch } = useRemittanceRows(range);
  const dateFrom = range.date_from;
  const dateTo = range.date_to;

  // Scope remittances to the selected window. The table used to show every
  // remittance ever recorded while the three panels beside it were range
  // filtered, so the tab silently mixed two different periods. The backend
  // also receives the range; this guard keeps proxy variants safe.
  const scopedRows = useMemo(() => {
    if (!dateFrom && !dateTo) return rows;
    return rows.filter(r => {
      if (!r.date) return false;
      if (dateFrom && r.date < dateFrom) return false;
      if (dateTo && r.date > dateTo) return false;
      return true;
    });
  }, [rows, dateFrom, dateTo]);

  const remittanceTableData: AnalyticsRemittance[] = useMemo(() => {
    return scopedRows.map(r => ({
      shiftId: r.shift_id.slice(0, 12),
      conductor: r.conductor_name ?? '—',
      vehiclePlate: r.unit_number ?? '—',
      date: r.date ?? '—',
      remittedAmount: r.cash_total + r.gcash_total,
      cashAmount: r.cash_total,
      gcashAmount: r.gcash_total,
      status: r.remittance_status === 'Remitted' ? 'Remitted' as const : 'Pending' as const,
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
      { method: 'Voucher', transactions: s.voucher.count, percentage: share(s.voucher.count), amount: formatPeso(0), color: 'bg-pink-500', icon: '🎟️' },
    ];
  }, [analyticsData]);

  const pickupPoints: PickupPoint[] = useMemo(() => {
    if (!analyticsData?.pickup_points) return [];
    return analyticsData.pickup_points.map(p => ({ name: p.name, count: p.count }));
  }, [analyticsData]);

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
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-slate-500">
          {remittanceTableData.length} remittance{remittanceTableData.length === 1 ? '' : 's'} · {rangeLabel}
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={() => refetch()}
            title="Refresh remittances"
            className="p-2 text-slate-400 hover:text-white hover:bg-[#1A2540] rounded-md transition-colors"
          >
            <RefreshCw size={16} />
          </button>
          <button
            onClick={handleExportCSV}
            disabled={scopedRows.length === 0}
            title={`Export ${scopedRows.length} remittances to CSV`}
            className="flex items-center gap-1.5 px-2.5 py-2 bg-[#334155] text-white text-xs font-medium rounded-md hover:bg-[#475569] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download size={13} />
            <span>CSV</span>
          </button>
          {(['pdf', 'excel', 'word'] as const).map((format) => (
            <button
              key={format}
              onClick={() => handleReportExport(format)}
              disabled={scopedRows.length === 0}
              title={`Export ${scopedRows.length} remittances to ${format.toUpperCase()}`}
              className="flex items-center gap-1.5 px-2.5 py-2 bg-[#62A0EA] text-white text-xs font-medium rounded-md hover:bg-[#4A8BD4] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download size={13} />
              <span>{format === 'pdf' ? 'PDF' : format === 'excel' ? 'Excel' : 'Word'}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          <RemittanceTable data={remittanceTableData} />
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
          current={data.totals.total_passengers} previous={prev.paid_count}
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
        <div className="bg-[#131C2E] border border-[#1E2D45] rounded-lg p-5">
          <h2 className="text-lg font-bold text-white mb-1">Payment Method Split</h2>
          <p className="text-xs text-slate-500 mb-4">Ring shows revenue share; voucher rides are free</p>
          <PaymentSplitDonut data={data.payment_split} />
        </div>
      </div>

      {/* ── Payment status breakdown ── */}
      <div className="bg-[#131C2E] border border-[#1E2D45] rounded-lg p-5">
        <h2 className="text-lg font-bold text-white mb-4">Transaction Status</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          {(Object.entries(data.status_breakdown) as [string, number][]).map(([status, count]) => (
            <div key={status} className="bg-[#0E1628] border border-[#1E2D45] rounded-md p-3">
              <p className="text-[10px] text-slate-500 uppercase tracking-wider truncate">{status}</p>
              <p className={`text-lg font-bold font-mono ${
                status === 'PAID' ? 'text-emerald-400'
                : status === 'FAILED' || status === 'CANCELLED' || status === 'EXPIRED' ? 'text-red-400'
                : status === 'PENDING' || status === 'PROCESSING' ? 'text-amber-400'
                // Anything else is a status the product doesn't produce and
                // only appears when a row genuinely has one — neutral, so it
                // reads as "needs a look" rather than good or bad.
                : 'text-slate-300'
              }`}>{formatNumber(count)}</p>
            </div>
          ))}
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

  const { data, isLoading, isRefreshing, error, refetch } = useAnalytics(range);

  const rangeLabel = data
    ? `${data.date_range.from} → ${data.date_range.to} (${data.date_range.days}d)`
    : 'Loading…';

  return (
    <div className="space-y-6">
      <StickyPageHeader>
        <h1 className="text-2xl font-bold text-white">Financial &amp; Operations Analytics</h1>
      </StickyPageHeader>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 -mt-4 md:mt-0">
        <div className="min-w-0">
          <p className="text-sm text-white/40 truncate">
            {data
              ? `${rangeLabel} · compared against ${data.previous_range.from} → ${data.previous_range.to}`
              : 'Conductor remittances, payment breakdowns, and commuter demand.'}
          </p>
        </div>

        {/* The range control now applies to BOTH tabs — it used to be hidden
            on Reports, which still rendered range-scoped panels. */}
        <div className="flex items-center gap-2 flex-wrap">
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

          <button
            onClick={() => refetch()}
            disabled={isRefreshing}
            title="Refresh"
            className="p-2 text-slate-400 hover:text-white hover:bg-[#1A2540] rounded-md transition-colors disabled:opacity-50"
          >
            <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
          </button>
        </div>
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

      {/* Tabs */}
      <div className="flex space-x-1 border-b border-[#1E2D45]">
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

      {activeTab === 'overview' ? (
        <OverviewTab data={data} isLoading={isLoading} error={error} refetch={refetch} />
      ) : (
        <ReportsTab
          analyticsData={data}
          rangeLabel={rangeLabel}
          range={range}
        />
      )}
    </div>
  );
}
