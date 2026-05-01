// components/admin/lost-found/view-item-modal.tsx
'use client';

import { Modal } from '@/components/admin/ui/modal';
import { Badge } from '@/components/admin/ui/badge';
import { MapPin, User, Truck, Clock, Tag, Calendar, UserCheck } from 'lucide-react';
import type { LostFoundItem } from '@/app/(admin)/lost-found/data/lost-found-data';

interface ViewItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: LostFoundItem | null;
}

const getBadgeVariant = (status: LostFoundItem['status']): 'success' | 'warning' | 'danger' | 'info' => {
  switch (status) {
    case 'Claimed': case 'Returned': return 'info';
    case 'Released': return 'success';
    case 'Unmatched': return 'warning';
    case 'Rejected': return 'danger';
    default: return 'info';
  }
};

export function ViewItemModal({ isOpen, onClose, item }: ViewItemModalProps) {
  if (!item) return null;

  const formattedDate = new Date(item.datePosted).toLocaleDateString('en-PH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      {/* Image */}
      <div className="relative rounded-lg overflow-hidden mb-4 h-56 bg-gray-800">
        <img src={item.imageUrl} alt={item.itemName} className="w-full h-full object-cover" />
        <div className="absolute top-3 right-3">
          <Badge variant={getBadgeVariant(item.status)}>{item.status}</Badge>
        </div>
        <div className="absolute top-3 left-3">
          <div className="px-2.5 py-1 bg-black/60 backdrop-blur-sm rounded-full text-xs text-gray-200 font-medium">
            {item.category}
          </div>
        </div>
      </div>

      {/* Title */}
      <h2 className="text-xl font-bold text-white mb-2">{item.itemName}</h2>
      <p className="text-sm text-gray-400 mb-5">{item.description}</p>

      {/* Details Grid */}
      <div className="space-y-3">
        <div className="flex items-center gap-3 p-3 bg-white/5 rounded-lg border border-white/10">
          <MapPin size={16} className="text-blue-400 flex-shrink-0" />
          <div>
            <p className="text-xs text-gray-400">Plate Number</p>
            <p className="text-sm text-white font-medium">{item.plateNumber}</p>
          </div>
        </div>

        <div className="flex items-center gap-3 p-3 bg-white/5 rounded-lg border border-white/10">
          <Clock size={16} className="text-yellow-400 flex-shrink-0" />
          <div>
            <p className="text-xs text-gray-400">Estimated Time Lost</p>
            <p className="text-sm text-white font-medium">{item.estimatedTimeLost}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center gap-3 p-3 bg-white/5 rounded-lg border border-white/10">
            <Truck size={16} className="text-green-400 flex-shrink-0" />
            <div>
              <p className="text-xs text-gray-400">Driver</p>
              <p className="text-sm text-white font-medium">{item.driverName}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 bg-white/5 rounded-lg border border-white/10">
            <User size={16} className="text-purple-400 flex-shrink-0" />
            <div>
              <p className="text-xs text-gray-400">Conductor</p>
              <p className="text-sm text-white font-medium">{item.conductorName}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center gap-3 p-3 bg-white/5 rounded-lg border border-white/10">
            <User size={16} className="text-cyan-400 flex-shrink-0" />
            <div>
              <p className="text-xs text-gray-400">Reported By</p>
              <p className="text-sm text-white font-medium">{item.reporterName}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 bg-white/5 rounded-lg border border-white/10">
            <Calendar size={16} className="text-orange-400 flex-shrink-0" />
            <div>
              <p className="text-xs text-gray-400">Date Posted</p>
              <p className="text-sm text-white font-medium">{formattedDate}</p>
            </div>
          </div>
        </div>

        {item.claimedBy && (
          <div className="flex items-center gap-3 p-3 bg-blue-500/10 rounded-lg border border-blue-500/30">
            <UserCheck size={16} className="text-blue-400 flex-shrink-0" />
            <div>
              <p className="text-xs text-blue-300">Claimed By</p>
              <p className="text-sm text-blue-200 font-medium">{item.claimedBy}</p>
            </div>
          </div>
        )}

        <div className="flex items-center gap-3 p-3 bg-white/5 rounded-lg border border-white/10">
          <Tag size={16} className="text-gray-400 flex-shrink-0" />
          <div>
            <p className="text-xs text-gray-400">Item ID</p>
            <p className="text-sm text-gray-300 font-mono">{item.id}</p>
          </div>
        </div>
      </div>
    </Modal>
  );
}