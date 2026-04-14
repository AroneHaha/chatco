// components/admin/monitoring/alert-feed.tsx
import { AlertTriangle, Gauge, Clock } from 'lucide-react';

export function AlertFeed() {
  const alerts = [
    { type: 'Emergency', icon: AlertTriangle, color: 'text-red-500', message: 'Unit ABC-123: Panic button activated.', time: 'Just now' },
    { type: 'Overspeeding', icon: Gauge, color: 'text-orange-500', message: 'Unit XYZ-789: 85 kph in a 60 kph zone.', time: '5m ago' },
    { type: 'Traffic', icon: Clock, color: 'text-yellow-500', message: 'Unit DEF-456: Stalled for 10 mins.', time: '12m ago' },
  ];

  return (
    <div className="bg-white p-4 rounded-lg shadow h-full">
      <h2 className="text-lg font-semibold text-gray-800 mb-4">Live Alert Feed</h2>
      <div className="space-y-3 overflow-y-auto max-h-96">
        {alerts.map((alert, idx) => {
          const Icon = alert.icon;
          return (
            <div key={idx} className="flex items-start space-x-3 text-sm">
              <Icon className={`mt-0.5 ${alert.color}`} size={18} />
              <div>
                <p className="font-medium text-gray-900">{alert.type}</p>
                <p className="text-gray-600">{alert.message}</p>
                <p className="text-xs text-gray-500 mt-1">{alert.time}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}