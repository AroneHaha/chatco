// components/admin/lost-found/view-item-modal.tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import { Modal } from '@/components/admin/ui/modal';
import { Badge } from '@/components/admin/ui/badge';
import { MapPin, User, Truck, Clock, Tag, Calendar, UserCheck, Pencil, RotateCcw, Plus, X, Upload } from 'lucide-react';
import type { LostFoundItem } from '@/app/(admin)/lost-found/data/lost-found-data';

const MAX_PHOTOS = 3;

interface ViewItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: LostFoundItem | null;
  onEdit: (item: LostFoundItem) => void;
  onReactivate: (itemId: string) => Promise<void>;
  onAddPhoto: (itemId: string, file: File) => Promise<void>;
  onDeletePhoto: (itemId: string, photoId: string) => Promise<void>;
  isActing?: boolean;
}

const getBadgeVariant = (status: LostFoundItem['status']): 'success' | 'warning' | 'danger' | 'info' => {
  switch (status) {
    case 'Claimed': case 'Returned': return 'info';
    case 'Released': return 'success';
    case 'Unmatched': return 'warning';
    case 'Rejected': case 'Expired': return 'danger';
    default: return 'info';
  }
};

export function ViewItemModal({ isOpen, onClose, item, onEdit, onReactivate, onAddPhoto, onDeletePhoto, isActing }: ViewItemModalProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset the selected photo whenever a different item is opened.
  useEffect(() => { setSelectedIndex(0); }, [item?.id]);

  if (!item) return null;

  const photos = item.photos;
  const activePhoto = photos[selectedIndex] ?? photos[0] ?? null;

  const formattedDate = new Date(item.datePosted).toLocaleDateString('en-PH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setIsUploading(true);
    try {
      await onAddPhoto(item.id, file);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeletePhoto = async (photoId: string) => {
    setSelectedIndex(0);
    await onDeletePhoto(item.id, photoId);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="max-w-5xl" rounded="rounded-xl">
      {/* Mobile: stacked layout. Desktop: side-by-side */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left — Photo gallery */}
        <div className="w-full lg:w-[400px] flex-shrink-0">
          <div className="relative rounded-lg overflow-hidden h-56 sm:h-72 lg:h-[380px] bg-[#0E1628]">
            {activePhoto ? (
              <img src={activePhoto.url} alt={item.itemName} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center gap-3 text-slate-600">
                <svg className="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A1.5 1.5 0 0021.75 19.5V4.5A1.5 1.5 0 0020.25 3H3.75A1.5 1.5 0 002.25 4.5v15A1.5 1.5 0 003.75 21z" /></svg>
                <span className="text-xs font-semibold uppercase tracking-wider">No photo uploaded yet</span>
              </div>
            )}
            <div className="absolute top-3 right-3">
              <Badge variant={getBadgeVariant(item.status)}>{item.status}</Badge>
            </div>
            <div className="absolute top-3 left-3">
              <div className="px-2.5 py-1 bg-black/60 backdrop-blur-sm rounded-full text-xs text-slate-200 font-medium">
                {item.category}
              </div>
            </div>
          </div>

          {/* Thumbnail strip + add/remove controls */}
          <div className="mt-3 grid grid-cols-3 gap-2">
            {photos.map((photo, index) => (
              <div key={photo.id} className="relative group">
                <button
                  type="button"
                  onClick={() => setSelectedIndex(index)}
                  className={`w-full aspect-square rounded-md overflow-hidden border-2 transition-colors ${index === selectedIndex ? 'border-[#62A0EA]' : 'border-[#1E2D45] hover:border-[#2A3A55]'}`}
                >
                  <img src={photo.url} alt={`Photo ${index + 1}`} className="w-full h-full object-cover" />
                </button>
                {index === 0 && (
                  <span className="absolute bottom-1 left-1 px-1 py-0.5 rounded bg-black/60 text-[8px] font-semibold uppercase tracking-wider text-white pointer-events-none">Thumb</span>
                )}
                <button
                  type="button"
                  onClick={() => void handleDeletePhoto(photo.id)}
                  disabled={isActing}
                  className="absolute -top-1.5 -right-1.5 p-0.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50"
                  title="Remove photo"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
            {photos.length < MAX_PHOTOS && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="aspect-square flex flex-col items-center justify-center gap-1 border-2 border-dashed border-[#1E2D45] rounded-md text-slate-500 hover:text-[#62A0EA] hover:border-[#62A0EA] transition-colors disabled:opacity-50"
              >
                {isUploading ? <Upload size={16} className="animate-pulse" /> : <Plus size={16} />}
                <span className="text-[9px] font-medium">{isUploading ? 'Uploading…' : 'Add'}</span>
              </button>
            )}
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelected} />
          </div>
        </div>

        {/* Right — Details */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3 mb-1.5">
            <h2 className="text-xl sm:text-2xl font-bold text-white">{item.itemName}</h2>
            <div className="flex items-center gap-2 flex-shrink-0">
              {item.status === 'Expired' && (
                <button
                  onClick={() => void onReactivate(item.id)}
                  disabled={isActing}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 border border-emerald-500/30 transition-colors disabled:opacity-50"
                >
                  <RotateCcw size={14} /> Reactivate
                </button>
              )}
              <button
                onClick={() => onEdit(item)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-[#62A0EA]/10 text-[#62A0EA] hover:bg-[#62A0EA]/20 border border-[#62A0EA]/30 transition-colors"
              >
                <Pencil size={14} /> Edit
              </button>
            </div>
          </div>
          <p className="text-sm text-slate-400 mb-5">{item.description}</p>

          <div className="space-y-3 max-h-[50vh] lg:max-h-[330px] overflow-y-auto pr-1">
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

            {/* 2-col on tablet+, 1-col on mobile */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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

            {item.status === 'Expired' && (
              <div className="flex items-center gap-3 p-3 bg-red-500/10 rounded-md border border-red-500/30">
                <Clock size={16} className="text-red-400 flex-shrink-0" />
                <div>
                  <p className="text-xs text-red-400/70">Expired</p>
                  <p className="text-sm text-red-300 font-medium">
                    {item.expiredAt ? new Date(item.expiredAt).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' }) : '—'}
                  </p>
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
