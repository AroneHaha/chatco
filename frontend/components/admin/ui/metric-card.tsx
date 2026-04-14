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
    <div className="bg-white rounded-lg shadow p-6 flex items-start justify-between">
      <div>
        <p className="text-sm font-medium text-gray-600">{title}</p>
        <p className="text-3xl font-bold text-gray-900 mt-2">{value}</p>
        <p className={`text-sm font-semibold mt-2 flex items-center ${trendUp ? 'text-green-600' : 'text-red-600'}`}>
          <span>{trendUp ? '↑' : '↓'}</span>
          <span className="ml-1">{trend} from yesterday</span>
        </p>
      </div>
      <div className="p-3 bg-blue-100 rounded-lg">
        <Icon className="text-blue-600" size={24} />
      </div>
    </div>
  );
}