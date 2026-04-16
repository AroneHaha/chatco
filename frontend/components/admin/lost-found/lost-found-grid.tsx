// components/admin/lost-found/lost-found-grid.tsx
import { GlassCard } from '@/components/admin/ui/glass-card';
import { Badge } from '@/components/admin/ui/badge';
import { Eye, History, List } from 'lucide-react';

interface LostFoundGridProps {
  items: any[];
  onViewClaims: (itemId: string) => void;
  onViewHistory: (itemId: string) => void;
}

export function LostFoundGrid({ items, onViewClaims, onViewHistory }: LostFoundGridProps) {
  return (
    <>
      {items.map((item) => (
        <GlassCard key={item.id} className="overflow-hidden group flex flex-col">
          <div className="relative h-48 bg-gray-800 flex-shrink-0">
            <img src={item.imageUrl} alt={item.itemName} className="w-full h-full object-cover" />
            <div className="absolute top-2 right-2">
              <Badge variant={item.status === 'Claimed' || item.status === 'Returned' ? 'info' : item.status === 'Rejected' ? 'danger' : 'warning'}>
                {item.status}
              </Badge>
            </div>
            <div className="absolute top-2 left-2">
              <div className="px-2 py-1 bg-black/60 backdrop-blur-sm rounded-full text-xs text-gray-200">
                {item.category}
              </div>
            </div>
          </div>

          <div className="p-4 flex flex-col flex-1">
            <h3 className="text-sm font-semibold text-white mb-1">{item.itemName}</h3>
            <p className="text-xs text-gray-400 line-clamp-2 mb-3">{item.description}</p>
            
            {/* Exact Commuter List Format */}
            <div className="mt-auto space-y-1.5 text-xs border-t border-white/10 pt-3">
              <div className="flex justify-between">
                <span className="text-gray-400">Plate Number</span>
                <span className="text-gray-200 font-medium">{item.plateNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Est. Time</span>
                <span className="text-gray-200 font-medium">{item.estimatedTimeLost}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Driver</span>
                <span className="text-gray-200 font-medium">{item.driverName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Conductor</span>
                <span className="text-gray-200 font-medium">{item.conductorName}</span>
              </div>
              {item.claimedBy && (
                <div className="flex justify-between pt-1 border-t border-white/5">
                  <span className="text-gray-400">Claimed By</span>
                  <span className="text-blue-400 font-medium">{item.claimedBy}</span>
                </div>
              )}
            </div>
          </div>

          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center space-x-4 z-10">
            <button className="p-2 bg-white/20 rounded-full text-white hover:bg-white/30" title="View Details"><Eye size={20} /></button>
            <button onClick={() => onViewClaims(item.id)} className="p-2 bg-white/20 rounded-full text-white hover:bg-white/30" title="View Claims"><List size={20} /></button>
            <button onClick={() => onViewHistory(item.id)} className="p-2 bg-white/20 rounded-full text-white hover:bg-white/30" title="View History"><History size={20} /></button>
          </div>
        </GlassCard>
      ))}
    </>
  );
}