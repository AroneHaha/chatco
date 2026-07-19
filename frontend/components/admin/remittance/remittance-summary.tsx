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
  accent: string;   // text color class for icon + value
  ring: string;     // background tint class for the icon chip
}

function StatCard({ label, value, icon, accent, ring }: StatCardProps) {
  return (
    <div className="relative overflow-hidden bg-[#0E1628] border border-[#1E2D45] rounded-xl p-4 flex items-center gap-4">
      <div className={`w-11 h-11 rounded-lg flex items-center justify-center ${ring}`}>
        <span className={accent}>{icon}</span>
      </div>
      <div className="min-w-0">
        <p className="text-[10px] text-slate-500 uppercase tracking-wider">{label}</p>
        <p className={`text-lg font-bold truncate ${accent}`}>{value}</p>
      </div>
    </div>
  );
}

/**
 * Today's at-a-glance totals for the Remittance Tracker.
 *
 * Purely additive: reuses the same useRemittanceData() source as the table
 * and aggregates only records dated today. No existing logic is changed.
 */
export function RemittanceSummary() {
  const { records, isLoading } = useRemittanceData();

  const today = useMemo(() => {
    const t = todayStr();
    const todays = records.filter((r) => r.date === t);
    return {
      passengers: todays.reduce((s, r) => s + r.totalPassengers, 0),
      cash: todays.reduce((s, r) => s + r.cashTotal, 0),
      gcash: todays.reduce((s, r) => s + r.gcashTotal, 0),
      total: todays.reduce((s, r) => s + r.cashTotal + r.gcashTotal, 0),
      shifts: todays.length,
    };
  }, [records]);

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
        label="Passengers (Today)"
        value={String(today.passengers)}
        icon={<Users size={20} />}
        accent="text-pink-400"
        ring="bg-pink-500/15"
      />
      <StatCard
        label="Cash (Today)"
        value={fmtPHP(today.cash)}
        icon={<Banknote size={20} />}
        accent="text-emerald-400"
        ring="bg-emerald-500/15"
      />
      <StatCard
        label="GCash (Today)"
        value={fmtPHP(today.gcash)}
        icon={<Smartphone size={20} />}
        accent="text-blue-400"
        ring="bg-blue-500/15"
      />
      <StatCard
        label="Total Collected (Today)"
        value={fmtPHP(today.total)}
        icon={<Wallet size={20} />}
        accent="text-[#62A0EA]"
        ring="bg-[#62A0EA]/15"
      />
    </div>
  );
}
