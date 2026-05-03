// components/admin/monitoring/alert-feed.tsx
import { AlertTriangle, Gauge, Clock } from 'lucide-react';

export function AlertFeed() {
  const alerts = [
    { type: 'Emergency', icon: AlertTriangle, color: 'text-red-400', message: 'Unit ABC-123: Panic button activated.', time: 'Just now' },
    { type: 'Overspeeding', icon: Gauge, color: 'text-orange-400', message: 'Unit XYZ-789: 85 kph in a 60 kph zone.', time: '5m ago' },
    { type: 'Traffic', icon: Clock, color: 'text-amber-400', message: 'Unit DEF-456: Stalled for 10 mins.', time: '12m ago' },
  ];

  return (
    <div className="bg-[#131C2E] border border-[#1E2D45] p-4 rounded-lg h-full">
      <h2 className="text-lg font-semibold text-white mb-4">Live Alert Feed</h2>
      <div className="space-y-3 overflow-y-auto max-h-96">
        {alerts.map((alert, idx) => {
          const Icon = alert.icon;
          return (
            <div key={idx} className="flex items-start space-x-3 text-sm p-3 bg-[#0E1628] rounded-md border border-[#1E2D45]">
              <Icon className={`mt-0.5 ${alert.color}`} size={18} />
              <div>
                <p className="font-medium text-white">{alert.type}</p>
                <p className="text-slate-400">{alert.message}</p>
                <p className="text-xs text-slate-500 mt-1">{alert.time}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}