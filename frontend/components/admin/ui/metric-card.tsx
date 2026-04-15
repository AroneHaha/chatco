// components/admin/ui/metric-card.tsx
import { LucideIcon } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend: string;
  trendUp: boolean;
}

export function MetricCard({ title, value, icon: Icon, trend, trendUp }: MetricCardProps) {
  return (
    <div className="backdrop-blur-md bg-white/10 border border-white/20 rounded-xl shadow-xl p-3 flex flex-col h-full">
      <div className="flex items-center space-x-2 mb-2">
        <div className="p-1.5 bg-white/10 rounded-lg flex-shrink-0">
          <Icon className="text-blue-400" size={18} />
        </div>
        <p className="text-xs font-medium text-gray-400 truncate">{title}</p>
      </div>

      <p className="text-xl font-bold text-white mt-auto mb-1">{value}</p>
      
      <p className={`text-xs font-semibold flex items-center ${trendUp ? 'text-green-400' : 'text-red-400'}`}>
        <span>{trendUp ? '↑' : '↓'}</span>
        <span className="ml-1">{trend}</span>
      </p>
    </div>
  );
}