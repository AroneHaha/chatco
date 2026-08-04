// components/admin/lost-found/add-lost-found-modal.tsx
'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { Modal } from '@/components/admin/ui/modal';
import { BusFront, Clock3, FileText, IdCard, ImagePlus, PackageSearch, Save, Tag, UserRound, X } from 'lucide-react';
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
  onSave: (itemData: LostFoundFormData) => void;
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
  icon,
  children,
  required = false,
}: {
  htmlFor?: string;
  icon: ReactNode;
  children: ReactNode;
  required?: boolean;
}) {
  const content = (
    <>
      <span className="text-[#62A0EA]">{icon}</span>
      <span>{children}</span>
      {required && <span className="text-red-400">*</span>}
    </>
  );

  if (!htmlFor) {
    return <span className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-slate-300">{content}</span>;
  }

  return (
    <label htmlFor={htmlFor} className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-slate-300">
      {content}
    </label>
  );
}

export function AddLostFoundModal({ isOpen, onClose, onSave }: AddLostFoundModalProps) {
  const [formData, setFormData] = useState<LostFoundFormData>(emptyForm);
  const [timeRange, setTimeRange] = useState({ start: '', end: '' });
  const [drivers, setDrivers] = useState<PersonnelOption[]>([]);
  const [conductors, setConductors] = useState<PersonnelOption[]>([]);
  const [isLoadingPersonnel, setIsLoadingPersonnel] = useState(false);

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    setFormData(emptyForm);
    setTimeRange({ start: '', end: '' });
  };

  const inputClasses = 'block h-11 w-full rounded-lg border border-white/10 bg-[#0E1628] px-3 text-sm text-white shadow-sm outline-none transition-colors placeholder:text-slate-600 focus:border-[#62A0EA] focus:ring-2 focus:ring-[#62A0EA]/15 disabled:cursor-not-allowed disabled:opacity-60';
  const sectionClasses = 'rounded-xl border border-white/10 bg-white/[0.035] p-4';

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="max-w-3xl" rounded="rounded-xl">
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="pr-10">
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-[#62A0EA]/20 bg-[#1A5FB4]/15 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#8CB9F0]">
            <PackageSearch className="h-3.5 w-3.5" />
            New item
          </div>
          <h2 className="text-xl font-bold leading-tight text-white sm:text-2xl">Report Lost & Found Item</h2>
          <p className="mt-1 text-sm text-slate-500">Create the item record first. Claim review and release actions happen after claims are submitted.</p>
        </div>

        <section className={sectionClasses}>
          <div className="mb-3 flex items-center gap-2">
            <PackageSearch className="h-4 w-4 text-[#62A0EA]" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">Item Information</h3>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <FieldLabel htmlFor="itemName" icon={<PackageSearch className="h-3.5 w-3.5" />} required>Item Name</FieldLabel>
              <input type="text" id="itemName" name="itemName" value={formData.itemName} onChange={handleChange} required placeholder="e.g., Black Leather Wallet" className={inputClasses} />
            </div>

            <div>
              <FieldLabel htmlFor="category" icon={<Tag className="h-3.5 w-3.5" />}>Category</FieldLabel>
              <select id="category" name="category" value={formData.category} onChange={handleChange} className={`${inputClasses} [color-scheme:dark]`}>
                {itemCategories.map(cat => (<option key={cat.value} value={cat.value} className="bg-gray-800">{cat.label}</option>))}
              </select>
            </div>

            <div>
              <FieldLabel htmlFor="plateNumber" icon={<IdCard className="h-3.5 w-3.5" />}>Plate Number</FieldLabel>
              <input type="text" id="plateNumber" name="plateNumber" value={formData.plateNumber} onChange={handleChange} placeholder="ABC 1234" className={inputClasses} />
            </div>

            <div className="sm:col-span-2">
              <FieldLabel htmlFor="description" icon={<FileText className="h-3.5 w-3.5" />}>Detailed Description</FieldLabel>
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

        <section className={sectionClasses}>
          <div className="mb-3 flex items-center gap-2">
            <BusFront className="h-4 w-4 text-[#62A0EA]" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">Route & Crew Details</h3>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <FieldLabel icon={<Clock3 className="h-3.5 w-3.5" />}>Estimated Time Lost</FieldLabel>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label htmlFor="estimatedTimeLostStart" className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-slate-500">From</label>
                  <input
                    type="time"
                    id="estimatedTimeLostStart"
                    value={timeRange.start}
                    onChange={(e) => handleTimeChange('start', e)}
                    className={`${inputClasses} [color-scheme:dark]`}
                    aria-label="Estimated time lost start"
                  />
                </div>
                <div>
                  <label htmlFor="estimatedTimeLostEnd" className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-slate-500">To</label>
                  <input
                    type="time"
                    id="estimatedTimeLostEnd"
                    value={timeRange.end}
                    onChange={(e) => handleTimeChange('end', e)}
                    className={`${inputClasses} [color-scheme:dark]`}
                    aria-label="Estimated time lost end"
                  />
                </div>
              </div>
            </div>

            <div>
              <FieldLabel htmlFor="driverName" icon={<BusFront className="h-3.5 w-3.5" />}>Driver</FieldLabel>
              <div className="pt-4">
                <select id="driverName" name="driverName" value={formData.driverName} onChange={handleChange} disabled={isLoadingPersonnel} className={`${inputClasses} [color-scheme:dark]`}>
                  <option value="" className="bg-gray-800">{isLoadingPersonnel ? 'Loading drivers...' : 'Select a driver'}</option>
                  {drivers.map(d => (<option key={d.id} value={d.name} className="bg-gray-800">{d.name}</option>))}
                </select>
              </div>
            </div>

            <div className="sm:col-span-2">
              <FieldLabel htmlFor="conductorName" icon={<UserRound className="h-3.5 w-3.5" />}>Conductor</FieldLabel>
              <select id="conductorName" name="conductorName" value={formData.conductorName} onChange={handleChange} disabled={isLoadingPersonnel} className={`${inputClasses} [color-scheme:dark]`}>
                <option value="" className="bg-gray-800">{isLoadingPersonnel ? 'Loading conductors...' : 'Select a conductor'}</option>
                {conductors.map(c => (<option key={c.id} value={c.name} className="bg-gray-800">{c.name}</option>))}
              </select>
            </div>
          </div>
        </section>

        <section className={sectionClasses}>
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <ImagePlus className="h-4 w-4 text-[#62A0EA]" />
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">Photos</h3>
            </div>
            <span className="text-xs font-semibold text-slate-500">{formData.imagePreviews.length}/{MAX_PHOTOS}</span>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {formData.imagePreviews.map((preview, index) => (
              <div key={index} className="group relative aspect-square">
                <img src={preview} alt={`Photo ${index + 1}`} className="h-full w-full rounded-lg border border-white/10 object-cover" />
                {index === 0 && (
                  <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-white">Thumbnail</span>
                )}
                <button
                  type="button"
                  onClick={() => handleRemoveImage(index)}
                  className="absolute -right-2 -top-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white shadow-lg shadow-black/30 transition-colors hover:bg-red-600"
                  aria-label={`Remove photo ${index + 1}`}
                  title="Remove photo"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
            {formData.imagePreviews.length < MAX_PHOTOS && (
              <label htmlFor="image-upload" className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-white/15 bg-white/[0.03] text-slate-500 transition-colors hover:border-[#62A0EA] hover:text-[#62A0EA]">
                <ImagePlus className="h-5 w-5" />
                <span className="text-[10px] font-semibold">Add photo</span>
                <input id="image-upload" name="image-upload" type="file" className="sr-only" accept="image/*" onChange={handleImageChange} />
              </label>
            )}
          </div>
          <p className="mt-2 text-xs text-slate-500">PNG, JPG, WEBP up to 5MB each. The first photo becomes the thumbnail.</p>
        </section>

        <div className="flex flex-col-reverse gap-2 border-t border-white/10 pt-4 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} className="inline-flex h-11 items-center justify-center rounded-lg border border-white/10 px-5 text-sm font-semibold text-slate-300 transition-colors hover:bg-white/5 hover:text-white">Cancel</button>
          <button type="submit" className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#62A0EA] px-5 text-sm font-bold text-white transition-colors hover:bg-[#4A8BD4]">
            <Save className="h-4 w-4" />
            Report Item
          </button>
        </div>
      </form>
    </Modal>
  );
}
