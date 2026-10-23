// components/admin/lost-found/add-lost-found-modal.tsx
'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { Modal } from '@/components/admin/ui/modal';
import { ImagePlus, PackageSearch, Save, X } from 'lucide-react';
import { itemCategories, type ItemCategory } from '@/app/(admin)/lost-found/data/lost-found-data';

interface PersonnelOption {
  id: string;
  name: string;
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

const MAX_PHOTOS = 3;

export interface LostFoundFormData {
  itemName: string;
  description: string;
  category: ItemCategory;
  plateNumber: string;
  estimatedTimeLost: string;
  driverName: string;
  conductorName: string;
  reporterName: string;
  imageFiles: File[];
  imagePreviews: string[];
}

interface AddLostFoundModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (itemData: LostFoundFormData) => void | Promise<void>;
}

const emptyForm: LostFoundFormData = {
  itemName: '',
  description: '',
  category: 'OTHER',
  plateNumber: '',
  estimatedTimeLost: '',
  driverName: '',
  conductorName: '',
  reporterName: 'Admin',
  imageFiles: [],
  imagePreviews: [],
};

function FieldLabel({
  htmlFor,
  children,
  required = false,
}: {
  htmlFor?: string;
  children: ReactNode;
  required?: boolean;
}) {
  const className = 'mb-1.5 block text-xs font-semibold text-slate-300 admin-light:text-slate-700';
  const content = (
    <>
      {children}
      {required && <span className="ml-0.5 text-red-400 admin-light:text-red-600">*</span>}
    </>
  );
  return htmlFor
    ? <label htmlFor={htmlFor} className={className}>{content}</label>
    : <span className={className}>{content}</span>;
}

function GroupLabel({ children }: { children: ReactNode }) {
  return <h3 className="mb-4 text-[11px] font-semibold uppercase tracking-wider text-slate-500">{children}</h3>;
}

