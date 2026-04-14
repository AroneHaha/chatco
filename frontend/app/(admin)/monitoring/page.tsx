import { LiveMap } from '@/components/admin/monitoring/live-map';
import { AlertFeed } from '@/components/admin/monitoring/alert-feed';

export default function MonitoringPage() {
  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Live Monitoring</h1>
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2">
          <LiveMap />
        </div>
        <div className="xl:col-span-1">
          <AlertFeed />
        </div>
      </div>
    </div>
  );
}