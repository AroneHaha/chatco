// app/(admin)/analytics/page.tsx
'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import {
  AlertCircle,
  CalendarDays,
  TrendingUp,
  Wallet,
  Smartphone,
  Users,
  Car,
  RefreshCw,
  Banknote,
  Clock,
  AlertTriangle,
  BarChart3,
  FileText,
} from 'lucide-react';
import {
  useAnalytics,
  formatPeso,
  formatNumber,
  formatShortDate,
  type AnalyticsData,
  type AnalyticsRange,
} from '@/lib/admin/services/analytics.service';
import { RemittanceTable } from '@/components/admin/analytics/remittance-table';
import { PaymentUsageTable } from '@/components/admin/analytics/payment-usage-table';
import { PickupPointsList } from '@/components/admin/analytics/pickup-points-list';
import { DemandHeatmapData } from '@/components/admin/analytics/demand-heatmap-data';
import type { PickupPoint, HeatmapZone, HeatmapIntensity } from '@/app/(admin)/analytics/data/analytics-data';
import { SkeletonCard } from '@/components/admin/ui/skeleton';
import { StickyPageHeader } from '@/components/admin/layout/sticky-page-header';
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

function presetToRange(preset: PresetKey): AnalyticsRange {
  const today = new Date();
  const fmt = (d: Date) => d.toISOString().split('T')[0];

  switch (preset) {
    case '7d':
      return { date_from: fmt(new Date(today.getTime() - 6 * 86400000)), date_to: fmt(today) };
    case '30d':
      return { date_from: fmt(new Date(today.getTime() - 29 * 86400000)), date_to: fmt(today) };
    case '90d':
      return { date_from: fmt(new Date(today.getTime() - 89 * 86400000)), date_to: fmt(today) };
    case 'custom':
      return {};
  }
}

// ═══════════════════════════════════════════════════════════════════════
// METRIC CARD
// ═══════════════════════════════════════════════════════════════════════

