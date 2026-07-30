// components/admin/lost-found/add-lost-found-modal.tsx
'use client';

import { useState, useEffect } from 'react';
import { Modal } from '@/components/admin/ui/modal';
import { Upload, X } from 'lucide-react';
import { itemCategories, type ItemCategory } from '@/app/(admin)/lost-found/data/lost-found-data';

interface PersonnelOption {
  id: string;
  name: string;
}

/** 24h "HH:MM" (native time input value) → "h:mm AM/PM" for storage/display. */
function formatTimeTo12Hour(time24: string): string {
  const [hoursStr, minutesStr] = time24.split(':');
  const hours = Number(hoursStr);
  if (Number.isNaN(hours)) return '';
  const period = hours >= 12 ? 'PM' : 'AM';
  const hour12 = hours % 12 === 0 ? 12 : hours % 12;
  return `${hour12}:${minutesStr} ${period}`;
}

/** Up to 3 photos, e-commerce style — the first is the thumbnail. */
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
  itemName: '', description: '', category: 'OTHER', plateNumber: '', estimatedTimeLost: '', driverName: '', conductorName: '', reporterName: 'Admin', imageFiles: [], imagePreviews: [],
};

export function AddLostFoundModal({ isOpen, onClose, onSave }: AddLostFoundModalProps) {
  const [formData, setFormData] = useState<LostFoundFormData>(emptyForm);
  const [timeValue, setTimeValue] = useState('');
  const [drivers, setDrivers] = useState<PersonnelOption[]>([]);
  const [conductors, setConductors] = useState<PersonnelOption[]>([]);
  const [isLoadingPersonnel, setIsLoadingPersonnel] = useState(false);

  // Load the active driver/conductor rosters once, when the modal opens, so
  // "Driver" and "Conductor" can be picked from the real fleet instead of
  // free-typed (typos used to make claim history unsearchable).
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

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setTimeValue(value);
    setFormData(prev => ({ ...prev, estimatedTimeLost: value ? formatTimeTo12Hour(value) : '' }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = ''; // allow re-selecting the same file after a remove
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
    setTimeValue('');
  };

  const inputClasses = "mt-1 block w-full px-3 py-2 bg-[#0E1628] border border-[#1E2D45] rounded-md text-white text-sm placeholder-slate-500 shadow-sm focus:outline-none focus:ring-1 focus:ring-[#62A0EA] transition-colors";

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <h2 className="text-lg sm:text-xl font-bold text-white mb-5">Report New Item</h2>
      <form onSubmit={handleSubmit} className="space-y-4">

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label htmlFor="itemName" className="block text-xs font-medium text-slate-300 mb-1.5">Item Name <span className="text-red-400">*</span></label>
            <input type="text" id="itemName" name="itemName" value={formData.itemName} onChange={handleChange} required placeholder="e.g., Black Leather Wallet" className={inputClasses} />
          </div>

          <div>
            <label htmlFor="category" className="block text-xs font-medium text-slate-300 mb-1.5">Category</label>
            <select id="category" name="category" value={formData.category} onChange={handleChange} className={`${inputClasses} [color-scheme:dark]`}>
              {itemCategories.map(cat => (<option key={cat.value} value={cat.value} className="bg-gray-800">{cat.label}</option>))}
            </select>
          </div>

          <div>
            <label htmlFor="plateNumber" className="block text-xs font-medium text-slate-300 mb-1.5">Plate Number</label>
            <input type="text" id="plateNumber" name="plateNumber" value={formData.plateNumber} onChange={handleChange} placeholder="ABC 1234" className={inputClasses} />
          </div>

          <div>
            <label htmlFor="estimatedTimeLost" className="block text-xs font-medium text-slate-300 mb-1.5">Estimated Time Lost</label>
            <input type="time" id="estimatedTimeLost" name="estimatedTimeLost" value={timeValue} onChange={handleTimeChange} className={`${inputClasses} [color-scheme:dark]`} />
          </div>

          <div>
            <label htmlFor="driverName" className="block text-xs font-medium text-slate-300 mb-1.5">Driver</label>
            <select id="driverName" name="driverName" value={formData.driverName} onChange={handleChange} disabled={isLoadingPersonnel} className={`${inputClasses} [color-scheme:dark]`}>
              <option value="" className="bg-gray-800">{isLoadingPersonnel ? 'Loading drivers…' : 'Select a driver'}</option>
              {drivers.map(d => (<option key={d.id} value={d.name} className="bg-gray-800">{d.name}</option>))}
            </select>
          </div>

          <div>
            <label htmlFor="conductorName" className="block text-xs font-medium text-slate-300 mb-1.5">Conductor</label>
            <select id="conductorName" name="conductorName" value={formData.conductorName} onChange={handleChange} disabled={isLoadingPersonnel} className={`${inputClasses} [color-scheme:dark]`}>
              <option value="" className="bg-gray-800">{isLoadingPersonnel ? 'Loading conductors…' : 'Select a conductor'}</option>
              {conductors.map(c => (<option key={c.id} value={c.name} className="bg-gray-800">{c.name}</option>))}
            </select>
          </div>
        </div>

        <div>
          <label htmlFor="description" className="block text-xs font-medium text-slate-300 mb-1.5">Detailed Description</label>
          <textarea id="description" name="description" rows={3} value={formData.description} onChange={handleChange} placeholder="Found under the seat near the back door..." className={`${inputClasses} resize-none`} />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1.5">
            Photos <span className="text-slate-500 font-normal">({formData.imagePreviews.length}/{MAX_PHOTOS} — first is the thumbnail)</span>
          </label>
          <div className="grid grid-cols-3 gap-3">
            {formData.imagePreviews.map((preview, index) => (
              <div key={index} className="relative aspect-square">
                <img src={preview} alt={`Photo ${index + 1}`} className="w-full h-full object-cover rounded-md border border-[#1E2D45]" />
                {index === 0 && (
                  <span className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-black/60 text-[9px] font-semibold uppercase tracking-wider text-white">Thumbnail</span>
                )}
                <button type="button" onClick={() => handleRemoveImage(index)} className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full"><X size={14} /></button>
              </div>
            ))}
            {formData.imagePreviews.length < MAX_PHOTOS && (
              <label htmlFor="image-upload" className="aspect-square flex flex-col items-center justify-center gap-1 border-2 border-dashed border-[#1E2D45] rounded-md cursor-pointer hover:border-[#62A0EA] transition-colors text-slate-500 hover:text-[#62A0EA]">
                <Upload size={20} />
                <span className="text-[10px] font-medium">Add photo</span>
                <input id="image-upload" name="image-upload" type="file" className="sr-only" accept="image/*" onChange={handleImageChange} />
              </label>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-1.5">PNG, JPG, WEBP up to 5MB each.</p>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t border-[#1E2D45]">
          <button type="button" onClick={onClose} className="px-5 py-2.5 border border-[#1E2D45] rounded-md text-slate-300 hover:bg-[#131C2E] transition-colors">Cancel</button>
          <button type="submit" className="px-5 py-2.5 bg-[#62A0EA] text-white font-medium rounded-md hover:bg-[#4A8BD4] transition-colors">Report Item</button>
        </div>
      </form>
    </Modal>
  );
}