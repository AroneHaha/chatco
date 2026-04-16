// components/admin/lost-found/add-lost-found-modal.tsx
'use client';

import { useState } from 'react';
import { Modal } from '@/components/admin/ui/modal';
import { Upload, X } from 'lucide-react';

// Exact Commuter Categories
const itemCategories = [
  { value: "ACCESSORY", label: "Accessories" },
  { value: "BAG", label: "Bags" },
  { value: "WALLET", label: "Wallets" },
  { value: "GADGET", label: "Gadgets" },
  { value: "CLOTHING", label: "Clothing" },
  { value: "DOCUMENT", label: "Documents" },
  { value: "OTHER", label: "Other" },
];

interface AddLostFoundModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (itemData: any) => void;
}

export function AddLostFoundModal({ isOpen, onClose, onSave }: AddLostFoundModalProps) {
  const [formData, setFormData] = useState({
    itemName: '', description: '', category: 'OTHER', plateNumber: '', estimatedTimeLost: '', driverName: '', conductorName: '', reporterName: 'Admin', imageFile: null as File | null, imagePreview: null as string | null,
  });

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
    setFormData({ itemName: '', description: '', category: 'OTHER', plateNumber: '', estimatedTimeLost: '', driverName: '', conductorName: '', reporterName: 'Admin', imageFile: null, imagePreview: null });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <h2 className="text-xl font-bold text-white mb-4">Report New Item</h2>
      <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label htmlFor="itemName" className="block text-sm font-medium text-gray-300">Item Name <span className="text-red-400">*</span></label>
            <input type="text" id="itemName" name="itemName" value={formData.itemName} onChange={handleChange} required placeholder="e.g., Black Leather Wallet" className="mt-1 block w-full px-3 py-2 bg-white/10 border border-white/20 rounded-md text-white placeholder-gray-400 shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
          </div>
          
          <div>
            <label htmlFor="category" className="block text-sm font-medium text-gray-300">Category</label>
            <select id="category" name="category" value={formData.category} onChange={handleChange} className="mt-1 block w-full px-3 py-2 bg-white/10 border border-white/20 rounded-md text-white shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 [color-scheme:dark]">
              {itemCategories.map(cat => (<option key={cat.value} value={cat.value} className="bg-gray-800">{cat.label}</option>))}
            </select>
          </div>

          <div>
            <label htmlFor="plateNumber" className="block text-sm font-medium text-gray-300">Plate Number</label>
            <input type="text" id="plateNumber" name="plateNumber" value={formData.plateNumber} onChange={handleChange} placeholder="ABC 1234" className="mt-1 block w-full px-3 py-2 bg-white/10 border border-white/20 rounded-md text-white placeholder-gray-400 shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
          </div>

          <div>
            <label htmlFor="estimatedTimeLost" className="block text-sm font-medium text-gray-300">Estimated Time Lost</label>
            <input type="text" id="estimatedTimeLost" name="estimatedTimeLost" value={formData.estimatedTimeLost} onChange={handleChange} placeholder="Around 8:00 AM" className="mt-1 block w-full px-3 py-2 bg-white/10 border border-white/20 rounded-md text-white placeholder-gray-400 shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
          </div>

          <div>
            <label htmlFor="driverName" className="block text-sm font-medium text-gray-300">Driver Name</label>
            <input type="text" id="driverName" name="driverName" value={formData.driverName} onChange={handleChange} placeholder="Juan Dela Cruz" className="mt-1 block w-full px-3 py-2 bg-white/10 border border-white/20 rounded-md text-white placeholder-gray-400 shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
          </div>

          <div>
            <label htmlFor="conductorName" className="block text-sm font-medium text-gray-300">Conductor Name</label>
            <input type="text" id="conductorName" name="conductorName" value={formData.conductorName} onChange={handleChange} placeholder="Pedro Penduko" className="mt-1 block w-full px-3 py-2 bg-white/10 border border-white/20 rounded-md text-white placeholder-gray-400 shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
          </div>
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-300">Detailed Description</label>
          <textarea id="description" name="description" rows={3} value={formData.description} onChange={handleChange} placeholder="Found under the seat near the back door..." className="mt-1 block w-full px-3 py-2 bg-white/10 border border-white/20 rounded-md text-white placeholder-gray-400 shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 resize-none" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300">Upload Image</label>
          <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-white/20 border-dashed rounded-md">
            {formData.imagePreview ? (
              <div className="relative">
                <img src={formData.imagePreview} alt="Preview" className="h-32 w-32 object-cover rounded-md" />
                <button type="button" onClick={handleRemoveImage} className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full"><X size={16} /></button>
              </div>
            ) : (
              <div className="space-y-1 text-center">
                <Upload className="mx-auto h-12 w-12 text-gray-400" />
                <div className="flex text-sm text-gray-300">
                  <label htmlFor="image-upload" className="relative cursor-pointer rounded-md font-medium text-blue-400 hover:text-blue-300">
                    <span>Upload a file</span>
                    <input id="image-upload" name="image-upload" type="file" className="sr-only" accept="image/*" onChange={handleImageChange} />
                  </label>
                  <p className="pl-1">or drag and drop</p>
                </div>
                <p className="text-xs text-gray-400">PNG, JPG, GIF up to 10MB</p>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end space-x-3 pt-4">
          <button type="button" onClick={onClose} className="px-4 py-2 border border-gray-500 rounded-md text-gray-300 hover:bg-gray-700 transition-colors">Cancel</button>
          <button type="submit" className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors">Report Item</button>
        </div>
      </form>
    </Modal>
  );
}