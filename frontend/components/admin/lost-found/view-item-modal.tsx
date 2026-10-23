// components/admin/lost-found/view-item-modal.tsx
'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Modal } from '@/components/admin/ui/modal';
import { Check, Copy, ImagePlus, PackageSearch, Pencil, RotateCcw, X } from 'lucide-react';
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


const categoryLabels = Object.fromEntries(itemCategories.map((category) => [category.value, category.label]));

function GroupLabel({ children }: { children: ReactNode }) {
  return <h3 className="mb-4 text-[11px] font-semibold uppercase tracking-wider text-slate-500">{children}</h3>;
}

/** Label over value; a missing value keeps its fallback copy but drops to muted. */
function Fact({ label, value, fallback }: { label: string; value: string | null | undefined; fallback: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-semibold text-slate-500">{label}</dt>
      <dd className={`mt-1 break-words text-sm ${value ? 'font-semibold text-slate-100 admin-light:text-slate-900' : 'text-slate-500'}`}>
        {value || fallback}
      </dd>
    </div>
  );
}

/** One ledger row in the Record group: fixed label column, value beside it. */
function RecordRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[7.5rem_minmax(0,1fr)] items-baseline gap-4 border-b border-white/[0.06] admin-light:border-[#E2E8F0] py-3 last:border-b-0">
      <dt className="text-xs font-semibold text-slate-500">{label}</dt>
      <dd className="min-w-0 break-words text-sm text-slate-100 admin-light:text-slate-900">{children}</dd>
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
  const [isUploading, setIsUploading] = useState(false);
  const [deletingPhotoId, setDeletingPhotoId] = useState<string | null>(null);
  const [isReactivating, setIsReactivating] = useState(false);
  const [isIdCopied, setIsIdCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setIsIdCopied(false);
    setDeletingPhotoId(null);
  }, [item?.id]);

  useEffect(() => () => {
    if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
  }, []);

  if (!item) return null;

  const photos = item.photos;
  const photoCount = photos.length;
  const categoryLabel = categoryLabels[item.category] ?? item.category;
  const isExpired = item.status === 'Expired';
  const isPhotoBusy = isUploading || deletingPhotoId !== null;

  const formattedDate = new Date(item.datePosted).toLocaleDateString('en-PH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  const formattedExpiry = item.expiredAt
    ? new Date(item.expiredAt).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })
    : '-';

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || isPhotoBusy) return;

    setIsUploading(true);
    try {
      await onAddPhoto(item.id, file);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeletePhoto = async (photoId: string) => {
    if (isPhotoBusy) return;
    setDeletingPhotoId(photoId);
    try {
      await onDeletePhoto(item.id, photoId);
    } finally {
      setDeletingPhotoId(null);
    }
  };

  const handleReactivate = async () => {
    if (isActing || isReactivating) return;
    setIsReactivating(true);
    try {
      await onReactivate(item.id);
    } finally {
      setIsReactivating(false);
    }
  };

  // Clipboard access can be refused (non-secure origin, denied permission);
  // the ID stays selectable as text either way, so a failure is silent.
  const handleCopyId = async () => {
    try {
      await navigator.clipboard.writeText(item.id);
      setIsIdCopied(true);
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
      copyTimerRef.current = setTimeout(() => setIsIdCopied(false), 1500);
    } catch {
      setIsIdCopied(false);
    }
  };

  // One upload control, in the first empty slot only, so photos stay in
  // order (slot 1 is the thumbnail) — same rule as the Report Item modal.
  const addPhotoSlot = (large: boolean) => (
    <button
      type="button"
      onClick={() => fileInputRef.current?.click()}
      disabled={isPhotoBusy}
      className={`flex h-full w-full flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed border-[#2A3A55] admin-light:border-[#CBD5E1] bg-[#131C2E] admin-light:bg-[#F8FAFC] px-2 text-center text-slate-400 admin-light:text-slate-500 transition-colors hover:border-[#62A0EA] admin-light:hover:border-[#1A5FB4] hover:text-[#8CB9F0] admin-light:hover:text-[#1A5FB4] focus:outline-none focus-visible:border-[#62A0EA] admin-light:focus-visible:border-[#1A5FB4] disabled:cursor-not-allowed disabled:opacity-50 ${large ? 'lg:px-6' : ''}`}
    >
      {isUploading ? (
        <span className="h-5 w-5 rounded-full border-2 border-current border-t-transparent animate-spin" aria-hidden="true" />
      ) : (
        <ImagePlus className={large ? 'h-5 w-5 lg:h-6 lg:w-6' : 'h-5 w-5'} aria-hidden="true" />
      )}
      {isUploading ? (
        <span className="text-[11px] font-semibold">Uploading...</span>
      ) : large ? (
        <>
          <span className="text-[11px] font-semibold lg:hidden">Main photo</span>
          <span className="hidden text-sm font-semibold lg:inline">Add the main photo</span>
          <span className="hidden text-xs text-slate-500 lg:inline">Becomes the item thumbnail</span>
        </>
      ) : (
        <span className="text-[11px] font-semibold">Add photo</span>
      )}
    </button>
  );

  const photoSlot = (index: number, large: boolean) => {
    const photo = photos[index];
    if (photo) {
      const isDeleting = deletingPhotoId === photo.id;
      return (
        <div className="group/photo relative h-full w-full overflow-hidden rounded-lg border border-white/10 admin-light:border-[#E2E8F0] bg-[#0B1628] admin-light:bg-[#F1F5F9]">
          {/* Opens the full-size photo, so the smaller slots can still be inspected. */}
          <a href={photo.url} target="_blank" rel="noopener noreferrer" className="block h-full w-full focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#62A0EA] admin-light:focus-visible:ring-[#1A5FB4]" aria-label={`Open photo ${index + 1} full size`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photo.url}
              alt={index === 0 ? item.itemName : `${item.itemName}, photo ${index + 1}`}
              className={`h-full w-full object-cover transition-opacity ${isDeleting ? 'opacity-40' : ''}`}
            />
          </a>
          {index === 0 && (
            <span className="pointer-events-none absolute bottom-2 left-2 rounded bg-black/65 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-white">Thumbnail</span>
          )}
          <button
            type="button"
            onClick={() => void handleDeletePhoto(photo.id)}
            disabled={isPhotoBusy}
            className="absolute right-1.5 top-1.5 inline-flex h-7 w-7 items-center justify-center rounded-md bg-black/60 text-white/85 transition-colors hover:bg-red-500 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#62A0EA] admin-light:focus-visible:ring-[#1A5FB4] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-black/60"
            aria-label={`Remove photo ${index + 1}`}
            title="Remove photo"
          >
            {isDeleting ? (
              <span className="h-3.5 w-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" aria-hidden="true" />
            ) : (
              <X className="h-3.5 w-3.5" />
            )}
          </button>
          {large && <span className="sr-only">Main photo</span>}
        </div>
      );
    }
    if (index === photoCount && photoCount < MAX_PHOTOS) return addPhotoSlot(large);
    return <div aria-hidden="true" className="h-full w-full rounded-lg border border-dashed border-white/[0.06] admin-light:border-[#E2E8F0]" />;
  };

  const secondaryButton = 'inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-white/10 admin-light:border-[#E2E8F0] px-5 text-sm font-semibold text-slate-300 admin-light:text-slate-700 transition-colors hover:bg-white/5 admin-light:hover:bg-[#F1F5F9] hover:text-white admin-light:hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50';
  const primaryButton = 'inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#62A0EA] admin-light:bg-[#1A5FB4] px-5 text-sm font-bold text-white transition-colors hover:bg-[#4A8BD4] admin-light:hover:bg-[#164A8F] disabled:cursor-not-allowed disabled:opacity-50';

  return (
    <Modal adminThemed isOpen={isOpen} onClose={onClose} maxWidth="max-w-5xl" rounded="rounded-xl">
      <header className="pr-10">
        <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#8CB9F0] admin-light:text-[#1A5FB4]">
          <PackageSearch className="h-3.5 w-3.5" aria-hidden="true" />
          Lost item
          <span className="text-slate-600 admin-light:text-slate-400" aria-hidden="true">/</span>
          <span className="text-slate-400 admin-light:text-slate-500">{categoryLabel}</span>
        </p>
        <h2 className="break-words text-xl font-bold leading-tight text-white admin-light:text-slate-900 sm:text-2xl">{item.itemName}</h2>
        <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <span className={`text-sm font-semibold text-slate-200 admin-light:text-slate-800`}>{item.status}</span>
          <span className="text-xs text-slate-500">Posted {formattedDate}</span>
        </div>
      </header>

      {/* Photos lead on the left, the record reads down the wider column
          beside them. One column on small screens. */}
      <div className="mt-6 grid gap-8 border-t border-white/10 admin-light:border-[#E2E8F0] pt-6 lg:grid-cols-[18rem_minmax(0,1fr)] lg:gap-10">
        <section aria-labelledby="view-photos-label">
          <div className="mb-4 flex items-baseline justify-between gap-3">
            <h3 id="view-photos-label" className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Photos</h3>
            <span className="text-xs font-semibold tabular-nums text-slate-500">{photoCount}/{MAX_PHOTOS}</span>
          </div>
          {/* Desktop: the main photo spans the column with two below it.
              Smaller screens: three equal squares in one row. */}
          <div className="grid grid-cols-3 gap-3 lg:grid-cols-2">
            <div className="aspect-square lg:col-span-2">{photoSlot(0, true)}</div>
            <div className="aspect-square">{photoSlot(1, false)}</div>
            <div className="aspect-square">{photoSlot(2, false)}</div>
          </div>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelected} />
          <p className="mt-3 text-xs leading-5 text-slate-500">Select a photo to open it full size. The first photo is the thumbnail.</p>
        </section>

        <div className="min-w-0">
          <section>
            <GroupLabel>Description</GroupLabel>
            {item.description ? (
              <p className="max-w-[65ch] whitespace-pre-line break-words text-base leading-7 text-slate-200 admin-light:text-slate-800">{item.description}</p>
            ) : (
              <p className="text-sm text-slate-500">No description provided.</p>
            )}
          </section>

          <section className="mt-7 border-t border-white/10 admin-light:border-[#E2E8F0] pt-6">
            <GroupLabel>Found on</GroupLabel>
            <dl className="grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2">
              <Fact label="Plate Number" value={item.plateNumber} fallback="Plate unavailable" />
              <Fact label="Estimated Time Lost" value={item.estimatedTimeLost} fallback="Time unavailable" />
              <Fact label="Driver" value={item.driverName} fallback="Driver unavailable" />
              <Fact label="Conductor" value={item.conductorName} fallback="Conductor unavailable" />
            </dl>
          </section>

          <section className="mt-7 border-t border-white/10 admin-light:border-[#E2E8F0] pt-6">
            <GroupLabel>Record</GroupLabel>
            <dl className="-my-3">
              <RecordRow label="Reported By">
                {item.reporterName ? <span className="font-semibold">{item.reporterName}</span> : <span className="text-slate-500">Reporter unavailable</span>}
              </RecordRow>
              <RecordRow label="Date Posted">{formattedDate}</RecordRow>
              {item.claimedBy && (
                <RecordRow label="Claimed By">
                  <span className="font-semibold text-[#8CB9F0] admin-light:text-[#1A5FB4]">{item.claimedBy}</span>
                </RecordRow>
              )}
              {isExpired && (
                <RecordRow label="Expired">
                  <span className="font-semibold text-red-300 admin-light:text-red-700">{formattedExpiry}</span>
                </RecordRow>
              )}
              <RecordRow label="Item ID">
                <span className="flex min-w-0 items-center gap-2">
                  <span className="min-w-0 break-all font-mono text-xs text-slate-300 admin-light:text-slate-700">{item.id}</span>
                  <button
                    type="button"
                    onClick={() => void handleCopyId()}
                    className="inline-flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-white/5 admin-light:hover:bg-[#F1F5F9] hover:text-slate-200 admin-light:hover:text-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#62A0EA] admin-light:focus-visible:ring-[#1A5FB4]"
                    aria-label={isIdCopied ? 'Item ID copied' : 'Copy item ID'}
                    title={isIdCopied ? 'Copied' : 'Copy item ID'}
                  >
                    {isIdCopied ? <Check className="h-3.5 w-3.5 text-[#62A0EA] admin-light:text-[#1A5FB4]" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                </span>
              </RecordRow>
            </dl>
          </section>
        </div>
      </div>

      {/* Pinned to the bottom of the modal's scroll area so the actions stay
          reachable on short screens. Reactivate leads only while expired;
          otherwise Edit is the one action. */}
      <div className="sticky -bottom-4 z-10 -mx-4 -mb-4 mt-8 flex flex-col-reverse gap-2 border-t border-white/10 admin-light:border-[#E2E8F0] bg-[#1A2540] admin-light:bg-white px-4 py-4 sm:-bottom-6 sm:-mx-6 sm:-mb-6 sm:flex-row sm:justify-end sm:px-6">
        <button type="button" onClick={onClose} className={secondaryButton}>Close</button>
        <button type="button" onClick={() => onEdit(item)} className={isExpired ? secondaryButton : primaryButton}>
          <Pencil className="h-4 w-4" />
          Edit Item
        </button>
        {isExpired && (
          <button type="button" onClick={() => void handleReactivate()} disabled={isActing || isReactivating} className={primaryButton}>
            {isReactivating ? (
              <span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" aria-hidden="true" />
            ) : (
              <RotateCcw className="h-4 w-4" />
            )}
            {isReactivating ? 'Reactivating...' : 'Reactivate'}
          </button>
        )}
      </div>
    </Modal>
  );
}
