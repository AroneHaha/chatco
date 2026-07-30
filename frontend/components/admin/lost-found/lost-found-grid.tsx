// components/admin/lost-found/lost-found-grid.tsx
import { Badge } from '@/components/admin/ui/badge';
import { Eye, List, CheckCircle, User, Pencil, RotateCcw } from 'lucide-react';
import type { LostFoundItem } from '@/app/(admin)/lost-found/data/lost-found-data';

interface LostFoundGridProps {
  items: LostFoundItem[];
  onViewClaims: (itemId: string) => void;
  onViewDetails: (itemId: string) => void;
  onEdit: (item: LostFoundItem) => void;
  onClose?: (itemId: string) => void;
  onReactivate?: (itemId: string) => void;
  isActing?: boolean;
}

function formatPostedDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

export function LostFoundGrid({ items, onViewClaims, onViewDetails, onEdit, onClose, onReactivate, isActing }: LostFoundGridProps) {
  return (
    <>
      {items.map((item) => (
        <div key={item.id} className="bg-[#131C2E] border border-[#1E2D45] rounded-xl overflow-hidden group flex flex-col relative shadow-lg shadow-black/20 hover:border-[#2A3A55] transition-colors">
          <div className="relative h-48 bg-[#0E1628] flex-shrink-0">
            {item.imageUrl ? (
              <img src={item.imageUrl} alt={item.itemName} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-slate-600">
                <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A1.5 1.5 0 0021.75 19.5V4.5A1.5 1.5 0 0020.25 3H3.75A1.5 1.5 0 002.25 4.5v15A1.5 1.5 0 003.75 21z" /></svg>
                <span className="text-[10px] font-semibold uppercase tracking-wider">No photo yet</span>
              </div>
            )}
            <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-black/50 to-transparent pointer-events-none" />
            <div className="absolute top-2.5 right-2.5">
              <Badge variant={item.status === 'Claimed' || item.status === 'Returned' ? 'info' : item.status === 'Rejected' || item.status === 'Expired' ? 'danger' : 'warning'}>
                {item.status}
              </Badge>
            </div>
            <div className="absolute top-2.5 left-2.5">
              <div className="px-2.5 py-1 bg-black/50 backdrop-blur-sm border border-white/10 rounded-full text-[10px] font-semibold uppercase tracking-wider text-slate-200">
                {item.category}
              </div>
            </div>
          </div>

          <div className="p-4 flex flex-col flex-1">
            <h3 className="text-sm font-semibold text-white mb-1 leading-tight">{item.itemName}</h3>
            <p className="text-xs text-slate-400 line-clamp-2 mb-3">{item.description}</p>

            <div className="mt-auto grid grid-cols-2 gap-x-3 gap-y-2 text-xs bg-[#0E1628]/60 border border-[#1E2D45] rounded-lg p-3">
              <div><p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Plate No.</p><p className="text-slate-200 font-medium truncate">{item.plateNumber}</p></div>
              <div><p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Est. Time</p><p className="text-slate-200 font-medium truncate">{item.estimatedTimeLost}</p></div>
              <div><p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Driver</p><p className="text-slate-200 font-medium truncate">{item.driverName}</p></div>
              <div><p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Conductor</p><p className="text-slate-200 font-medium truncate">{item.conductorName}</p></div>
            </div>

            {item.claimedBy && (
              <div className="mt-2.5 flex items-center gap-1.5 text-xs text-[#62A0EA] bg-[#62A0EA]/10 border border-[#62A0EA]/20 rounded-lg px-2.5 py-1.5">
                <User size={12} className="flex-shrink-0" />
                <span className="truncate">Claimed by <span className="font-medium">{item.claimedBy}</span></span>
              </div>
            )}

            <p className="mt-3 text-center text-[10px] text-slate-600">
              Reported by {item.reporterName} · {formatPostedDate(item.datePosted)}
            </p>
          </div>

          {/* Action Buttons — always visible on mobile (touch), hover-visible on desktop */}
          <div className="flex items-center justify-around border-t border-[#1E2D45] bg-[#0E1628] p-2.5 flex-shrink-0 lg:absolute lg:inset-0 lg:border-t-0 lg:bg-black/60 lg:opacity-0 lg:group-hover:opacity-100 lg:transition-opacity lg:duration-200 lg:p-0 lg:backdrop-blur-sm lg:z-10">
            <button onClick={() => onViewDetails(item.id)} className="flex items-center gap-1.5 px-3 py-2 rounded-md text-slate-300 hover:bg-white/10 hover:text-white text-xs font-medium transition-colors active:scale-95" title="View Details">
              <Eye size={16} />
              <span className="lg:hidden">Details</span>
            </button>
            <button onClick={() => onViewClaims(item.id)} className="flex items-center gap-1.5 px-3 py-2 rounded-md text-slate-300 hover:bg-white/10 hover:text-white text-xs font-medium transition-colors active:scale-95" title="View Claims">
              <List size={16} />
              <span className="lg:hidden">Claims</span>
            </button>
            <button onClick={() => onEdit(item)} className="flex items-center gap-1.5 px-3 py-2 rounded-md text-slate-300 hover:bg-white/10 hover:text-white text-xs font-medium transition-colors active:scale-95" title="Edit Item">
              <Pencil size={16} />
              <span className="lg:hidden">Edit</span>
            </button>
            {onClose && item.status === 'Released' && (
              <button
                onClick={() => onClose(item.id)}
                disabled={isActing}
                className="flex items-center gap-1.5 px-3 py-2 rounded-md text-emerald-300 hover:bg-emerald-500/10 hover:text-emerald-200 text-xs font-medium transition-colors active:scale-95 disabled:opacity-50"
                title="Close item (finalize handover)"
              >
                <CheckCircle size={16} />
                <span className="lg:hidden">Close</span>
              </button>
            )}
            {onReactivate && item.status === 'Expired' && (
              <button
                onClick={() => onReactivate(item.id)}
                disabled={isActing}
                className="flex items-center gap-1.5 px-3 py-2 rounded-md text-emerald-300 hover:bg-emerald-500/10 hover:text-emerald-200 text-xs font-medium transition-colors active:scale-95 disabled:opacity-50"
                title="Reactivate item"
              >
                <RotateCcw size={16} />
                <span className="lg:hidden">Reactivate</span>
              </button>
            )}
          </div>
        </div>
      ))}
    </>
  );
}