// components/admin/lost-found/view-item-modal.tsx
'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Modal } from '@/components/admin/ui/modal';
import { Badge } from '@/components/admin/ui/badge';
import {
  BadgeCheck,
  BusFront,
  CalendarDays,
  Clock3,
  FileText,
  Hash,
  IdCard,
  ImagePlus,
  PackageSearch,
  Pencil,
  RotateCcw,
  Tag,
  Trash2,
  Upload,
  UserRound,
} from 'lucide-react';
import { itemCategories, type LostFoundItem } from '@/app/(admin)/lost-found/data/lost-found-data';

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
    case 'Released':
    case 'Returned':
    case 'Closed':
      return 'success';
    case 'Claimed':
      return 'info';
    case 'Expired':
    case 'Rejected':
      return 'danger';
    default:
      return 'warning';
  }
};

const categoryLabels = Object.fromEntries(itemCategories.map((category) => [category.value, category.label]));

function DetailField({
  icon,
  label,
  value,
  mono = false,
  tone = 'default',
}: {
  icon: ReactNode;
  label: string;
  value: ReactNode;
  mono?: boolean;
  tone?: 'default' | 'accent' | 'danger';
}) {
  const toneClasses = {
    default: 'border-white/8 bg-white/[0.035]',
    accent: 'border-[#62A0EA]/25 bg-[#62A0EA]/10',
    danger: 'border-red-400/25 bg-red-500/10',
  };

  return (
    <div className={`flex min-w-0 items-start gap-3 rounded-lg border p-3 ${toneClasses[tone]}`}>
      <div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md bg-black/20 text-[#62A0EA]">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">{label}</p>
        <p className={`mt-0.5 break-words text-sm font-semibold text-slate-100 ${mono ? 'font-mono' : ''}`}>{value}</p>
      </div>
    </div>
  );
}

export function ViewItemModal({
  isOpen,
  onClose,
  item,
  onEdit,
  onReactivate,
  onAddPhoto,
  onDeletePhoto,
  isActing,
}: ViewItemModalProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setSelectedIndex(0);
  }, [item?.id]);

  if (!item) return null;

  const photos = item.photos;
  const activePhoto = photos[selectedIndex] ?? photos[0] ?? null;
  const categoryLabel = categoryLabels[item.category] ?? item.category;

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
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="max-w-6xl" rounded="rounded-xl">
      <div className="space-y-5">
        <div className="flex flex-col gap-3 pr-10 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <Badge variant={getBadgeVariant(item.status)}>{item.status}</Badge>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-slate-300">
                <Tag className="h-3.5 w-3.5 text-[#62A0EA]" />
                {categoryLabel}
              </span>
            </div>
            <h2 className="truncate text-xl font-bold leading-tight text-white sm:text-2xl">{item.itemName}</h2>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-400">{item.description || 'No description provided.'}</p>
          </div>

          <div className="flex flex-shrink-0 items-center gap-2">
            {item.status === 'Expired' && (
              <button
                onClick={() => void onReactivate(item.id)}
                disabled={isActing}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-emerald-400/25 bg-emerald-400/10 px-3 py-2 text-xs font-bold text-emerald-200 transition-colors hover:bg-emerald-400/15 disabled:opacity-50"
              >
                <RotateCcw className="h-4 w-4" />
                Reactivate
              </button>
            )}
            <button
              onClick={() => onEdit(item)}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#62A0EA]/30 bg-[#62A0EA]/12 px-3 py-2 text-xs font-bold text-[#9CC7F5] transition-colors hover:bg-[#62A0EA]/20"
            >
              <Pencil className="h-4 w-4" />
              Edit
            </button>
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
          <section className="min-w-0">
            <div className="relative aspect-[4/3] overflow-hidden rounded-xl border border-white/10 bg-[#0B1628]">
              {activePhoto ? (
                <img src={activePhoto.url} alt={item.itemName} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full flex-col items-center justify-center gap-3 text-slate-600">
                  <PackageSearch className="h-16 w-16" />
                  <span className="text-xs font-semibold uppercase tracking-wider">No photo uploaded yet</span>
                </div>
              )}

              <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-black/75 via-black/35 to-transparent px-4 pb-4 pt-10">
                <span className="text-xs font-semibold text-white">{photos.length}/{MAX_PHOTOS} photos</span>
                {activePhoto && (
                  <button
                    type="button"
                    onClick={() => void handleDeletePhoto(activePhoto.id)}
                    disabled={isActing}
                    className="inline-flex items-center gap-1.5 rounded-md border border-red-400/30 bg-red-500/15 px-2.5 py-1.5 text-xs font-semibold text-red-200 transition-colors hover:bg-red-500/25 disabled:opacity-50"
                    title="Remove selected photo"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Remove
                  </button>
                )}
              </div>
            </div>

            <div className="mt-3 grid grid-cols-4 gap-2">
              {photos.map((photo, index) => (
                <div key={photo.id} className="relative">
                  <button
                    type="button"
                    onClick={() => setSelectedIndex(index)}
                    className={`aspect-square w-full overflow-hidden rounded-lg border transition-colors ${
                      index === selectedIndex
                        ? 'border-[#62A0EA] ring-2 ring-[#62A0EA]/20'
                        : 'border-white/10 hover:border-[#62A0EA]/45'
                    }`}
                  >
                    <img src={photo.url} alt={`Photo ${index + 1}`} className="h-full w-full object-cover" />
                  </button>
                  {index === 0 && (
                    <span className="pointer-events-none absolute bottom-1 left-1 rounded bg-black/60 px-1 py-0.5 text-[8px] font-semibold uppercase tracking-wider text-white">Thumb</span>
                  )}
                </div>
              ))}
              {photos.length < MAX_PHOTOS && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="flex aspect-square flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-white/15 bg-white/[0.03] text-slate-500 transition-colors hover:border-[#62A0EA] hover:text-[#62A0EA] disabled:opacity-50"
                >
                  {isUploading ? <Upload size={18} className="animate-pulse" /> : <ImagePlus size={18} />}
                  <span className="text-[9px] font-medium">{isUploading ? 'Uploading...' : 'Add'}</span>
                </button>
              )}
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelected} />
            </div>
          </section>

          <section className="min-w-0 space-y-4">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">Item Details</h3>
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <DetailField icon={<IdCard className="h-4 w-4" />} label="Plate Number" value={item.plateNumber || 'Plate unavailable'} />
                <DetailField icon={<Clock3 className="h-4 w-4" />} label="Estimated Time Lost" value={item.estimatedTimeLost || 'Time unavailable'} />
                <DetailField icon={<BusFront className="h-4 w-4" />} label="Driver" value={item.driverName || 'Driver unavailable'} />
                <DetailField icon={<UserRound className="h-4 w-4" />} label="Conductor" value={item.conductorName || 'Conductor unavailable'} />
                <DetailField icon={<FileText className="h-4 w-4" />} label="Reported By" value={item.reporterName || 'Reporter unavailable'} />
                <DetailField icon={<CalendarDays className="h-4 w-4" />} label="Date Posted" value={formattedDate} />
              </div>
            </div>

            {(item.claimedBy || item.status === 'Expired') && (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {item.claimedBy && (
                  <DetailField icon={<BadgeCheck className="h-4 w-4" />} label="Claimed By" value={item.claimedBy} tone="accent" />
                )}

                {item.status === 'Expired' && (
                  <DetailField
                    icon={<Clock3 className="h-4 w-4" />}
                    label="Expired"
                    value={item.expiredAt ? new Date(item.expiredAt).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' }) : '-'}
                    tone="danger"
                  />
                )}
              </div>
            )}

            <DetailField icon={<Hash className="h-4 w-4" />} label="Item ID" value={item.id} mono />
          </section>
        </div>
      </div>
    </Modal>
  );
}
