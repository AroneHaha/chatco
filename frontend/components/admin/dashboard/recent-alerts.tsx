// components/admin/dashboard/recent-alerts.tsx'
import { AlertTriangle, Clock } from 'lucide-react';

export function RecentAlerts() {
  const alerts = [
    { id: 1, type: 'Emergency', message: 'Panic button triggered on Unit ABC-123', time: '2 mins ago' },
    { id: 2, type: 'Overspeeding', message: 'Unit XYZ-789 detected at 85 kph', time: '15 mins ago' },
  ];

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h2 className="text-lg font-semibold text-gray-800 mb-4">Recent Alerts</h2>
      <div className="space-y-3">
        {alerts.map((alert) => (
          <div key={alert.id} className="flex items-start space-x-3 p-3 bg-red-50 rounded-lg">
            <AlertTriangle className="text-red-500 mt-0.5" size={18} />
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">{alert.type}</p>
              <p className="text-sm text-gray-600">{alert.message}</p>
            </div>
            <div className="flex items-center text-xs text-gray-500">
              <Clock size={12} className="mr-1" />
              {alert.time}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}