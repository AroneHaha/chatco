// components/admin/lost-found/edit-lost-found-modal.tsx
'use client';

import { useEffect, useState } from 'react';
import { Modal } from '@/components/admin/ui/modal';
import { BusFront, Clock3, FileText, IdCard, PackageSearch, Save, Tag, UserRound } from 'lucide-react';
import { itemCategories, type ItemCategory, type LostFoundItem } from '@/app/(admin)/lost-found/data/lost-found-data';

interface PersonnelOption {
  id: string;
  name: string;
}

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
  onSave: (itemId: string, data: EditLostFoundFormData) => Promise<void>;
}

function FieldLabel({
  htmlFor,
  icon,
  children,
  required = false,
}: {
  htmlFor?: string;
  icon: React.ReactNode;
  children: React.ReactNode;
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

export function EditLostFoundModal({ isOpen, onClose, item, onSave }: EditLostFoundModalProps) {
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
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !item) return;

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!item) return;
    setIsSaving(true);
    setError(null);
    try {
      await onSave(item.id, formData);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save changes.');
    } finally {
      setIsSaving(false);
    }
  };

  const inputClasses = 'block h-11 w-full rounded-lg border border-white/10 bg-[#0E1628] px-3 text-sm text-white shadow-sm outline-none transition-colors placeholder:text-slate-600 focus:border-[#62A0EA] focus:ring-2 focus:ring-[#62A0EA]/15 disabled:cursor-not-allowed disabled:opacity-60';
  const sectionClasses = 'rounded-xl border border-white/10 bg-white/[0.035] p-4';

  if (!item) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="max-w-3xl" rounded="rounded-xl">
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="pr-10">
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-[#62A0EA]/20 bg-[#1A5FB4]/15 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#8CB9F0]">
            <PackageSearch className="h-3.5 w-3.5" />
            Edit item
          </div>
          <h2 className="text-xl font-bold leading-tight text-white sm:text-2xl">Update Lost & Found Record</h2>
          <p className="mt-1 text-sm text-slate-500">Photos and claim decisions are handled from the item details and claim review views.</p>
        </div>

        {error && (
          <div className="rounded-lg border border-red-400/25 bg-red-500/10 px-3 py-2.5">
            <p className="text-sm font-medium text-red-300">{error}</p>
          </div>
        )}

        <section className={sectionClasses}>
          <div className="mb-3 flex items-center gap-2">
            <PackageSearch className="h-4 w-4 text-[#62A0EA]" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">Item Information</h3>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <FieldLabel htmlFor="edit-itemName" icon={<PackageSearch className="h-3.5 w-3.5" />} required>Item Name</FieldLabel>
              <input type="text" id="edit-itemName" name="itemName" value={formData.itemName} onChange={handleChange} required disabled={isSaving} className={inputClasses} />
            </div>

            <div>
              <FieldLabel htmlFor="edit-category" icon={<Tag className="h-3.5 w-3.5" />}>Category</FieldLabel>
              <select id="edit-category" name="category" value={formData.category} onChange={handleChange} disabled={isSaving} className={`${inputClasses} [color-scheme:dark]`}>
                {itemCategories.map(cat => (<option key={cat.value} value={cat.value} className="bg-gray-800">{cat.label}</option>))}
              </select>
            </div>

            <div>
              <FieldLabel htmlFor="edit-plateNumber" icon={<IdCard className="h-3.5 w-3.5" />}>Plate Number</FieldLabel>
              <select id="edit-plateNumber" name="plateNumber" value={formData.plateNumber} onChange={handleChange} disabled={isLoadingPlates || isSaving} className={`${inputClasses} [color-scheme:dark]`}>
                <option value="" className="bg-gray-800">{isLoadingPlates ? 'Loading plate numbers...' : 'Select a plate number'}</option>
                {formData.plateNumber && !plateNumbers.includes(formData.plateNumber) && (
                  <option value={formData.plateNumber} className="bg-gray-800">{formData.plateNumber}</option>
                )}
                {plateNumbers.map(plate => (<option key={plate} value={plate} className="bg-gray-800">{plate}</option>))}
              </select>
            </div>

            <div className="sm:col-span-2">
              <FieldLabel htmlFor="edit-description" icon={<FileText className="h-3.5 w-3.5" />}>Detailed Description</FieldLabel>
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
                  <label htmlFor="edit-estimatedTimeLostStart" className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-slate-500">From</label>
                  <input
                    type="time"
                    id="edit-estimatedTimeLostStart"
                    value={timeRange.start}
                    onChange={(e) => handleTimeChange('start', e)}
                    disabled={isSaving}
                    className={`${inputClasses} [color-scheme:dark]`}
                    aria-label="Estimated time lost start"
                  />
                </div>
                <div>
                  <label htmlFor="edit-estimatedTimeLostEnd" className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-slate-500">To</label>
                  <input
                    type="time"
                    id="edit-estimatedTimeLostEnd"
                    value={timeRange.end}
                    onChange={(e) => handleTimeChange('end', e)}
                    disabled={isSaving}
                    className={`${inputClasses} [color-scheme:dark]`}
                    aria-label="Estimated time lost end"
                  />
                </div>
              </div>
            </div>

            <div>
              <FieldLabel htmlFor="edit-driverName" icon={<BusFront className="h-3.5 w-3.5" />}>Driver</FieldLabel>
              <div className="pt-4">
                <select id="edit-driverName" name="driverName" value={formData.driverName} onChange={handleChange} disabled={isLoadingPersonnel || isSaving} className={`${inputClasses} [color-scheme:dark]`}>
                  <option value="" className="bg-gray-800">{isLoadingPersonnel ? 'Loading drivers...' : 'Select a driver'}</option>
                  {formData.driverName && !drivers.some(d => d.name === formData.driverName) && (
                    <option value={formData.driverName} className="bg-gray-800">{formData.driverName}</option>
                  )}
                  {drivers.map(d => (<option key={d.id} value={d.name} className="bg-gray-800">{d.name}</option>))}
                </select>
              </div>
            </div>

            <div className="sm:col-span-2">
              <FieldLabel htmlFor="edit-conductorName" icon={<UserRound className="h-3.5 w-3.5" />}>Conductor</FieldLabel>
              <select id="edit-conductorName" name="conductorName" value={formData.conductorName} onChange={handleChange} disabled={isLoadingPersonnel || isSaving} className={`${inputClasses} [color-scheme:dark]`}>
                <option value="" className="bg-gray-800">{isLoadingPersonnel ? 'Loading conductors...' : 'Select a conductor'}</option>
                {formData.conductorName && !conductors.some(c => c.name === formData.conductorName) && (
                  <option value={formData.conductorName} className="bg-gray-800">{formData.conductorName}</option>
                )}
                {conductors.map(c => (<option key={c.id} value={c.name} className="bg-gray-800">{c.name}</option>))}
              </select>
            </div>
          </div>
        </section>

        <div className="flex flex-col-reverse gap-2 border-t border-white/10 pt-4 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} disabled={isSaving} className="inline-flex h-11 items-center justify-center rounded-lg border border-white/10 px-5 text-sm font-semibold text-slate-300 transition-colors hover:bg-white/5 hover:text-white disabled:opacity-50">Cancel</button>
          <button type="submit" disabled={isSaving} className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#62A0EA] px-5 text-sm font-bold text-white transition-colors hover:bg-[#4A8BD4] disabled:opacity-50">
            {isSaving ? (
              <span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
