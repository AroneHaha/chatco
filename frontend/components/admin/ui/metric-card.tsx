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
    <div className="backdrop-blur-md bg-white/10 border border-white/20 rounded-xl shadow-xl p-6 flex items-start justify-between">
      <div>
        <p className="text-sm font-medium text-gray-300">{title}</p>
        <p className="text-3xl font-bold text-white mt-2">{value}</p>
        <p className={`text-sm font-semibold mt-2 flex items-center ${trendUp ? 'text-green-400' : 'text-red-400'}`}>
          <span>{trendUp ? '↑' : '↓'}</span>
          <span className="ml-1">{trend} from yesterday</span>
        </p>
      </div>
      <div className="p-3 bg-white/10 rounded-lg">
        <Icon className="text-blue-400" size={24} />
      </div>
    </div>
  );
}