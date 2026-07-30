// components/admin/lost-found/edit-lost-found-modal.tsx
'use client';

import { useState, useEffect } from 'react';
import { Modal } from '@/components/admin/ui/modal';
import { Save } from 'lucide-react';
import { itemCategories, type ItemCategory, type LostFoundItem } from '@/app/(admin)/lost-found/data/lost-found-data';

interface PersonnelOption {
  id: string;
  name: string;
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

/** Edits a previously reported item's descriptive fields. Photos are managed
 * separately from the detail view — this modal is text fields only. Blocked
 * server-side once the item is CLOSED (a finalized historical record). */
export function EditLostFoundModal({ isOpen, onClose, item, onSave }: EditLostFoundModalProps) {
  const [formData, setFormData] = useState<EditLostFoundFormData>({
    itemName: '', description: '', category: 'OTHER', plateNumber: '', estimatedTimeLost: '', driverName: '', conductorName: '',
  });
  const [drivers, setDrivers] = useState<PersonnelOption[]>([]);
  const [conductors, setConductors] = useState<PersonnelOption[]>([]);
  const [isLoadingPersonnel, setIsLoadingPersonnel] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Prefill from the item whenever the modal opens for a (possibly new) item.
  useEffect(() => {
    if (!isOpen || !item) return;
    setFormData({
      itemName: item.itemName,
      description: item.description,
      category: item.category,
      plateNumber: item.plateNumber === '—' ? '' : item.plateNumber,
      estimatedTimeLost: item.estimatedTimeLost === '—' ? '' : item.estimatedTimeLost,
      driverName: item.driverName === '—' ? '' : item.driverName,
      conductorName: item.conductorName === '—' ? '' : item.conductorName,
    });
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
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

  const inputClasses = "mt-1 block w-full px-3 py-2 bg-[#0E1628] border border-[#1E2D45] rounded-md text-white text-sm placeholder-slate-500 shadow-sm focus:outline-none focus:ring-1 focus:ring-[#62A0EA] transition-colors";

  if (!item) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <h2 className="text-lg sm:text-xl font-bold text-white mb-5">Edit Item</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-md">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label htmlFor="edit-itemName" className="block text-xs font-medium text-slate-300 mb-1.5">Item Name <span className="text-red-400">*</span></label>
            <input type="text" id="edit-itemName" name="itemName" value={formData.itemName} onChange={handleChange} required disabled={isSaving} className={inputClasses} />
          </div>

          <div>
            <label htmlFor="edit-category" className="block text-xs font-medium text-slate-300 mb-1.5">Category</label>
            <select id="edit-category" name="category" value={formData.category} onChange={handleChange} disabled={isSaving} className={`${inputClasses} [color-scheme:dark]`}>
              {itemCategories.map(cat => (<option key={cat.value} value={cat.value} className="bg-gray-800">{cat.label}</option>))}
            </select>
          </div>

          <div>
            <label htmlFor="edit-plateNumber" className="block text-xs font-medium text-slate-300 mb-1.5">Plate Number</label>
            <input type="text" id="edit-plateNumber" name="plateNumber" value={formData.plateNumber} onChange={handleChange} disabled={isSaving} placeholder="ABC 1234" className={inputClasses} />
          </div>

          <div>
            <label htmlFor="edit-estimatedTimeLost" className="block text-xs font-medium text-slate-300 mb-1.5">Estimated Time Lost</label>
            <input type="text" id="edit-estimatedTimeLost" name="estimatedTimeLost" value={formData.estimatedTimeLost} onChange={handleChange} disabled={isSaving} placeholder="e.g. 8:00 AM" className={inputClasses} />
          </div>

          <div>
            <label htmlFor="edit-driverName" className="block text-xs font-medium text-slate-300 mb-1.5">Driver</label>
            <select id="edit-driverName" name="driverName" value={formData.driverName} onChange={handleChange} disabled={isLoadingPersonnel || isSaving} className={`${inputClasses} [color-scheme:dark]`}>
              <option value="" className="bg-gray-800">{isLoadingPersonnel ? 'Loading drivers…' : 'Select a driver'}</option>
              {formData.driverName && !drivers.some(d => d.name === formData.driverName) && (
                <option value={formData.driverName} className="bg-gray-800">{formData.driverName}</option>
              )}
              {drivers.map(d => (<option key={d.id} value={d.name} className="bg-gray-800">{d.name}</option>))}
            </select>
          </div>

          <div>
            <label htmlFor="edit-conductorName" className="block text-xs font-medium text-slate-300 mb-1.5">Conductor</label>
            <select id="edit-conductorName" name="conductorName" value={formData.conductorName} onChange={handleChange} disabled={isLoadingPersonnel || isSaving} className={`${inputClasses} [color-scheme:dark]`}>
              <option value="" className="bg-gray-800">{isLoadingPersonnel ? 'Loading conductors…' : 'Select a conductor'}</option>
              {formData.conductorName && !conductors.some(c => c.name === formData.conductorName) && (
                <option value={formData.conductorName} className="bg-gray-800">{formData.conductorName}</option>
              )}
              {conductors.map(c => (<option key={c.id} value={c.name} className="bg-gray-800">{c.name}</option>))}
            </select>
          </div>
        </div>

        <div>
          <label htmlFor="edit-description" className="block text-xs font-medium text-slate-300 mb-1.5">Detailed Description</label>
          <textarea id="edit-description" name="description" rows={3} value={formData.description} onChange={handleChange} disabled={isSaving} className={`${inputClasses} resize-none`} />
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t border-[#1E2D45]">
          <button type="button" onClick={onClose} disabled={isSaving} className="px-5 py-2.5 border border-[#1E2D45] rounded-md text-slate-300 hover:bg-[#131C2E] transition-colors disabled:opacity-50">Cancel</button>
          <button type="submit" disabled={isSaving} className="flex items-center gap-2 px-5 py-2.5 bg-[#62A0EA] text-white font-medium rounded-md hover:bg-[#4A8BD4] transition-colors disabled:opacity-50">
            <Save size={16} />
            {isSaving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
