import Link from "next/link";
import type { StatItem } from "@/app/(admin)/admin-dashboard/data/dashboard-data";

interface DashboardQuickStatsProps {
  stats: StatItem[];
}

export function DashboardQuickStats({ stats }: DashboardQuickStatsProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat) => (
        <Link key={stat.label} href={stat.link} className="bg-[#131C2E] admin-light:bg-white border border-[#1E2D45] admin-light:border-[#E2E8F0] rounded-lg p-4 flex items-center gap-4 hover:border-[#2A3A55] admin-light:hover:border-[#CBD5E1] transition-all">
          {/* One brand-blue tile for every stat: a single accent, not a colour
              code — the values carry the meaning. */}
          <div className="w-10 h-10 rounded-lg bg-[#62A0EA]/10 admin-light:bg-[#1A5FB4]/10 text-[#62A0EA] admin-light:text-[#1A5FB4] flex items-center justify-center shrink-0">
            <stat.icon className="w-5 h-5" aria-hidden="true" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-400 admin-light:text-slate-500 uppercase tracking-wider">{stat.label}</p>
            <p className="text-xl font-bold text-white admin-light:text-slate-900 mt-0.5">{stat.value}</p>
          </div>
        </Link>
      ))}
    </div>
  );
}
