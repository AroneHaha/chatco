// components/admin/dashboard/recent-alerts.tsx
import { GlassCard } from '@/components/admin/ui/glass-card';
import { AlertTriangle, Clock } from 'lucide-react';

export function RecentAlerts() {
  const alerts = [
    { id: 1, type: 'Emergency', message: 'Panic button triggered on Unit ABC-123', time: '2 mins ago' },
    { id: 2, type: 'Overspeeding', message: 'Unit XYZ-789 detected at 85 kph', time: '15 mins ago' },
  ];

  return (
    <GlassCard className="p-6">
      <h2 className="text-lg font-semibold text-white mb-4">Recent Alerts</h2>
      <div className="space-y-3">
        {alerts.map((alert) => (
          <div key={alert.id} className="flex items-start space-x-3 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
            <AlertTriangle className="text-red-400 mt-0.5" size={18} />
            <div className="flex-1">
              <p className="text-sm font-medium text-white">{alert.type}</p>
              <p className="text-sm text-gray-300">{alert.message}</p>
            </div>
            <div className="flex items-center text-xs text-gray-400">
              <Clock size={12} className="mr-1" />
              {alert.time}
            </div>
          </div>
        ))}
      </div>
    </GlassCard>
  );
}