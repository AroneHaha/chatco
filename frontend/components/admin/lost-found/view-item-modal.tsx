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
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="max-w-5xl" rounded="rounded-none">
      <div className="flex gap-6">
        {/* Left — Image */}
        <div className="w-[400px] flex-shrink-0">
          <div className="relative rounded-lg overflow-hidden h-[420px] bg-[#0E1628]">
            <img src={item.imageUrl} alt={item.itemName} className="w-full h-full object-cover" />
            <div className="absolute top-3 right-3">
              <Badge variant={getBadgeVariant(item.status)}>{item.status}</Badge>
            </div>
            <div className="absolute top-3 left-3">
              <div className="px-2.5 py-1 bg-black/60 backdrop-blur-sm rounded-full text-xs text-slate-200 font-medium">
                {item.category}
              </div>
            </div>
          </div>
        </div>

        {/* Right — Details */}
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl font-bold text-white mb-1.5">{item.itemName}</h2>
          <p className="text-sm text-slate-400 mb-5">{item.description}</p>

          <div className="space-y-3 max-h-[370px] overflow-y-auto pr-1">
            <div className="flex items-center gap-3 p-3 bg-[#0E1628] rounded-md border border-[#1E2D45]">
              <MapPin size={16} className="text-[#62A0EA] flex-shrink-0" />
              <div>
                <p className="text-xs text-slate-500">Plate Number</p>
                <p className="text-sm text-white font-medium">{item.plateNumber}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-[#0E1628] rounded-md border border-[#1E2D45]">
              <Clock size={16} className="text-amber-400 flex-shrink-0" />
              <div>
                <p className="text-xs text-slate-500">Estimated Time Lost</p>
                <p className="text-sm text-white font-medium">{item.estimatedTimeLost}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center gap-3 p-3 bg-[#0E1628] rounded-md border border-[#1E2D45]">
                <Truck size={16} className="text-sky-400 flex-shrink-0" />
                <div>
                  <p className="text-xs text-slate-500">Driver</p>
                  <p className="text-sm text-white font-medium">{item.driverName}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-[#0E1628] rounded-md border border-[#1E2D45]">
                <User size={16} className="text-violet-400 flex-shrink-0" />
                <div>
                  <p className="text-xs text-slate-500">Conductor</p>
                  <p className="text-sm text-white font-medium">{item.conductorName}</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center gap-3 p-3 bg-[#0E1628] rounded-md border border-[#1E2D45]">
                <User size={16} className="text-cyan-400 flex-shrink-0" />
                <div>
                  <p className="text-xs text-slate-500">Reported By</p>
                  <p className="text-sm text-white font-medium">{item.reporterName}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-[#0E1628] rounded-md border border-[#1E2D45]">
                <Calendar size={16} className="text-orange-400 flex-shrink-0" />
                <div>
                  <p className="text-xs text-slate-500">Date Posted</p>
                  <p className="text-sm text-white font-medium">{formattedDate}</p>
                </div>
              </div>
            </div>

            {item.claimedBy && (
              <div className="flex items-center gap-3 p-3 bg-[#62A0EA]/10 rounded-md border border-[#62A0EA]/30">
                <UserCheck size={16} className="text-[#62A0EA] flex-shrink-0" />
                <div>
                  <p className="text-xs text-[#62A0EA]/70">Claimed By</p>
                  <p className="text-sm text-[#62A0EA] font-medium">{item.claimedBy}</p>
                </div>
              </div>
            )}

            <div className="flex items-center gap-3 p-3 bg-[#0E1628] rounded-md border border-[#1E2D45]">
              <Tag size={16} className="text-slate-500 flex-shrink-0" />
              <div>
                <p className="text-xs text-slate-500">Item ID</p>
                <p className="text-sm text-slate-300 font-mono">{item.id}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}