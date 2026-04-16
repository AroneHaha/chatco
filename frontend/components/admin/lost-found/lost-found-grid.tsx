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
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {items.map((item) => (
        <GlassCard key={item.id} className="overflow-hidden group">
          {/* Image Container */}
          <div className="relative h-48 bg-gray-800">
            <img
              src={item.imageUrl}
              alt={item.description}
              className="w-full h-full object-cover"
            />
            {/* Status Badge Overlay */}
            <div className="absolute top-2 right-2">
              <Badge variant={
                item.status === 'Released' ? 'success' :
                item.status === 'Returned' ? 'info' :
                item.status === 'Rejected' ? 'danger' : 'warning'
              }>
                {item.status}
              </Badge>
            </div>
          </div>

          {/* Content */}
          <div className="p-4">
            <h3 className="text-sm font-semibold text-white truncate mb-2" title={item.description}>
              {item.description}
            </h3>
            <div className="space-y-1 text-xs text-gray-400">
              <p>Reported by: <span className="text-gray-300">{item.reporterName}</span></p>
              <p>Claimed by: <span className="text-gray-300">{item.claimedBy || 'N/A'}</span></p>
            </div>
          </div>

          {/* Hover Actions */}
          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center space-x-4">
            <button className="p-2 bg-white/20 rounded-full text-white hover:bg-white/30" title="View Details">
              <Eye size={20} />
            </button>
            <button
              onClick={() => onViewClaims(item.id)}
              className="p-2 bg-white/20 rounded-full text-white hover:bg-white/30"
              title="View Claims"
            >
              <List size={20} />
            </button>
            <button
              onClick={() => onViewHistory(item.id)}
              className="p-2 bg-white/20 rounded-full text-white hover:bg-white/30"
              title="View History"
            >
              <History size={20} />
            </button>
          </div>
        </GlassCard>
      ))}
    </div>
  );
}