// components/admin/vehicles/add-personnel-modal.tsx
'use client';

import { useState, useRef } from 'react';
import { Modal } from '@/components/admin/ui/modal';
import { UserPlus, MapPin, Upload, Check, User, Phone } from 'lucide-react';

interface AddPersonnelModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AddPersonnelModal({ isOpen, onClose }: AddPersonnelModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState({
    firstName: '',
    middleName: '',
    lastName: '',
    birthday: '',
    contact: '',
    route: 'Malolos - Meycauayan - Calumpit', // Fixed Route
  });

  const [profilePicture, setProfilePicture] = useState<string | null>(null);
  const [useDefaultPicture, setUseDefaultPicture] = useState<boolean>(true); // Default is checked

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfilePicture(reader.result as string);
        setUseDefaultPicture(false); // Uncheck default if they upload a custom one
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setProfilePicture(null);
    setUseDefaultPicture(true); // Revert to default when removed
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const payload = {
      ...formData,
      role: 'Driver',
      profilePicture: useDefaultPicture ? null : profilePicture, // Send null if default is used
    };

    console.log('New Driver Data:', payload);
    alert('Driver added! (Check console for data)');
    onClose();
    
    // Reset form
    setFormData({
      firstName: '',
      middleName: '',
      lastName: '',
      birthday: '',
      contact: '',
      route: 'Malolos - Meycauayan - Calumpit',
    });
    setProfilePicture(null);
    setUseDefaultPicture(true);
  };

  const inputClasses = "block w-full px-4 py-2.5 bg-[#0E1628] border border-[#1E2D45] rounded-md text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-[#62A0EA] transition-colors";

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="max-w-lg">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <div className="p-2 bg-[#62A0EA]/20 rounded-lg flex-shrink-0">
          <UserPlus className="text-[#62A0EA]" size={24} />
        </div>
        <div className="pr-8">
          <h2 className="text-lg sm:text-xl font-bold text-white">Add New Driver</h2>
          <p className="text-xs sm:text-sm text-slate-400">Register a driver to the fleet management system.</p>
        </div>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-5">
        
        {/* Profile Picture Section */}
        <div className="flex items-center gap-5">
          {/* Image Preview */}
          <div className="relative w-20 h-20 rounded-full bg-[#0E1628] border-2 border-dashed border-[#1E2D45] flex items-center justify-center overflow-hidden flex-shrink-0">
            {useDefaultPicture ? (
              <User className="text-slate-600" size={32} />
            ) : profilePicture ? (
              <img src={profilePicture} alt="Preview" className="w-full h-full object-cover" />
            ) : (
              <User className="text-slate-600" size={32} />
            )}
          </div>

          {/* Upload Controls */}
          <div className="flex-1 space-y-2">
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              onChange={handleImageChange}
              className="hidden"
            />
            
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-[#0E1628] border border-[#1E2D45] rounded-md text-sm text-slate-300 hover:bg-[#1A2540] hover:text-white transition-colors active:scale-[0.98]"
            >
              <Upload size={16} />
              Upload Photo
            </button>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer group">
                <div 
                  onClick={() => { setUseDefaultPicture(!useDefaultPicture); if(profilePicture) setProfilePicture(null); }}
                  className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                    useDefaultPicture ? 'bg-[#62A0EA] border-[#62A0EA]' : 'border-[#1E2D45] group-hover:border-[#2A3A55]'
                  }`}
                >
                  {useDefaultPicture && <Check size={12} className="text-white" />}
                </div>
                <span className="text-xs text-slate-500 group-hover:text-slate-300 transition-colors">
                  Use default picture
                </span>
              </label>

              {!useDefaultPicture && profilePicture && (
                <button
                  type="button"
                  onClick={handleRemoveImage}
                  className="text-xs text-red-400 hover:text-red-300 transition-colors"
                >
                  Remove
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Name Fields */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="firstName" className="block text-xs font-medium text-slate-300 mb-1.5">First Name <span className="text-red-400">*</span></label>
            <input
              type="text"
              id="firstName"
              name="firstName"
              value={formData.firstName}
              onChange={handleChange}
              required
              placeholder="Juan"
              className={inputClasses}
            />
          </div>
          <div>
            <label htmlFor="lastName" className="block text-xs font-medium text-slate-300 mb-1.5">Last Name <span className="text-red-400">*</span></label>
            <input
              type="text"
              id="lastName"
              name="lastName"
              value={formData.lastName}
              onChange={handleChange}
              required
              placeholder="Dela Cruz"
              className={inputClasses}
            />
          </div>
        </div>

        <div>
          <label htmlFor="middleName" className="block text-xs font-medium text-slate-300 mb-1.5">Middle Name</label>
          <input
            type="text"
            id="middleName"
            name="middleName"
            value={formData.middleName}
            onChange={handleChange}
            placeholder="Optional"
            className={inputClasses}
          />
        </div>

        {/* Birthday */}
        <div>
          <label htmlFor="birthday" className="block text-xs font-medium text-slate-300 mb-1.5">Birthday <span className="text-red-400">*</span></label>
          <input
            type="date"
            id="birthday"
            name="birthday"
            value={formData.birthday}
            onChange={handleChange}
            required
            className={`${inputClasses} [color-scheme:dark]`}
          />
        </div>

        {/* Contact Number */}
        <div>
          <label htmlFor="contact" className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center gap-2">
            <Phone size={14} /> Contact Number <span className="text-red-400">*</span>
          </label>
          <input
            type="tel"
            id="contact"
            name="contact"
            value={formData.contact}
            onChange={handleChange}
            required
            placeholder="e.g. 0917 123 4567"
            className={inputClasses}
          />
        </div>

        {/* Route Assignment */}
        <div>
          <label htmlFor="driver-route" className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center gap-2">
            <MapPin size={14} /> Assigned Route
          </label>
          <select
            id="driver-route"
            name="route"
            value={formData.route}
            disabled
            className="block w-full px-4 py-2.5 bg-[#0E1628] border border-[#1E2D45] rounded-md text-slate-500 cursor-not-allowed text-sm [color-scheme:dark]"
          >
            <option value="Malolos - Meycauayan - Calumpit" className="bg-gray-800">Malolos - Meycauayan - Calumpit</option>
          </select>
          <p className="text-xs text-slate-600 mt-1">Currently fixed to the single active e-jeep corridor.</p>
        </div>

        {/* Footer Buttons */}
        <div className="flex justify-end gap-2 pt-4 border-t border-[#1E2D45]">
          <button 
            type="button" 
            onClick={onClose} 
            className="px-5 py-2.5 border border-[#1E2D45] rounded-md text-slate-300 hover:bg-[#131C2E] transition-colors"
          >
            Cancel
          </button>
          <button 
            type="submit" 
            className="flex items-center gap-2 px-5 py-2.5 bg-[#62A0EA] text-white font-medium rounded-md hover:bg-[#4A8BD4] transition-colors"
          >
            <UserPlus size={16} />
            Save Driver
          </button>
        </div>
      </form>
    </Modal>
  );
}