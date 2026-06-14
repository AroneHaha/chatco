'use client';

import Link from 'next/link';
import type { StatItem } from '@/app/(admin)/admin-dashboard/data/dashboard-data';

interface DashboardQuickStatsProps {
  quickStats: StatItem[];
}

export function DashboardQuickStats({ quickStats }: DashboardQuickStatsProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {quickStats.map((stat) => (
        <Link key={stat.label} href={stat.link} className="bg-[#131C2E] border border-[#1E2D45] rounded-lg p-4 flex items-center gap-4 hover:border-[#2A3A55] transition-all">
          <div className={`w-10 h-10 rounded-lg ${stat.color} flex items-center justify-center flex-shrink-0`}>
            <stat.icon className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">{stat.label}</p>
            <p className="text-xl font-bold text-white mt-0.5">{stat.value}</p>
          </div>
        </Link>
      ))}
    </div>
  );
}
