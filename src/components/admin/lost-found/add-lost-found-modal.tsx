// components/admin/lost-found/add-lost-found-modal.tsx
'use client';

import { useState } from 'react';
import { Modal } from '@/components/admin/ui/modal';
import { Upload, X } from 'lucide-react';
import { itemCategories, type ItemCategory } from '@/app/(admin)/lost-found/data/lost-found-data';

export interface LostFoundFormData {
  itemName: string;
  description: string;
  category: ItemCategory;
  plateNumber: string;
  estimatedTimeLost: string;
  driverName: string;
  conductorName: string;
  reporterName: string;
  imageFile: File | null;
  imagePreview: string | null;
}

interface AddLostFoundModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (itemData: LostFoundFormData) => void;
}

const emptyForm: LostFoundFormData = {
  itemName: '', description: '', category: 'OTHER', plateNumber: '', estimatedTimeLost: '', driverName: '', conductorName: '', reporterName: 'Admin', imageFile: null, imagePreview: null,
};

export function AddLostFoundModal({ isOpen, onClose, onSave }: AddLostFoundModalProps) {
  const [formData, setFormData] = useState<LostFoundFormData>(emptyForm);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setFormData(prev => ({ ...prev, imageFile: file }));
      const reader = new FileReader();
      reader.onloadend = () => setFormData(prev => ({ ...prev, imagePreview: reader.result as string }));
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => setFormData(prev => ({ ...prev, imageFile: null, imagePreview: null }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    setFormData(emptyForm);
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
            <input type="text" id="estimatedTimeLost" name="estimatedTimeLost" value={formData.estimatedTimeLost} onChange={handleChange} placeholder="Around 8:00 AM" className={inputClasses} />
          </div>

          <div>
            <label htmlFor="driverName" className="block text-xs font-medium text-slate-300 mb-1.5">Driver Name</label>
            <input type="text" id="driverName" name="driverName" value={formData.driverName} onChange={handleChange} placeholder="Juan Dela Cruz" className={inputClasses} />
          </div>

          <div>
            <label htmlFor="conductorName" className="block text-xs font-medium text-slate-300 mb-1.5">Conductor Name</label>
            <input type="text" id="conductorName" name="conductorName" value={formData.conductorName} onChange={handleChange} placeholder="Pedro Penduko" className={inputClasses} />
          </div>
        </div>

        <div>
          <label htmlFor="description" className="block text-xs font-medium text-slate-300 mb-1.5">Detailed Description</label>
          <textarea id="description" name="description" rows={3} value={formData.description} onChange={handleChange} placeholder="Found under the seat near the back door..." className={`${inputClasses} resize-none`} />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1.5">Upload Image</label>
          <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed border-[#1E2D45] rounded-md">
            {formData.imagePreview ? (
              <div className="relative">
                <img src={formData.imagePreview} alt="Preview" className="h-32 w-32 object-cover rounded-md" />
                <button type="button" onClick={handleRemoveImage} className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full"><X size={16} /></button>
              </div>
            ) : (
              <div className="space-y-1 text-center">
                <Upload className="mx-auto h-12 w-12 text-slate-500" />
                <div className="flex text-sm text-slate-300">
                  <label htmlFor="image-upload" className="relative cursor-pointer rounded-md font-medium text-[#62A0EA] hover:text-[#4A8BD4]">
                    <span>Upload a file</span>
                    <input id="image-upload" name="image-upload" type="file" className="sr-only" accept="image/*" onChange={handleImageChange} />
                  </label>
                  <p className="pl-1">or drag and drop</p>
                </div>
                <p className="text-xs text-slate-500">PNG, JPG, GIF up to 10MB</p>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t border-[#1E2D45]">
          <button type="button" onClick={onClose} className="px-5 py-2.5 border border-[#1E2D45] rounded-md text-slate-300 hover:bg-[#131C2E] transition-colors">Cancel</button>
          <button type="submit" className="px-5 py-2.5 bg-[#62A0EA] text-white font-medium rounded-md hover:bg-[#4A8BD4] transition-colors">Report Item</button>
        </div>
      </form>
    </Modal>
  );
}