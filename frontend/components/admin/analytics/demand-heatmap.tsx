// components/admin/analytics/demand-heatmap.tsx
import { GlassCard } from '@/components/admin/ui/glass-card'; 
export function DemandHeatmap() {
    return (
        <GlassCard className="p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Commuter Demand Heatmap</h2>
            <div className="h-64 flex items-center justify-center bg-white/5 rounded-lg border-2 border-dashed border-white/20">
                <p className="text-gray-400">Heatmap visualization will be rendered here.</p>
            </div>
        </GlassCard>
    );
}