// components/admin/ui/metric-card.tsx
import { LucideIcon } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: string;
  trendUp?: boolean;
  iconColor?: string;
  iconBg?: string;
}

export function MetricCard({
  title,
  value,
  icon: Icon,
  trend,
  trendUp,
  iconColor = 'text-[#62A0EA]',
  iconBg = 'bg-[#62A0EA]/10',
}: MetricCardProps) {
  return (
    <div className="bg-[#131C2E] border border-[#1E2D45] rounded-lg p-4 flex flex-col h-full">
      <div className="flex items-center gap-3 mb-3">
        <div className={`p-2 rounded-lg ${iconBg} flex-shrink-0`}>
          <Icon className={iconColor} size={18} />
        </div>
        <p className="text-xs font-medium text-slate-400 truncate">{title}</p>
      </div>

      <p className="text-xl font-bold text-slate-100 mt-auto mb-1">{value}</p>

      {trend && (
        <p className={`text-xs font-medium flex items-center gap-1 ${trendUp ? 'text-emerald-400' : 'text-red-400'}`}>
          <span>{trendUp ? '\u2191' : '\u2193'}</span>
          <span>{trend}</span>
        </p>
      )}
    </div>
  );
}
