// components/admin/users/add-registration-modal.tsx
'use client';

import { useState } from 'react';
import { Modal } from '@/components/admin/ui/modal';
import { Upload, X } from 'lucide-react';

interface AddRegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
}

export function AddRegistrationModal({ isOpen, onClose, onSave }: AddRegistrationModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phoneNumber: '',
    commuterType: 'Regular',
    languagePreference: 'English',
    idImageFile: null as File | null,
    idImagePreview: null as string | null,
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setFormData(prev => ({ ...prev, idImageFile: file }));
      const reader = new FileReader();
      reader.onloadend = () => setFormData(prev => ({ ...prev, idImagePreview: reader.result as string }));
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => setFormData(prev => ({ ...prev, idImageFile: null, idImagePreview: null }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    setFormData({ name: '', email: '', phoneNumber: '', commuterType: 'Regular', languagePreference: 'English', idImageFile: null, idImagePreview: null });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <h2 className="text-xl font-bold text-white mb-4">Onsite Commuter Registration</h2>
      <p className="text-xs text-gray-400 mb-4 -mt-2">This will create a pending verification request.</p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-300">Full Name</label>
            <input type="text" name="name" value={formData.name} onChange={handleChange} required className="mt-1 block w-full px-3 py-2 bg-white/10 border border-white/20 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-blue-500" />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-300">Email</label>
            <input type="email" name="email" value={formData.email} onChange={handleChange} required className="mt-1 block w-full px-3 py-2 bg-white/10 border border-white/20 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-blue-500" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300">Phone Number</label>
            <input type="text" name="phoneNumber" value={formData.phoneNumber} onChange={handleChange} required placeholder="0917-123-4567" className="mt-1 block w-full px-3 py-2 bg-white/10 border border-white/20 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-blue-500" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300">Commuter Type</label>
            <select name="commuterType" value={formData.commuterType} onChange={handleChange} className="mt-1 block w-full px-3 py-2 bg-white/10 border border-white/20 rounded-md text-white focus:outline-none focus:ring-blue-500 [color-scheme:dark]">
              <option value="Regular" className="bg-gray-800">Regular</option>
              <option value="Student" className="bg-gray-800">Student</option>
              <option value="Senior Citizen" className="bg-gray-800">Senior Citizen</option>
              <option value="PWD" className="bg-gray-800">PWD</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300">Language</label>
            <select name="languagePreference" value={formData.languagePreference} onChange={handleChange} className="mt-1 block w-full px-3 py-2 bg-white/10 border border-white/20 rounded-md text-white focus:outline-none focus:ring-blue-500 [color-scheme:dark]">
              <option value="English" className="bg-gray-800">English</option>
              <option value="Filipino" className="bg-gray-800">Filipino</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300">Upload Valid ID <span className="text-red-400">*</span></label>
          <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-white/20 border-dashed rounded-md">
            {formData.idImagePreview ? (
              <div className="relative">
                <img src={formData.idImagePreview} alt="ID Preview" className="h-32 w-auto object-cover rounded-md" />
                <button type="button" onClick={handleRemoveImage} className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full"><X size={16} /></button>
              </div>
            ) : (
              <div className="space-y-1 text-center">
                <Upload className="mx-auto h-12 w-12 text-gray-400" />
                <div className="flex text-sm text-gray-300">
                  <label htmlFor="reg-id-upload" className="relative cursor-pointer rounded-md font-medium text-blue-400 hover:text-blue-300">
                    <span>Upload ID</span>
                    <input id="reg-id-upload" type="file" className="sr-only" accept="image/*" onChange={handleImageChange} />
                  </label>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end space-x-3 pt-4">
          <button type="button" onClick={onClose} className="px-4 py-2 border border-gray-500 rounded-md text-gray-300 hover:bg-gray-700">Cancel</button>
          <button type="submit" className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600">Submit Request</button>
        </div>
      </form>
    </Modal>
  );
}