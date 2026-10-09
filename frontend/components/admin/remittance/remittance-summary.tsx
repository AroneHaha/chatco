// components/admin/remittance/remittance-summary.tsx
'use client';

import { useMemo } from 'react';
import { Users, Banknote, Smartphone, Wallet } from 'lucide-react';
import { useRemittanceData } from '@/app/(admin)/remittance/data/remittance-data';

// ─── Helpers ───────────────────────────────────────────────────────────
const fmtPHP = (n: number) =>
  `₱${n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// Local (Asia/Manila) date in YYYY-MM-DD — matches the record `date` field.
const todayStr = () => new Date().toLocaleDateString('en-CA');

interface StatCardProps {
  label: string;
  value: string;
  icon: React.ReactNode;
}

function StatCard({ label, value, icon }: StatCardProps) {
  return (
    <div className="relative overflow-hidden bg-[#0E1628] border border-[#1E2D45] rounded-xl p-3 flex items-center gap-4">
      <div className="w-11 h-11 shrink-0 rounded-lg border border-[#62A0EA]/15 bg-[#62A0EA]/10 flex items-center justify-center text-[#62A0EA]">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[10px] text-slate-500 uppercase tracking-wider">{label}</p>
        <p className="text-lg font-bold truncate text-slate-100">{value}</p>
      </div>
    </div>
  );
}

/**
 * At-a-glance totals for the selected period in the Remittance Tracker.
 *
 * Reuses the same useRemittanceData() source as the table and aggregates
 * records in the selected period, EXCLUDING any row whose cash hasn't been declared by
 * an admin yet ("Pending" — still active, "For Cash Declaration", or
 * "Overdue"). Those rows stay visible in the table for review, but their
 * earnings only count toward these cards once an admin has actually counted
 * the physical cash via the Cash Declaration action — see
 * cash-declaration-modal.tsx.
 *
 * Uses the existing first-page, 20-record pagination.
 */
export function RemittanceSummary({ selectedDate = '', dateFrom = todayStr(), rangeLabel = 'Today' }: {
  selectedDate?: string;
  dateFrom?: string;
  rangeLabel?: string;
}) {
  const { records, isLoading } = useRemittanceData(1, '', selectedDate, 'All', dateFrom);

  const summary = useMemo(() => {
    const today = todayStr();
    const isDeclared = (r: (typeof records)[number]) =>
      r.remittanceStatus !== 'Pending' && r.remittanceStatus !== 'For Cash Declaration' && r.remittanceStatus !== 'Overdue';
    const matching = records.filter((r) => {
      const matchesPeriod = selectedDate
        ? r.date === selectedDate
        : (!dateFrom || r.date >= dateFrom) && r.date <= today;
      return matchesPeriod && isDeclared(r);
    });
    return {
      passengers: matching.reduce((s, r) => s + r.totalPassengers, 0),
      cash: matching.reduce((s, r) => s + r.cashTotal, 0),
      gcash: matching.reduce((s, r) => s + r.gcashTotal, 0),
      total: matching.reduce((s, r) => s + r.cashTotal + r.gcashTotal, 0),
    };
  }, [records, selectedDate, dateFrom]);

  const periodLabel = selectedDate
    ? new Date(`${selectedDate}T00:00:00`).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })
    : rangeLabel;

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-[76px] bg-[#0E1628] border border-[#1E2D45] rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <StatCard
        label={`Passengers (${periodLabel})`}
        value={String(summary.passengers)}
        icon={<Users size={20} />}
      />
      <StatCard
        label={`Cash (${periodLabel})`}
        value={fmtPHP(summary.cash)}
        icon={<Banknote size={20} />}
      />
      <StatCard
        label={`GCash (${periodLabel})`}
        value={fmtPHP(summary.gcash)}
        icon={<Smartphone size={20} />}
      />
      <StatCard
        label={`Total (${periodLabel})`}
        value={fmtPHP(summary.total)}
        icon={<Wallet size={20} />}
      />
    </div>
  );
}
