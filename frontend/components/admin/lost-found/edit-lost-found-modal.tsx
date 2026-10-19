// components/admin/lost-found/edit-lost-found-modal.tsx
'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Modal } from '@/components/admin/ui/modal';
import { ImagePlus, ImageUp, PackageSearch, RotateCcw, Save, X } from 'lucide-react';
import { itemCategories, type ItemCategory, type LostFoundItem } from '@/app/(admin)/lost-found/data/lost-found-data';

interface PersonnelOption {
  id: string;
  name: string;
}

const MAX_PHOTOS = 3;
// Mirrors the backend UploadLostItemImageRequest (jpg/jpeg/png/webp, 5MB) so
// a bad file is caught when it's picked, not after the details already saved.
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const ACCEPTED_PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

/** A picked file waiting for Save, with an object URL for its preview. */
interface StagedPhoto {
  file: File;
  previewUrl: string;
}

type PhotoSlot =
  | { kind: 'existing'; photoId: string; url: string; isStaged: boolean; isReplaced: boolean }
  | { kind: 'new'; staged: StagedPhoto; url: string; isStaged: true };

function isPlaceholder(value: string): boolean {
  return !value || value === '\u2014' || value === '\u00e2\u20ac\u201d' || value === '\u00c3\u00a2\u00e2\u201a\u00ac\u00e2\u20ac\u009d';
}

function formatTimeTo12Hour(time24: string): string {
  const [hoursStr, minutesStr] = time24.split(':');
  const hours = Number(hoursStr);
  if (Number.isNaN(hours)) return '';
  const period = hours >= 12 ? 'PM' : 'AM';
  const hour12 = hours % 12 === 0 ? 12 : hours % 12;
  return `${hour12}:${minutesStr} ${period}`;
}

function formatEstimatedTimeRange(startTime: string, endTime: string): string {
  const start = startTime ? formatTimeTo12Hour(startTime) : '';
  const end = endTime ? formatTimeTo12Hour(endTime) : '';
  if (start && end) return `${start} - ${end}`;
  return start || end;
}

function parseTimeTo24Hour(timeText: string): string {
  const match = timeText.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return '';

  const [, hoursText, minutes, periodText] = match;
  let hours = Number(hoursText);
  if (Number.isNaN(hours)) return '';

  const period = periodText.toUpperCase();
  if (period === 'PM' && hours !== 12) hours += 12;
  if (period === 'AM' && hours === 12) hours = 0;

  return `${String(hours).padStart(2, '0')}:${minutes}`;
}

function parseEstimatedTimeRange(value: string): { start: string; end: string } {
  if (isPlaceholder(value)) return { start: '', end: '' };
  const [startText = '', endText = ''] = value.split(/\s+-\s+/, 2);
  return {
    start: parseTimeTo24Hour(startText),
    end: parseTimeTo24Hour(endText),
  };
}

export interface EditLostFoundFormData {
  itemName: string;
  description: string;
  category: ItemCategory;
  plateNumber: string;
  estimatedTimeLost: string;
  driverName: string;
  conductorName: string;
}

interface EditLostFoundModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: LostFoundItem | null;
  /** The item's current server-side photos (live, not the seed snapshot). */
  photos: { id: string; url: string }[];
  onSave: (itemId: string, data: EditLostFoundFormData) => Promise<void>;
  onAddPhoto: (itemId: string, file: File) => Promise<void>;
  onReplacePhoto: (itemId: string, photoId: string, file: File) => Promise<void>;
  onDeletePhoto: (itemId: string, photoId: string) => Promise<void>;
}

function FieldLabel({
  htmlFor,
  children,
  required = false,
}: {
  htmlFor: string;
  children: ReactNode;
  required?: boolean;
}) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-xs font-semibold text-slate-300 admin-light:text-slate-700">
      {children}
      {required && <span className="ml-0.5 text-red-400 admin-light:text-red-600">*</span>}
    </label>
  );
}