function MetricCard({
  label,
  value,
  sublabel,
  icon: Icon,
  color,
}: {
  label: string;
  value: string;
  sublabel?: string;
  icon: React.ElementType;
  color: string;
}) {
  return (
    <div className="bg-[#131C2E] border border-[#1E2D45] rounded-lg p-4 flex items-center space-x-4">
      <div className={`p-3 bg-[#0E1628] rounded-full ${color}`}>
        <Icon size={22} />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">{label}</p>
        <p className="text-xl font-bold text-white truncate">{value}</p>
        {sublabel && <p className="text-xs text-slate-500 mt-0.5">{sublabel}</p>}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// DAILY SERIES BAR CHART (pure CSS)
// ═══════════════════════════════════════════════════════════════════════

function DailySeriesChart({ data }: { data: AnalyticsData['daily_series'] }) {
  const maxTotal = useMemo(() => {
    if (data.length === 0) return 1;
    return Math.max(...data.map(d => d.total), 1);
  }, [data]);

  if (data.length === 0) {
    return (
      <div className="py-12 text-center text-slate-600 text-sm">
        No transaction data in this date range.
      </div>
    );
  }

  return (
    <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
      {data.map(point => (
        <div key={point.date} className="flex items-center gap-3">
          <span className="text-xs text-slate-500 w-12 flex-shrink-0 text-right">{formatShortDate(point.date)}</span>
          <div className="flex-1 flex h-7 rounded-md overflow-hidden bg-[#0E1628] border border-[#1E2D45]">
            {point.cash > 0 && (
              <div
                className="bg-emerald-500/70 hover:bg-emerald-500 transition-colors flex items-center justify-center text-[10px] font-bold text-emerald-950"
                style={{ width: `${(point.cash / maxTotal) * 100}%` }}
                title={`Cash: ${formatPeso(point.cash)}`}
              >
                {point.cash / maxTotal > 0.15 ? '₱' : ''}
              </div>
            )}
            {point.gcash > 0 && (
              <div
                className="bg-blue-500/70 hover:bg-blue-500 transition-colors flex items-center justify-center text-[10px] font-bold text-blue-950"
                style={{ width: `${(point.gcash / maxTotal) * 100}%` }}
                title={`GCash: ${formatPeso(point.gcash)}`}
              >
                {point.gcash / maxTotal > 0.15 ? '₱' : ''}
              </div>
            )}
          </div>
          <span className="text-xs text-slate-400 w-20 flex-shrink-0 text-right font-mono">
            {formatPeso(point.total)}
          </span>
          <span className="text-[10px] text-slate-600 w-12 flex-shrink-0 text-right">
            {point.count} fares
          </span>
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// PAYMENT SPLIT DONUT (pure CSS conic-gradient)
// ═══════════════════════════════════════════════════════════════════════

function PaymentSplitDonut({ data }: { data: AnalyticsData['payment_split'] }) {
  const cashTotal = data.cash.total;
  const gcashTotal = data.gcash.total;
  const grandTotal = cashTotal + gcashTotal;

  const cashPct = grandTotal > 0 ? (cashTotal / grandTotal) * 100 : 0;
  const gcashPct = grandTotal > 0 ? (gcashTotal / grandTotal) * 100 : 0;

  if (grandTotal === 0) {
    return (
      <div className="py-12 text-center text-slate-600 text-sm">
        No paid transactions in this date range.
      </div>
    );
  }

  return (
    <div className="flex items-center gap-6">
      <div className="relative w-32 h-32 flex-shrink-0">
        <div
          className="w-full h-full rounded-full"
          style={{
            background: `conic-gradient(#10b981 0% ${cashPct}%, #3b82f6 ${cashPct}% 100%)`,
          }}
        />
        <div className="absolute inset-4 bg-[#131C2E] rounded-full flex items-center justify-center">
          <div className="text-center">
            <p className="text-[10px] text-slate-500 uppercase">Total</p>
            <p className="text-sm font-bold text-white">{formatNumber(data.cash.count + data.gcash.count)}</p>
            <p className="text-[10px] text-slate-500">fares</p>
          </div>
        </div>
      </div>
      <div className="flex-1 space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-emerald-500" />
          <div className="flex-1">
            <p className="text-sm font-medium text-slate-300">Cash</p>
            <p className="text-xs text-slate-500">{data.cash.count} fares · {cashPct.toFixed(1)}%</p>
          </div>
          <p className="text-sm font-bold text-emerald-400 font-mono">{formatPeso(cashTotal)}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-blue-500" />
          <div className="flex-1">
            <p className="text-sm font-medium text-slate-300">GCash</p>
            <p className="text-xs text-slate-500">{data.gcash.count} fares · {gcashPct.toFixed(1)}%</p>
          </div>
          <p className="text-sm font-bold text-blue-400 font-mono">{formatPeso(gcashTotal)}</p>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// REPORTS TAB — fetches remittances list for the table
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

function useRemittanceRows() {
  const [rows, setRows] = useState<RemittanceRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRows = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/remittances', { headers: { Accept: 'application/json' } });
      if (!res.ok) throw new Error('Failed to fetch remittances');
      const json = await res.json();
      setRows((json.data ?? []) as RemittanceRow[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load remittances');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchRows(); }, [fetchRows]);

  return { rows, isLoading, error, refetch: fetchRows };
}

function ReportsTab({ analyticsData }: { analyticsData: AnalyticsData | null }) {
  const { rows, isLoading, error } = useRemittanceRows();

  // Map API remittance rows → AnalyticsRemittance format for the table component
  const remittanceTableData: AnalyticsRemittance[] = useMemo(() => {
    return rows.map(r => ({
      shiftId: r.shift_id.slice(0, 12),
      conductor: r.conductor_name ?? '—',
      vehiclePlate: r.unit_number ?? '—',
      date: r.date ?? '—',
      remittedAmount: r.cash_total + r.gcash_total,
      cashAmount: r.cash_total,
      gcashAmount: r.gcash_total,
      status: r.remittance_status === 'Remitted' ? 'Remitted' as const : 'Pending' as const,
    }));
  }, [rows]);

  // Map analytics payment_split → PaymentMethodUsage format
  const paymentUsageData: PaymentMethodUsage[] = useMemo(() => {
    if (!analyticsData) return [];
    const total = analyticsData.payment_split.cash.count + analyticsData.payment_split.gcash.count;
    return [
      {
        method: 'Cash',
        transactions: analyticsData.payment_split.cash.count,
        percentage: total > 0 ? (analyticsData.payment_split.cash.count / total) * 100 : 0,
        amount: formatPeso(analyticsData.payment_split.cash.total),
        color: 'bg-emerald-500',
        icon: '💵',
      },
      {
        method: 'GCash',
        transactions: analyticsData.payment_split.gcash.count,
        percentage: total > 0 ? (analyticsData.payment_split.gcash.count / total) * 100 : 0,
        amount: formatPeso(analyticsData.payment_split.gcash.total),
        color: 'bg-blue-500',
        icon: '📱',
      },
    ];
  }, [analyticsData]);

  // Pickup points + heatmap — from the real backend analytics response.
  // The backend aggregates PAID transactions by pickup_name (for pickup
  // points) and joins with fare_points for GPS coordinates (for heatmap zones).
  // Both are scoped to the selected date range.
  const pickupPoints: PickupPoint[] = useMemo(() => {
    if (!analyticsData?.pickup_points) return [];
    return analyticsData.pickup_points.map(p => ({
      name: p.name,
      count: p.count,
    }));
  }, [analyticsData]);

  const heatmapZones: HeatmapZone[] = useMemo(() => {
    if (!analyticsData?.heatmap_zones) return [];
    return analyticsData.heatmap_zones.map(z => ({
      zone: z.zone,
      commuters: z.commuters,
      intensity: z.intensity as HeatmapIntensity,
      color: z.color,
    }));
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
      </div>
    );
  }

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      {/* LEFT COLUMN */}
      <div className="space-y-6">
        <RemittanceTable data={remittanceTableData} />
        <PaymentUsageTable data={paymentUsageData} />
      </div>

      {/* RIGHT COLUMN */}
      <div className="space-y-6">
        <PickupPointsList data={pickupPoints} />
        <DemandHeatmapData zones={heatmapZones} />
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

  return (
    <div className="space-y-6">
      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="Total Fares" value={formatPeso(data.totals.total_fares)} sublabel={`${formatNumber(data.totals.paid_count)} paid fares`} icon={TrendingUp} color="text-[#62A0EA]" />
        <MetricCard label="Cash Total" value={formatPeso(data.totals.cash_total)} sublabel={`${data.payment_split.cash.count} transactions`} icon={Banknote} color="text-emerald-400" />
        <MetricCard label="GCash Total" value={formatPeso(data.totals.gcash_total)} sublabel={`${data.payment_split.gcash.count} transactions`} icon={Smartphone} color="text-blue-400" />
        <MetricCard label="Pending" value={formatNumber(data.totals.pending_count)} sublabel="awaiting payment" icon={Clock} color="text-amber-400" />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="Total Remitted" value={formatPeso(data.remittances.total_remitted)} sublabel={`${data.remittances.count} remittances`} icon={Wallet} color="text-[#62A0EA]" />
        <MetricCard label="Shortage" value={formatPeso(data.remittances.total_shortage)} sublabel={data.remittances.total_shortage > 0 ? 'Needs attention' : 'No shortage'} icon={AlertTriangle} color={data.remittances.total_shortage > 0 ? 'text-red-400' : 'text-slate-500'} />
        <MetricCard label="Active Vehicles" value={`${data.fleet.active_vehicles} / ${data.fleet.total_vehicles}`} sublabel="on active shift now" icon={Car} color="text-[#62A0EA]" />
        <MetricCard label="Active Conductors" value={`${data.fleet.active_conductors} / ${data.fleet.total_conductors}`} sublabel="on shift now" icon={Users} color="text-[#62A0EA]" />
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-[#131C2E] border border-[#1E2D45] rounded-lg p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-white">Daily Revenue</h2>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-emerald-500" /><span className="text-slate-400">Cash</span></span>
              <span className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-blue-500" /><span className="text-slate-400">GCash</span></span>
            </div>
          </div>
          <DailySeriesChart data={data.daily_series} />
        </div>
        <div className="bg-[#131C2E] border border-[#1E2D45] rounded-lg p-5">
          <h2 className="text-lg font-bold text-white mb-4">Payment Method Split</h2>
          <PaymentSplitDonut data={data.payment_split} />
        </div>
      </div>

      {/* Remittance Summary */}
      <div className="bg-[#131C2E] border border-[#1E2D45] rounded-lg p-5">
        <h2 className="text-lg font-bold text-white mb-4">Remittance Summary</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-[#0E1628] border border-[#1E2D45] rounded-md p-4">
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Total Collected</p>
            <p className="text-xl font-bold text-white font-mono">{formatPeso(data.remittances.total_collected)}</p>
          </div>
          <div className="bg-[#0E1628] border border-[#1E2D45] rounded-md p-4">
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Total Remitted</p>
            <p className="text-xl font-bold text-emerald-400 font-mono">{formatPeso(data.remittances.total_remitted)}</p>
          </div>
          <div className="bg-[#0E1628] border border-[#1E2D45] rounded-md p-4">
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Total Shortage</p>
            <p className={`text-xl font-bold font-mono ${data.remittances.total_shortage > 0 ? 'text-red-400' : 'text-slate-300'}`}>{formatPeso(data.remittances.total_shortage)}</p>
          </div>
          <div className="bg-[#0E1628] border border-[#1E2D45] rounded-md p-4">
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Remittance Count</p>
            <p className="text-xl font-bold text-white">{formatNumber(data.remittances.count)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════════════

export default function AnalyticsPage() {
  const [activeTab, setActiveTab] = useState<AnalyticsTab>('overview');
  const [preset, setPreset] = useState<PresetKey>('30d');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');

  const range: AnalyticsRange = useMemo(() => {
    if (preset === 'custom') return { date_from: customFrom || undefined, date_to: customTo || undefined };
    return presetToRange(preset);
  }, [preset, customFrom, customTo]);

  const { data, isLoading, error, refetch } = useAnalytics(range);

  return (
    <div className="space-y-6">
      {/* Header. Only the title pins on phones — the data-range caption and the
          preset/custom-date controls are tall when stacked, and a sticky bar
          carrying all of them would cover most of a small screen. */}
      <StickyPageHeader>
        <h1 className="text-2xl font-bold text-white">Financial &amp; Operations Analytics</h1>
      </StickyPageHeader>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 -mt-4 md:mt-0">
        <div>
          <p className="text-sm text-white/40">
            {activeTab === 'overview' && data
              ? `Aggregated from real DB data · ${data.date_range.from} to ${data.date_range.to} (${data.date_range.days} days)`
              : 'Conductor remittances, payment method breakdowns, and commuter demand data.'}
          </p>
        </div>

        {/* Date Range Filter (only on overview tab) */}
        {activeTab === 'overview' && (
          <div className="flex items-center gap-2">
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
                    onChange={e => setCustomTo(e.target.value)}
                    className="bg-[#0E1628] border border-[#1E2D45] rounded-md text-xs text-slate-300 pl-8 pr-2 py-1.5 focus:outline-none focus:border-[#62A0EA]/50 [color-scheme:dark]"
                  />
                </div>
              </div>
            )}

            <button
              onClick={() => refetch()}
              title="Refresh"
              className="p-2 text-slate-400 hover:text-white hover:bg-[#1A2540] rounded-md transition-colors"
            >
              <RefreshCw size={16} />
            </button>
          </div>
        )}
      </div>

      {/* Tab Navigation */}
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

      {/* Tab Content */}
      {activeTab === 'overview' ? (
        <OverviewTab data={data} isLoading={isLoading} error={error} refetch={refetch} />
      ) : (
        <ReportsTab analyticsData={data} />
      )}
    </div>
  );
}
