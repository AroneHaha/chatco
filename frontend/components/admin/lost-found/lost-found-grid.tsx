// components/admin/lost-found/lost-found-grid.tsx
import { Badge } from '@/components/admin/ui/badge';
import { Eye, History, List } from 'lucide-react';
import type { LostFoundItem } from '@/app/(admin)/lost-found/data/lost-found-data';

interface LostFoundGridProps {
  items: LostFoundItem[];
  onViewClaims: (itemId: string) => void;
  onViewHistory: (itemId: string) => void;
  onViewDetails: (itemId: string) => void;
}

export function LostFoundGrid({ items, onViewClaims, onViewHistory, onViewDetails }: LostFoundGridProps) {
  return (
    <>
      {items.map((item) => (
        <div key={item.id} className="bg-[#131C2E] border border-[#1E2D45] rounded-lg overflow-hidden group flex flex-col relative">
          <div className="relative h-48 bg-[#0E1628] flex-shrink-0">
            <img src={item.imageUrl} alt={item.itemName} className="w-full h-full object-cover" />
            <div className="absolute top-2 right-2">
              <Badge variant={item.status === 'Claimed' || item.status === 'Returned' ? 'info' : item.status === 'Rejected' ? 'danger' : 'warning'}>
                {item.status}
              </Badge>
            </div>
            <div className="absolute top-2 left-2">
              <div className="px-2 py-1 bg-black/60 backdrop-blur-sm rounded-full text-xs text-slate-200">
                {item.category}
              </div>
            </div>
          </div>

          <div className="p-4 flex flex-col flex-1">
            <h3 className="text-sm font-semibold text-white mb-1">{item.itemName}</h3>
            <p className="text-xs text-slate-400 line-clamp-2 mb-3">{item.description}</p>

            {/* Exact Commuter List Format */}
            <div className="mt-auto space-y-1.5 text-xs border-t border-[#1E2D45] pt-3">
              <div className="flex justify-between">
                <span className="text-slate-500">Plate Number</span>
                <span className="text-slate-200 font-medium">{item.plateNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Est. Time</span>
                <span className="text-slate-200 font-medium">{item.estimatedTimeLost}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Driver</span>
                <span className="text-slate-200 font-medium">{item.driverName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Conductor</span>
                <span className="text-slate-200 font-medium">{item.conductorName}</span>
              </div>
              {item.claimedBy && (
                <div className="flex justify-between pt-1 border-t border-[#1E2D45]">
                  <span className="text-slate-500">Claimed By</span>
                  <span className="text-[#62A0EA] font-medium">{item.claimedBy}</span>
                </div>
              )}
            </div>
          </div>

          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center space-x-4 z-10">
            <button onClick={() => onViewDetails(item.id)} className="p-2 bg-white/20 rounded-full text-white hover:bg-white/30" title="View Details"><Eye size={20} /></button>
            <button onClick={() => onViewClaims(item.id)} className="p-2 bg-white/20 rounded-full text-white hover:bg-white/30" title="View Claims"><List size={20} /></button>
            <button onClick={() => onViewHistory(item.id)} className="p-2 bg-white/20 rounded-full text-white hover:bg-white/30" title="View History"><History size={20} /></button>
          </div>
        </div>
      ))}
    </>
  );
}