function GroupLabel({ children }: { children: ReactNode }) {
  return <h3 className="mb-4 text-[11px] font-semibold uppercase tracking-wider text-slate-500">{children}</h3>;
}

export function EditLostFoundModal({
  isOpen,
  onClose,
  item,
  photos,
  onSave,
  onAddPhoto,
  onReplacePhoto,
  onDeletePhoto,
}: EditLostFoundModalProps) {
  const [formData, setFormData] = useState<EditLostFoundFormData>({
    itemName: '',
    description: '',
    category: 'OTHER',
    plateNumber: '',
    estimatedTimeLost: '',
    driverName: '',
    conductorName: '',
  });
  const [timeRange, setTimeRange] = useState({ start: '', end: '' });
  const [drivers, setDrivers] = useState<PersonnelOption[]>([]);
  const [conductors, setConductors] = useState<PersonnelOption[]>([]);
  const [plateNumbers, setPlateNumbers] = useState<string[]>([]);
  const [isLoadingPersonnel, setIsLoadingPersonnel] = useState(false);
  const [isLoadingPlates, setIsLoadingPlates] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [savingLabel, setSavingLabel] = useState('Saving...');
  const [error, setError] = useState<string | null>(null);
  // Photo changes are staged like the form fields and applied on Save, so
  // Cancel discards them too.
  const [removedPhotoIds, setRemovedPhotoIds] = useState<string[]>([]);
  const [replacements, setReplacements] = useState<Record<string, StagedPhoto>>({});
  const [additions, setAdditions] = useState<StagedPhoto[]>([]);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  /** Photo id the picker is replacing; null when it's adding a new photo. */
  const pickTargetRef = useRef<string | null>(null);
  const previewUrlsRef = useRef<Set<string>>(new Set());

  // Free every preview object URL when the modal closes or unmounts.
  useEffect(() => {
    if (!isOpen) return;
    const previewUrls = previewUrlsRef.current;
    return () => {
      previewUrls.forEach((url) => URL.revokeObjectURL(url));
      previewUrls.clear();
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !item) return;

    setRemovedPhotoIds([]);
    setReplacements({});
    setAdditions([]);
    setPhotoError(null);

    const estimatedTimeLost = isPlaceholder(item.estimatedTimeLost) ? '' : item.estimatedTimeLost;
    setFormData({
      itemName: item.itemName,
      description: item.description,
      category: item.category,
      plateNumber: isPlaceholder(item.plateNumber) ? '' : item.plateNumber,
      estimatedTimeLost,
      driverName: isPlaceholder(item.driverName) ? '' : item.driverName,
      conductorName: isPlaceholder(item.conductorName) ? '' : item.conductorName,
    });
    setTimeRange(parseEstimatedTimeRange(estimatedTimeLost));
    setError(null);
  }, [isOpen, item]);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;

    (async () => {
      setIsLoadingPersonnel(true);
      const [driversRes, conductorsRes] = await Promise.all([
        fetch('/api/admin/drivers', { headers: { Accept: 'application/json' } }).catch(() => null),
        fetch('/api/admin/conductors', { headers: { Accept: 'application/json' } }).catch(() => null),
      ]);
      if (cancelled) return;

      if (driversRes?.ok) {
        const json = await driversRes.json();
        const list = (json.data ?? []) as Record<string, unknown>[];
        setDrivers(list.map((d) => ({ id: String(d.id ?? ''), name: `${d.first_name ?? ''} ${d.last_name ?? ''}`.trim() })));
      }
      if (conductorsRes?.ok) {
        const json = await conductorsRes.json();
        const list = (json.data ?? []) as Record<string, unknown>[];
        setConductors(list.map((c) => ({ id: String(c.id ?? ''), name: `${c.first_name ?? ''} ${c.last_name ?? ''}`.trim() })));
      }
      setIsLoadingPersonnel(false);
    })();

    return () => { cancelled = true; };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;

    (async () => {
      setIsLoadingPlates(true);
      const res = await fetch('/api/admin/vehicles?per_page=100', { headers: { Accept: 'application/json' } }).catch(() => null);
      if (cancelled) return;

      if (res?.ok) {
        const json = await res.json();
        const payload = json.data;
        const list = (Array.isArray(payload) ? payload : payload?.data ?? []) as Record<string, unknown>[];
        const plates = list.map((v) => String(v.plate_number ?? '').trim()).filter(Boolean);
        setPlateNumbers(Array.from(new Set(plates)).sort());
      }
      setIsLoadingPlates(false);
    })();

    return () => { cancelled = true; };
  }, [isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleTimeChange = (field: 'start' | 'end', e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setTimeRange(prev => {
      const next = { ...prev, [field]: value };
      setFormData(current => ({
        ...current,
        estimatedTimeLost: formatEstimatedTimeRange(next.start, next.end),
      }));
      return next;
    });
  };

  const stagePhoto = (file: File): StagedPhoto => {
    const previewUrl = URL.createObjectURL(file);
    previewUrlsRef.current.add(previewUrl);
    return { file, previewUrl };
  };

  const discardStaged = (staged: StagedPhoto | undefined) => {
    if (!staged) return;
    URL.revokeObjectURL(staged.previewUrl);
    previewUrlsRef.current.delete(staged.previewUrl);
  };

  // Ignore staged entries for photos that no longer exist server-side.
  const keptPhotos = photos.filter((photo) => !removedPhotoIds.includes(photo.id));
  const pendingRemovals = removedPhotoIds.filter((id) => photos.some((photo) => photo.id === id));
  const pendingReplacements = Object.entries(replacements)
    .filter(([photoId]) => keptPhotos.some((photo) => photo.id === photoId));
  const pendingChangeCount = pendingRemovals.length + pendingReplacements.length + additions.length;

  // Mirrors the order the server will hold after Save: replacements stay in
  // place, removals compact the rest forward, additions append at the end.
  const slots: PhotoSlot[] = [
    ...keptPhotos.map((photo): PhotoSlot => {
      const replacement = replacements[photo.id];
      return {
        kind: 'existing',
        photoId: photo.id,
        url: replacement?.previewUrl ?? photo.url,
        isStaged: Boolean(replacement),
        isReplaced: Boolean(replacement),
      };
    }),
    ...additions.map((staged): PhotoSlot => ({ kind: 'new', staged, url: staged.previewUrl, isStaged: true })),
  ];
  const canUndoRemovals = photos.length + additions.length <= MAX_PHOTOS;

  const openPhotoPicker = (replacePhotoId: string | null) => {
    pickTargetRef.current = replacePhotoId;
    fileInputRef.current?.click();
  };

  const handlePhotoPicked = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    if (!ACCEPTED_PHOTO_TYPES.includes(file.type)) {
      setPhotoError('Use a JPG, PNG or WEBP image.');
      return;
    }
    if (file.size > MAX_PHOTO_BYTES) {
      setPhotoError('Each photo must be 5MB or smaller.');
      return;
    }
    setPhotoError(null);

    const target = pickTargetRef.current;
    if (target) {
      discardStaged(replacements[target]);
      setReplacements({ ...replacements, [target]: stagePhoto(file) });
    } else if (slots.length < MAX_PHOTOS) {
      setAdditions([...additions, stagePhoto(file)]);
    }
  };

  const handleRemoveSlot = (slot: PhotoSlot) => {
    setPhotoError(null);
    if (slot.kind === 'new') {
      discardStaged(slot.staged);
      setAdditions(additions.filter((staged) => staged !== slot.staged));
      return;
    }
    discardStaged(replacements[slot.photoId]);
    setReplacements(Object.fromEntries(Object.entries(replacements).filter(([id]) => id !== slot.photoId)));
    setRemovedPhotoIds([...removedPhotoIds, slot.photoId]);
  };

  const handleUndoReplace = (photoId: string) => {
    discardStaged(replacements[photoId]);
    setReplacements(Object.fromEntries(Object.entries(replacements).filter(([id]) => id !== photoId)));
  };

  /**
   * Saves the details, then applies photo changes one at a time:
   * replacements (positions unchanged), then removals (frees room under the
   * 3-photo cap), then additions (appended in the order they were picked).
   * Each change is cleared from the staging as soon as it lands, so if one
   * fails the modal stays open with only the unapplied changes left, and
   * pressing Save again retries just those.
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!item || isSaving) return;
    setIsSaving(true);
    setError(null);
    let detailsSaved = false;
    try {
      setSavingLabel('Saving...');
      await onSave(item.id, formData);
      detailsSaved = true;

      if (pendingChangeCount > 0) setSavingLabel('Updating photos...');

      for (const [photoId, staged] of pendingReplacements) {
        await onReplacePhoto(item.id, photoId, staged.file);
        discardStaged(staged);
        setReplacements((prev) => Object.fromEntries(Object.entries(prev).filter(([id]) => id !== photoId)));
      }
      for (const photoId of pendingRemovals) {
        await onDeletePhoto(item.id, photoId);
        setRemovedPhotoIds((prev) => prev.filter((id) => id !== photoId));
      }
      for (const staged of additions) {
        await onAddPhoto(item.id, staged.file);
        discardStaged(staged);
        setAdditions((prev) => prev.filter((entry) => entry !== staged));
      }

      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to save changes.';
      setError(detailsSaved
        ? `Details saved, but a photo change failed: ${message} Press Save to retry the remaining photo changes.`
        : message);
    } finally {
      setIsSaving(false);
    }
  };

  const inputClasses = 'block h-11 w-full rounded-lg border border-white/10 admin-light:border-[#E2E8F0] bg-[#0E1628] admin-light:bg-[#F8FAFC] px-3 text-sm text-white admin-light:text-slate-900 shadow-sm outline-none transition-colors placeholder:text-slate-600 admin-light:placeholder:text-slate-400 focus:border-[#62A0EA] admin-light:focus:border-[#1A5FB4] focus:ring-2 focus:ring-[#62A0EA]/15 admin-light:focus:ring-[#1A5FB4]/15 disabled:cursor-not-allowed disabled:opacity-60';

  if (!item) return null;

  const slotButton = 'inline-flex h-7 w-7 items-center justify-center rounded-md bg-black/60 text-white/85 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#62A0EA] admin-light:focus-visible:ring-[#1A5FB4] disabled:cursor-not-allowed disabled:opacity-50';

  // One add control, in the first empty slot only, so photos stay in order
  // (slot 1 is the thumbnail) — same rule as the Report Item modal.
  const addPhotoSlot = (large: boolean) => (
    <button
      type="button"
      onClick={() => openPhotoPicker(null)}
      disabled={isSaving}
      className={`flex h-full w-full flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed border-white/15 admin-light:border-[#CBD5E1] bg-white/[0.03] admin-light:bg-[#F8FAFC] px-2 text-center text-slate-400 admin-light:text-slate-500 transition-colors hover:border-[#62A0EA] admin-light:hover:border-[#1A5FB4] hover:text-[#8CB9F0] admin-light:hover:text-[#1A5FB4] focus:outline-none focus-visible:border-[#62A0EA] admin-light:focus-visible:border-[#1A5FB4] disabled:cursor-not-allowed disabled:opacity-50 ${large ? 'lg:px-6' : ''}`}
    >
      <ImagePlus className={large ? 'h-5 w-5 lg:h-6 lg:w-6' : 'h-5 w-5'} aria-hidden="true" />
      {large ? (
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
    const slot = slots[index];
    if (slot) {
      return (
        <div className={`relative h-full w-full overflow-hidden rounded-lg border bg-[#0B1628] admin-light:bg-[#F1F5F9] ${
          slot.isStaged ? 'border-[#62A0EA] admin-light:border-[#1A5FB4] ring-2 ring-[#62A0EA]/20 admin-light:ring-[#1A5FB4]/20' : 'border-white/10 admin-light:border-[#E2E8F0]'
        }`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={slot.url} alt={`Photo ${index + 1}`} className="h-full w-full object-cover" />
          {index === 0 && (
            <span className="pointer-events-none absolute bottom-2 left-2 rounded bg-black/65 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-white">Thumbnail</span>
          )}
          <div className="absolute right-1.5 top-1.5 flex gap-1">
            {slot.kind === 'existing' && (slot.isReplaced ? (
              <button
                type="button"
                onClick={() => handleUndoReplace(slot.photoId)}
                disabled={isSaving}
                className={`${slotButton} hover:bg-white hover:text-[#071A2E]`}
                aria-label={`Undo replacing photo ${index + 1}`}
                title="Undo replace"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => openPhotoPicker(slot.photoId)}
                disabled={isSaving}
                className={`${slotButton} hover:bg-[#62A0EA] admin-light:hover:bg-[#1A5FB4] hover:text-white`}
                aria-label={`Replace photo ${index + 1}`}
                title="Replace photo"
              >
                <ImageUp className="h-3.5 w-3.5" />
              </button>
            ))}
            <button
              type="button"
              onClick={() => handleRemoveSlot(slot)}
              disabled={isSaving}
              className={`${slotButton} hover:bg-red-500 hover:text-white`}
              aria-label={`Remove photo ${index + 1}`}
              title="Remove photo"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      );
    }
    if (index === slots.length && slots.length < MAX_PHOTOS) return addPhotoSlot(large);
    return <div aria-hidden="true" className="h-full w-full rounded-lg border border-dashed border-white/[0.06] admin-light:border-[#E2E8F0]" />;
  };

  return (
    <Modal adminThemed isOpen={isOpen} onClose={onClose} maxWidth="max-w-5xl" rounded="rounded-xl">
      <form onSubmit={handleSubmit}>
        <header className="pr-10">
          <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#8CB9F0] admin-light:text-[#1A5FB4]">
            <PackageSearch className="h-3.5 w-3.5" aria-hidden="true" />
            Edit item
          </p>
          <h2 className="text-xl font-bold leading-tight text-white admin-light:text-slate-900 sm:text-2xl">Update Lost & Found Record</h2>
          <p className="mt-1 text-sm text-slate-500">Claim decisions are handled from the claim review view.</p>
        </header>

        {/* Same two-column frame as Report Item and Item Details: photos on
            the left, the record beside them. One column on small screens. */}
        <div className="mt-6 grid gap-8 lg:grid-cols-[18rem_minmax(0,1fr)] lg:gap-10">
          <section aria-labelledby="edit-photos-label" className="min-w-0">
            <div className="mb-4 flex items-baseline justify-between gap-3">
              <h3 id="edit-photos-label" className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Photos</h3>
              <span className="text-xs font-semibold tabular-nums text-slate-500">{slots.length}/{MAX_PHOTOS}</span>
            </div>
            {/* Desktop: the main photo spans the column with two below it.
                Smaller screens: three equal squares in one row. */}
            <div className="grid grid-cols-3 gap-3 lg:grid-cols-2">
              <div className="aspect-square lg:col-span-2">{photoSlot(0, true)}</div>
              <div className="aspect-square">{photoSlot(1, false)}</div>
              <div className="aspect-square">{photoSlot(2, false)}</div>
            </div>
            <input ref={fileInputRef} type="file" accept={ACCEPTED_PHOTO_TYPES.join(',')} className="hidden" onChange={handlePhotoPicked} />
            {photoError && <p role="alert" className="mt-3 text-xs font-medium text-red-400 admin-light:text-red-600">{photoError}</p>}
            {pendingChangeCount > 0 ? (
              <p className="mt-3 text-xs leading-5 text-slate-400 admin-light:text-slate-500">
                <span className="font-semibold text-[#8CB9F0] admin-light:text-[#1A5FB4]">{pendingChangeCount} photo {pendingChangeCount === 1 ? 'change' : 'changes'}</span> will apply when you save.
                {pendingRemovals.length > 0 && (
                  <>
                    {' '}
                    <button
                      type="button"
                      onClick={() => setRemovedPhotoIds([])}
                      disabled={isSaving || !canUndoRemovals}
                      title={canUndoRemovals ? undefined : 'Remove a new photo first to make room'}
                      className="font-semibold text-slate-200 admin-light:text-slate-800 underline underline-offset-2 hover:text-white admin-light:hover:text-slate-900 disabled:cursor-not-allowed disabled:text-slate-500 disabled:no-underline"
                    >
                      Undo {pendingRemovals.length === 1 ? 'removal' : 'removals'}
                    </button>
                  </>
                )}
              </p>
            ) : (
              <p className="mt-3 text-xs leading-5 text-slate-500">PNG, JPG, WEBP up to 5MB each. The first photo is the thumbnail.</p>
            )}
          </section>

          <div className="min-w-0">
            <section>
              <GroupLabel>Item</GroupLabel>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,1fr)_13rem]">
                <div>
                  <FieldLabel htmlFor="edit-itemName" required>Item Name</FieldLabel>
                  <input type="text" id="edit-itemName" name="itemName" value={formData.itemName} onChange={handleChange} required disabled={isSaving} className={inputClasses} />
                </div>
                <div>
                  <FieldLabel htmlFor="edit-category">Category</FieldLabel>
                  <select id="edit-category" name="category" value={formData.category} onChange={handleChange} disabled={isSaving} className={`${inputClasses} [color-scheme:dark] admin-light:[color-scheme:light]`}>
                    {itemCategories.map(cat => (<option key={cat.value} value={cat.value} className="bg-gray-800 admin-light:bg-white">{cat.label}</option>))}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <FieldLabel htmlFor="edit-description">Detailed Description</FieldLabel>
                  <textarea
                    id="edit-description"
                    name="description"
                    rows={4}
                    value={formData.description}
                    onChange={handleChange}
                    disabled={isSaving}
                    className={`${inputClasses} h-auto resize-none py-3 leading-6`}
                  />
                </div>
              </div>
            </section>

            <section className="mt-7 border-t border-white/10 admin-light:border-[#E2E8F0] pt-6">
              <GroupLabel>Found on</GroupLabel>
              {/* Vehicle + time on the first row, the crew on the second. */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <FieldLabel htmlFor="edit-plateNumber">Plate Number</FieldLabel>
                  <select id="edit-plateNumber" name="plateNumber" value={formData.plateNumber} onChange={handleChange} disabled={isLoadingPlates || isSaving} className={`${inputClasses} [color-scheme:dark] admin-light:[color-scheme:light]`}>
                    <option value="" className="bg-gray-800 admin-light:bg-white">{isLoadingPlates ? 'Loading plate numbers...' : 'Select a plate number'}</option>
                    {formData.plateNumber && !plateNumbers.includes(formData.plateNumber) && (
                      <option value={formData.plateNumber} className="bg-gray-800 admin-light:bg-white">{formData.plateNumber}</option>
                    )}
                    {plateNumbers.map(plate => (<option key={plate} value={plate} className="bg-gray-800 admin-light:bg-white">{plate}</option>))}
                  </select>
                </div>
                <fieldset className="min-w-0">
                  <legend className="mb-1.5 text-xs font-semibold text-slate-300 admin-light:text-slate-700">Estimated Time Lost</legend>
                  <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2">
                    <input
                      type="time"
                      id="edit-estimatedTimeLostStart"
                      value={timeRange.start}
                      onChange={(e) => handleTimeChange('start', e)}
                      disabled={isSaving}
                      className={`${inputClasses} [color-scheme:dark] admin-light:[color-scheme:light]`}
                      aria-label="Estimated time lost start"
                    />
                    <span className="text-xs font-semibold text-slate-500">to</span>
                    <input
                      type="time"
                      id="edit-estimatedTimeLostEnd"
                      value={timeRange.end}
                      onChange={(e) => handleTimeChange('end', e)}
                      disabled={isSaving}
                      className={`${inputClasses} [color-scheme:dark] admin-light:[color-scheme:light]`}
                      aria-label="Estimated time lost end"
                    />
                  </div>
                </fieldset>
                <div>
                  <FieldLabel htmlFor="edit-driverName">Driver</FieldLabel>
                  <select id="edit-driverName" name="driverName" value={formData.driverName} onChange={handleChange} disabled={isLoadingPersonnel || isSaving} className={`${inputClasses} [color-scheme:dark] admin-light:[color-scheme:light]`}>
                    <option value="" className="bg-gray-800 admin-light:bg-white">{isLoadingPersonnel ? 'Loading drivers...' : 'Select a driver'}</option>
                    {formData.driverName && !drivers.some(d => d.name === formData.driverName) && (
                      <option value={formData.driverName} className="bg-gray-800 admin-light:bg-white">{formData.driverName}</option>
                    )}
                    {drivers.map(d => (<option key={d.id} value={d.name} className="bg-gray-800 admin-light:bg-white">{d.name}</option>))}
                  </select>
                </div>
                <div>
                  <FieldLabel htmlFor="edit-conductorName">Conductor</FieldLabel>
                  <select id="edit-conductorName" name="conductorName" value={formData.conductorName} onChange={handleChange} disabled={isLoadingPersonnel || isSaving} className={`${inputClasses} [color-scheme:dark] admin-light:[color-scheme:light]`}>
                    <option value="" className="bg-gray-800 admin-light:bg-white">{isLoadingPersonnel ? 'Loading conductors...' : 'Select a conductor'}</option>
                    {formData.conductorName && !conductors.some(c => c.name === formData.conductorName) && (
                      <option value={formData.conductorName} className="bg-gray-800 admin-light:bg-white">{formData.conductorName}</option>
                    )}
                    {conductors.map(c => (<option key={c.id} value={c.name} className="bg-gray-800 admin-light:bg-white">{c.name}</option>))}
                  </select>
                </div>
              </div>
            </section>
          </div>
        </div>

        {/* Pinned to the bottom of the modal's scroll area so the actions stay
            reachable on short screens. A save error sits beside them, where
            the admin's eyes already are after pressing Save. */}
        <div className="sticky -bottom-4 z-10 -mx-4 -mb-4 mt-8 flex flex-col gap-3 border-t border-white/10 admin-light:border-[#E2E8F0] bg-[#1A2540] admin-light:bg-white px-4 py-4 sm:-bottom-6 sm:-mx-6 sm:-mb-6 sm:flex-row sm:items-center sm:px-6">
          {error && (
            <p role="alert" className="text-sm font-medium text-red-300 admin-light:text-red-700 sm:mr-auto">{error}</p>
          )}
          <div className="flex flex-col-reverse gap-2 sm:ml-auto sm:flex-row">
            <button type="button" onClick={onClose} disabled={isSaving} className="inline-flex h-11 items-center justify-center rounded-lg border border-white/10 admin-light:border-[#E2E8F0] px-5 text-sm font-semibold text-slate-300 admin-light:text-slate-700 transition-colors hover:bg-white/5 admin-light:hover:bg-[#F1F5F9] hover:text-white admin-light:hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50">Cancel</button>
            <button type="submit" disabled={isSaving} className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#62A0EA] admin-light:bg-[#1A5FB4] px-5 text-sm font-bold text-white transition-colors hover:bg-[#4A8BD4] admin-light:hover:bg-[#164A8F] disabled:cursor-not-allowed disabled:opacity-50">
              {isSaving ? (
                <span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" aria-hidden="true" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {isSaving ? savingLabel : 'Save Changes'}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
