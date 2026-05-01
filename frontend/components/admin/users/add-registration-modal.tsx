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
  // Language Preference completely removed from here
  const [formData, setFormData] = useState({
    firstName: '',
    middleInitial: '',
    lastName: '',
    birthday: '', 
    username: '',
    password: '',
    email: '',
    phoneNumber: '',
    commuterType: 'Regular',
    idImageFile: null as File | null,
    idImagePreview: null as string | null,
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    if (name === 'middleInitial') {
      setFormData(prev => ({ ...prev, [name]: value.toUpperCase().slice(0, 1) }));
    } 
    else if (name === 'username') {
      setFormData(prev => ({ ...prev, [name]: value.replace(/\s/g, '') }));
    } 
    else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
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
    
    // Language Preference completely removed from here
    setFormData({ 
      firstName: '', 
      middleInitial: '', 
      lastName: '', 
      birthday: '', 
      username: '', 
      password: '', 
      email: '', 
      phoneNumber: '', 
      commuterType: 'Regular', 
      idImageFile: null, 
      idImagePreview: null 
    });
  };

  const inputClasses = "mt-1 block w-full px-3 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white text-sm placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors";

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="px-1 sm:px-0">
        <h2 className="text-lg sm:text-xl font-bold text-white mb-1">Onsite Commuter Registration</h2>
        <p className="text-xs text-gray-400 mb-5">This will create a pending verification request.</p>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Name Fields Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1">First Name</label>
              <input type="text" name="firstName" value={formData.firstName} onChange={handleChange} required className={inputClasses} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1">Middle Initial</label>
              <input type="text" name="middleInitial" value={formData.middleInitial} onChange={handleChange} maxLength={1} className={`${inputClasses} uppercase`} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1">Last Name</label>
              <input type="text" name="lastName" value={formData.lastName} onChange={handleChange} required className={inputClasses} />
            </div>
          </div>

          {/* Birthday & Commuter Type Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1">Birthday</label>
              <input type="date" name="birthday" value={formData.birthday} onChange={handleChange} required className={`${inputClasses} [color-scheme:dark]`} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1">Commuter Type</label>
              <select name="commuterType" value={formData.commuterType} onChange={handleChange} className={`${inputClasses} [color-scheme:dark]`}>
                <option value="Regular" className="bg-gray-800">Regular</option>
                <option value="Student" className="bg-gray-800">Student</option>
                <option value="Senior Citizen" className="bg-gray-800">Senior Citizen</option>
                <option value="PWD" className="bg-gray-800">PWD</option>
              </select>
            </div>
          </div>

          {/* Account Details Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1">Username</label>
              <input type="text" name="username" value={formData.username} onChange={handleChange} required placeholder="e.g. juan.delacruz123" className={inputClasses} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1">Password</label>
              <input type="password" name="password" value={formData.password} onChange={handleChange} required className={inputClasses} />
            </div>
          </div>

          {/* Contact Details Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1">Email</label>
              <input type="email" name="email" value={formData.email} onChange={handleChange} required className={inputClasses} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1">Phone Number</label>
              <input type="text" name="phoneNumber" value={formData.phoneNumber} onChange={handleChange} required placeholder="0917-123-4567" className={inputClasses} />
            </div>
          </div>

          {/* Upload Valid ID */}
          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1">Upload Valid ID <span className="text-red-400">*</span></label>
            <div className="mt-1 flex justify-center px-4 pt-4 pb-4 border-2 border-white/20 border-dashed rounded-lg transition-colors hover:border-white/30">
              {formData.idImagePreview ? (
                <div className="relative w-full max-w-xs">
                  <img src={formData.idImagePreview} alt="ID Preview" className="h-28 w-full object-cover rounded-md" />
                  <button type="button" onClick={handleRemoveImage} className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full shadow-lg active:bg-red-600">
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <div className="space-y-2 text-center py-2">
                  <Upload className="mx-auto h-10 w-10 text-gray-500" />
                  <div className="flex text-sm text-gray-300">
                    <label htmlFor="reg-id-upload" className="relative cursor-pointer rounded-md font-medium text-blue-400 hover:text-blue-300">
                      <span>Upload file</span>
                      <input id="reg-id-upload" type="file" className="sr-only" accept="image/*" onChange={handleImageChange} />
                    </label>
                  </div>
                  <p className="text-xs text-gray-500">JPG, PNG up to 5MB</p>
                </div>
              )}
            </div>
          </div>

          {/* Buttons */}
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2 pb-1">
            <button type="button" onClick={onClose} className="w-full sm:w-auto px-4 py-2.5 border border-gray-500 rounded-lg text-gray-300 hover:bg-gray-700 text-sm transition-colors">
              Cancel
            </button>
            <button type="submit" className="w-full sm:w-auto px-4 py-2.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm font-medium transition-colors">
              Submit Request
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
}