export function AddLostFoundModal({ isOpen, onClose, onSave }: AddLostFoundModalProps) {
  const [formData, setFormData] = useState<LostFoundFormData>(emptyForm);
  const [timeRange, setTimeRange] = useState({ start: '', end: '' });
  const [drivers, setDrivers] = useState<PersonnelOption[]>([]);
  const [conductors, setConductors] = useState<PersonnelOption[]>([]);
  const [plateNumbers, setPlateNumbers] = useState<string[]>([]);
  const [isLoadingPersonnel, setIsLoadingPersonnel] = useState(false);
  const [isLoadingPlates, setIsLoadingPlates] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    const reader = new FileReader();
    reader.onloadend = () => {
      setFormData(prev => ({
        ...prev,
        imageFiles: [...prev.imageFiles, file],
        imagePreviews: [...prev.imagePreviews, reader.result as string],
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = (index: number) => {
    setFormData(prev => ({
      ...prev,
      imageFiles: prev.imageFiles.filter((_, i) => i !== index),
      imagePreviews: prev.imagePreviews.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await onSave(formData);
      setFormData(emptyForm);
      setTimeRange({ start: '', end: '' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputClasses = 'block h-11 w-full rounded-lg border border-white/10 admin-light:border-[#E2E8F0] bg-[#0E1628] admin-light:bg-[#F8FAFC] px-3 text-sm text-white admin-light:text-slate-900 shadow-sm outline-none transition-colors placeholder:text-slate-600 admin-light:placeholder:text-slate-400 focus:border-[#62A0EA] admin-light:focus:border-[#1A5FB4] focus:ring-2 focus:ring-[#62A0EA]/15 admin-light:focus:ring-[#1A5FB4]/15 disabled:cursor-not-allowed disabled:opacity-60';
  const photoCount = formData.imagePreviews.length;

  // One upload control, rendered in the first empty photo slot only, so
  // photos are always added in order (slot 1 is the thumbnail).
  const addPhotoSlot = (large: boolean) => (
    <label
      htmlFor="image-upload"
      className={`flex h-full w-full cursor-pointer flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed border-[#2A3A55] admin-light:border-[#CBD5E1] bg-[#131C2E] admin-light:bg-[#F8FAFC] px-2 text-center text-slate-400 admin-light:text-slate-500 transition-colors hover:border-[#62A0EA] admin-light:hover:border-[#1A5FB4] hover:text-[#8CB9F0] admin-light:hover:text-[#1A5FB4] focus-within:border-[#62A0EA] admin-light:focus-within:border-[#1A5FB4] ${large ? 'lg:px-6' : ''}`}
    >
      <ImagePlus className={large ? 'h-5 w-5 lg:h-6 lg:w-6' : 'h-5 w-5'} aria-hidden="true" />
      {/* The main slot is only large on desktop; on smaller screens all three
          slots share one row, so it uses the short label there. */}
      {large ? (
        <>
          <span className="text-[11px] font-semibold lg:hidden">Main photo</span>
          <span className="hidden text-sm font-semibold lg:inline">Add the main photo</span>
          <span className="hidden text-xs text-slate-500 lg:inline">Becomes the item thumbnail</span>
        </>
      ) : (
        <span className="text-[11px] font-semibold">Add photo</span>
      )}
      <input id="image-upload" name="image-upload" type="file" className="sr-only" accept="image/*" onChange={handleImageChange} />
    </label>
  );

  const photoSlot = (index: number, large: boolean) => {
    const preview = formData.imagePreviews[index];
    if (preview) {
      return (
        <div className="relative h-full w-full overflow-hidden rounded-lg border border-white/10 admin-light:border-[#E2E8F0]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt={`Photo ${index + 1}`} className="h-full w-full object-cover" />
          {index === 0 && (
            <span className="absolute bottom-2 left-2 rounded bg-black/65 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-white">Thumbnail</span>
          )}
          <button
            type="button"
            onClick={() => handleRemoveImage(index)}
            className="absolute right-1.5 top-1.5 inline-flex h-7 w-7 items-center justify-center rounded-md bg-black/60 text-white/85 transition-colors hover:bg-red-500 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#62A0EA] admin-light:focus-visible:ring-[#1A5FB4]"
            aria-label={`Remove photo ${index + 1}`}
            title="Remove photo"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      );
    }
    if (index === photoCount && photoCount < MAX_PHOTOS) return addPhotoSlot(large);
    return <div aria-hidden="true" className="h-full w-full rounded-lg border border-dashed border-white/[0.06] admin-light:border-[#E2E8F0]" />;
  };

  return (
    <Modal adminThemed isOpen={isOpen} onClose={onClose} maxWidth="max-w-5xl" rounded="rounded-xl">
      <form onSubmit={handleSubmit}>
        <header className="pr-10">
          <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#8CB9F0] admin-light:text-[#1A5FB4]">
            <PackageSearch className="h-3.5 w-3.5" aria-hidden="true" />
            New item
          </p>
          <h2 className="text-xl font-bold leading-tight text-white admin-light:text-slate-900 sm:text-2xl">Report Lost & Found Item</h2>
          <p className="mt-1 text-sm text-slate-500">Create the item record first. Claim review and release actions happen after claims are submitted.</p>
        </header>

        {/* Photos lead (staff report with the item in hand); the record fills
            the wider column beside them. One column on small screens. */}
        <div className="mt-6 grid gap-8 lg:grid-cols-[18rem_minmax(0,1fr)] lg:gap-10">
          <section aria-labelledby="report-photos-label">
            <div className="mb-4 flex items-baseline justify-between gap-3">
              <h3 id="report-photos-label" className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Photos</h3>
              <span className="text-xs font-semibold tabular-nums text-slate-500">{photoCount}/{MAX_PHOTOS}</span>
            </div>
            {/* Desktop: the main photo spans the column with two below it.
                Smaller screens: three equal squares in one row, so the form
                fields stay near the top. */}
            <div className="grid grid-cols-3 gap-3 lg:grid-cols-2">
              <div className="aspect-square lg:col-span-2">{photoSlot(0, true)}</div>
              <div className="aspect-square">{photoSlot(1, false)}</div>
              <div className="aspect-square">{photoSlot(2, false)}</div>
            </div>
            <p className="mt-3 text-xs leading-5 text-slate-500">PNG, JPG, WEBP up to 5MB each. The first photo becomes the thumbnail.</p>
          </section>

          <div className="min-w-0">
            <section>
              <GroupLabel>Item</GroupLabel>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,1fr)_13rem]">
                <div>
                  <FieldLabel htmlFor="itemName" required>Item Name</FieldLabel>
                  <input type="text" id="itemName" name="itemName" value={formData.itemName} onChange={handleChange} required placeholder="e.g., Black Leather Wallet" className={inputClasses} />
                </div>
                <div>
                  <FieldLabel htmlFor="category">Category</FieldLabel>
                  <select id="category" name="category" value={formData.category} onChange={handleChange} className={`${inputClasses} [color-scheme:dark] admin-light:[color-scheme:light]`}>
                    {itemCategories.map(cat => (<option key={cat.value} value={cat.value} className="bg-gray-800 admin-light:bg-white">{cat.label}</option>))}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <FieldLabel htmlFor="description">Detailed Description</FieldLabel>
                  <textarea
                    id="description"
                    name="description"
                    rows={4}
                    value={formData.description}
                    onChange={handleChange}
                    placeholder="Found under the seat near the back door..."
                    className={`${inputClasses} h-auto resize-none py-3 leading-6`}
                  />
                </div>
              </div>
            </section>

            <section className="mt-7 border-t border-white/10 admin-light:border-[#E2E8F0] pt-6">
              <GroupLabel>Found on</GroupLabel>
              {/* Two equal columns, every field full width in its cell:
                  vehicle + time on the first row, the crew on the second. */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <FieldLabel htmlFor="plateNumber">Plate Number</FieldLabel>
                  <select id="plateNumber" name="plateNumber" value={formData.plateNumber} onChange={handleChange} disabled={isLoadingPlates} className={`${inputClasses} [color-scheme:dark] admin-light:[color-scheme:light]`}>
                    <option value="" className="bg-gray-800 admin-light:bg-white">{isLoadingPlates ? 'Loading plate numbers...' : 'Select a plate number'}</option>
                    {plateNumbers.map(plate => (<option key={plate} value={plate} className="bg-gray-800 admin-light:bg-white">{plate}</option>))}
                  </select>
                </div>
                <fieldset className="min-w-0">
                  <legend className="mb-1.5 text-xs font-semibold text-slate-300 admin-light:text-slate-700">Estimated Time Lost</legend>
                  <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2">
                    <input
                      type="time"
                      id="estimatedTimeLostStart"
                      value={timeRange.start}
                      onChange={(e) => handleTimeChange('start', e)}
                      className={`${inputClasses} [color-scheme:dark] admin-light:[color-scheme:light]`}
                      aria-label="Estimated time lost start"
                    />
                    <span className="text-xs font-semibold text-slate-500">to</span>
                    <input
                      type="time"
                      id="estimatedTimeLostEnd"
                      value={timeRange.end}
                      onChange={(e) => handleTimeChange('end', e)}
                      className={`${inputClasses} [color-scheme:dark] admin-light:[color-scheme:light]`}
                      aria-label="Estimated time lost end"
                    />
                  </div>
                </fieldset>
                <div>
                  <FieldLabel htmlFor="driverName">Driver</FieldLabel>
                  <select id="driverName" name="driverName" value={formData.driverName} onChange={handleChange} disabled={isLoadingPersonnel} className={`${inputClasses} [color-scheme:dark] admin-light:[color-scheme:light]`}>
                    <option value="" className="bg-gray-800 admin-light:bg-white">{isLoadingPersonnel ? 'Loading drivers...' : 'Select a driver'}</option>
                    {drivers.map(d => (<option key={d.id} value={d.name} className="bg-gray-800 admin-light:bg-white">{d.name}</option>))}
                  </select>
                </div>
                <div>
                  <FieldLabel htmlFor="conductorName">Conductor</FieldLabel>
                  <select id="conductorName" name="conductorName" value={formData.conductorName} onChange={handleChange} disabled={isLoadingPersonnel} className={`${inputClasses} [color-scheme:dark] admin-light:[color-scheme:light]`}>
                    <option value="" className="bg-gray-800 admin-light:bg-white">{isLoadingPersonnel ? 'Loading conductors...' : 'Select a conductor'}</option>
                    {conductors.map(c => (<option key={c.id} value={c.name} className="bg-gray-800 admin-light:bg-white">{c.name}</option>))}
                  </select>
                </div>
              </div>
            </section>
          </div>
        </div>

        {/* Pinned to the bottom of the modal's scroll area so the actions stay
            reachable on short screens. */}
        <div className="sticky -bottom-4 z-10 -mx-4 -mb-4 mt-8 flex flex-col-reverse gap-2 border-t border-white/10 admin-light:border-[#E2E8F0] bg-[#1A2540] admin-light:bg-white px-4 py-4 sm:-bottom-6 sm:-mx-6 sm:-mb-6 sm:flex-row sm:justify-end sm:px-6">
          <button type="button" onClick={onClose} disabled={isSubmitting} className="inline-flex h-11 items-center justify-center rounded-lg border border-white/10 admin-light:border-[#E2E8F0] px-5 text-sm font-semibold text-slate-300 admin-light:text-slate-700 transition-colors hover:bg-white/5 admin-light:hover:bg-[#F1F5F9] hover:text-white admin-light:hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50">Cancel</button>
          <button type="submit" disabled={isSubmitting} className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#62A0EA] admin-light:bg-[#1A5FB4] px-5 text-sm font-bold text-white transition-colors hover:bg-[#4A8BD4] admin-light:hover:bg-[#164A8F] disabled:cursor-not-allowed disabled:opacity-50">
            {isSubmitting ? (
              <span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" aria-hidden="true" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {isSubmitting ? 'Reporting...' : 'Report Item'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
