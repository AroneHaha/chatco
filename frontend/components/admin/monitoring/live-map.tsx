import { GlassCard } from '@/components/admin/ui/glass-card';

export function LiveMap() {
  return (
    <GlassCard className="h-full min-h-[500px] flex items-center justify-center p-6">
      <div className="text-center text-white">
        <p className="text-lg font-semibold mb-2">Live Map View</p>
        <p className="text-sm opacity-80">Integration with Leaflet or Google Maps will go here.</p>
        <p className="text-xs opacity-60 mt-2">It will display real-time vehicle locations and alerts.</p>
      </div>
    </GlassCard>
  );
}