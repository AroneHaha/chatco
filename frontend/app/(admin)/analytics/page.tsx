// app/(admin)/analytics/page.tsx
'use client';

import { useState, useMemo } from 'react';
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
} from 'lucide-react';
import {
  useAnalytics,
  formatPeso,
  formatNumber,
  formatShortDate,
  type AnalyticsData,
  type AnalyticsRange,
} from '@/lib/admin/services/analytics.service';
import { SkeletonCard } from '@/components/admin/ui/skeleton';

// ─── Quick date range presets ─────────────────────────────────────────

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
      return {}; // filled by custom date inputs
  }
}

// ─── Metric Card ──────────────────────────────────────────────────────

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

// ─── Daily Series Bar Chart (pure CSS, no chart library) ──────────────

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
    <div className="space-y-2">
      {data.map(point => (
        <div key={point.date} className="flex items-center gap-3">
          <span className="text-xs text-slate-500 w-12 flex-shrink-0 text-right">{formatShortDate(point.date)}</span>
          <div className="flex-1 flex h-7 rounded-md overflow-hidden bg-[#0E1628] border border-[#1E2D45]">
            {/* Cash portion */}
            {point.cash > 0 && (
              <div
                className="bg-emerald-500/70 hover:bg-emerald-500 transition-colors flex items-center justify-center text-[10px] font-bold text-emerald-950"
                style={{ width: `${(point.cash / maxTotal) * 100}%` }}
                title={`Cash: ${formatPeso(point.cash)}`}
              >
                {point.cash / maxTotal > 0.15 ? '₱' : ''}
              </div>
            )}
            {/* GCash portion */}
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

// ─── Payment Split Donut (pure CSS conic-gradient) ────────────────────

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
      {/* Donut */}
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

      {/* Legend */}
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

// ─── Main Page ────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const [preset, setPreset] = useState<PresetKey>('30d');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');

  const range: AnalyticsRange = useMemo(() => {
    if (preset === 'custom') {
      return { date_from: customFrom || undefined, date_to: customTo || undefined };
    }
    return presetToRange(preset);
  }, [preset, customFrom, customTo]);

  const { data, isLoading, error, refetch } = useAnalytics(range);

  // ── Loading State ──
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <div className="h-7 w-72 rounded bg-gray-700 animate-pulse" />
          <div className="h-4 w-96 rounded bg-gray-700 animate-pulse mt-2" />
        </div>
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

  // ── Error State ──
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <AlertCircle className="h-12 w-12 text-red-400 mb-4" />
        <h2 className="text-lg font-semibold text-white mb-2">Failed to load analytics</h2>
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

  // ── Data Loaded ──
  if (!data) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Financial & Operations Analytics</h1>
          <p className="text-sm text-white/40 mt-1">
            Aggregated from real DB data · {data.date_range.from} to {data.date_range.to} ({data.date_range.days} days)
          </p>
        </div>

        {/* Date Range Filter */}
        <div className="flex items-center gap-2">
          {/* Preset buttons */}
          <div className="flex items-center gap-1 bg-[#0E1628] p-1 rounded-md border border-[#1E2D45]">
            {(['7d', '30d', '90d', 'custom'] as PresetKey[]).map(p => (
              <button
                key={p}
                onClick={() => setPreset(p)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  preset === p
                    ? 'bg-[#62A0EA] text-white'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                {p === '7d' ? '7 Days' : p === '30d' ? '30 Days' : p === '90d' ? '90 Days' : 'Custom'}
              </button>
            ))}
          </div>

          {/* Custom date inputs */}
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

          {/* Refresh */}
          <button
            onClick={() => refetch()}
            title="Refresh"
            className="p-2 text-slate-400 hover:text-white hover:bg-[#1A2540] rounded-md transition-colors"
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Total Fares"
          value={formatPeso(data.totals.total_fares)}
          sublabel={`${formatNumber(data.totals.paid_count)} paid fares`}
          icon={TrendingUp}
          color="text-[#62A0EA]"
        />
        <MetricCard
          label="Cash Total"
          value={formatPeso(data.totals.cash_total)}
          sublabel={`${data.payment_split.cash.count} transactions`}
          icon={Banknote}
          color="text-emerald-400"
        />
        <MetricCard
          label="GCash Total"
          value={formatPeso(data.totals.gcash_total)}
          sublabel={`${data.payment_split.gcash.count} transactions`}
          icon={Smartphone}
          color="text-blue-400"
        />
        <MetricCard
          label="Pending"
          value={formatNumber(data.totals.pending_count)}
          sublabel="awaiting payment"
          icon={Clock}
          color="text-amber-400"
        />
      </div>

      {/* Secondary metric cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Total Remitted"
          value={formatPeso(data.remittances.total_remitted)}
          sublabel={`${data.remittances.count} remittances`}
          icon={Wallet}
          color="text-[#62A0EA]"
        />
        <MetricCard
          label="Shortage"
          value={formatPeso(data.remittances.total_shortage)}
          sublabel={data.remittances.total_shortage > 0 ? 'Needs attention' : 'No shortage'}
          icon={AlertTriangle}
          color={data.remittances.total_shortage > 0 ? 'text-red-400' : 'text-slate-500'}
        />
        <MetricCard
          label="Active Vehicles"
          value={`${data.fleet.active_vehicles} / ${data.fleet.total_vehicles}`}
          sublabel="on active shift now"
          icon={Car}
          color="text-[#62A0EA]"
        />
        <MetricCard
          label="Active Conductors"
          value={`${data.fleet.active_conductors} / ${data.fleet.total_conductors}`}
          sublabel="on shift now"
          icon={Users}
          color="text-[#62A0EA]"
        />
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Daily Revenue Series */}
        <div className="bg-[#131C2E] border border-[#1E2D45] rounded-lg p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-white">Daily Revenue</h2>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span className="text-slate-400">Cash</span>
              </span>
              <span className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                <span className="text-slate-400">GCash</span>
              </span>
            </div>
          </div>
          <DailySeriesChart data={data.daily_series} />
        </div>

        {/* Payment Method Split */}
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
            <p className={`text-xl font-bold font-mono ${data.remittances.total_shortage > 0 ? 'text-red-400' : 'text-slate-300'}`}>
              {formatPeso(data.remittances.total_shortage)}
            </p>
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
