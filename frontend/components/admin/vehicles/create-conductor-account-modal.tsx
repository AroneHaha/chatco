// components/admin/vehicles/create-conductor-account-modal.tsx
'use client';

import { useState, useRef } from 'react';
import { Modal } from '@/components/admin/ui/modal';
import { UserPlus, MapPin, Upload, Check, User } from 'lucide-react';

interface CreateConductorAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (accountData: any) => void;
}

export function CreateConductorAccountModal({ isOpen, onClose, onSave }: CreateConductorAccountModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState({
    firstName: '',
    middleName: '',
    lastName: '',
    birthday: '',
    route: 'Meycauayan - Calumpit',
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
      role: 'Conductor',
      accountType: 'Scanner',
      profilePicture: useDefaultPicture ? null : profilePicture, // Send null if default is used
    };

    onSave(payload);
    onClose();
    
    // Reset form
    setFormData({
      firstName: '',
      middleName: '',
      lastName: '',
      birthday: '',
      route: 'Meycauayan - Calumpit',
    });
    setProfilePicture(null);
    setUseDefaultPicture(true);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="flex items-center gap-3 mb-5">
        <div className="p-2 bg-blue-500/20 rounded-lg">
          <UserPlus className="text-blue-400" size={24} />
        </div>
        <div>
          <h2 className="text-xl font-bold text-white">Create Conductor Account</h2>
          <p className="text-sm text-gray-400">Setup an account for the commuter scanning app.</p>
        </div>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-5">
        
        {/* Profile Picture Section */}
        <div className="flex items-center gap-5">
          {/* Image Preview */}
          <div className="relative w-20 h-20 rounded-full bg-white/10 border-2 border-dashed border-white/20 flex items-center justify-center overflow-hidden flex-shrink-0">
            {useDefaultPicture ? (
              <User className="text-white/30" size={32} />
            ) : profilePicture ? (
              <img src={profilePicture} alt="Preview" className="w-full h-full object-cover" />
            ) : (
              <User className="text-white/30" size={32} />
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
              className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white/70 hover:bg-white/10 hover:text-white transition-colors"
            >
              <Upload size={16} />
              Upload Photo
            </button>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer group">
                <div 
                  onClick={() => { setUseDefaultPicture(!useDefaultPicture); if(profilePicture) setProfilePicture(null); }}
                  className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                    useDefaultPicture ? 'bg-blue-500 border-blue-500' : 'border-white/30 group-hover:border-white/50'
                  }`}
                >
                  {useDefaultPicture && <Check size={12} className="text-white" />}
                </div>
                <span className="text-xs text-white/50 group-hover:text-white/70 transition-colors">
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
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="firstName" className="block text-sm font-medium text-gray-300 mb-1">First Name <span className="text-red-400">*</span></label>
            <input
              type="text"
              id="firstName"
              name="firstName"
              value={formData.firstName}
              onChange={handleChange}
              required
              placeholder="Juan"
              className="block w-full px-3 py-2 bg-white/10 border border-white/20 rounded-md text-white placeholder-gray-500 shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label htmlFor="lastName" className="block text-sm font-medium text-gray-300 mb-1">Last Name <span className="text-red-400">*</span></label>
            <input
              type="text"
              id="lastName"
              name="lastName"
              value={formData.lastName}
              onChange={handleChange}
              required
              placeholder="Dela Cruz"
              className="block w-full px-3 py-2 bg-white/10 border border-white/20 rounded-md text-white placeholder-gray-500 shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        <div>
          <label htmlFor="middleName" className="block text-sm font-medium text-gray-300 mb-1">Middle Name</label>
          <input
            type="text"
            id="middleName"
            name="middleName"
            value={formData.middleName}
            onChange={handleChange}
            placeholder="Optional"
            className="block w-full px-3 py-2 bg-white/10 border border-white/20 rounded-md text-white placeholder-gray-500 shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Birthday */}
        <div>
          <label htmlFor="birthday" className="block text-sm font-medium text-gray-300 mb-1">Birthday <span className="text-red-400">*</span></label>
          <input
            type="date"
            id="birthday"
            name="birthday"
            value={formData.birthday}
            onChange={handleChange}
            required
            className="block w-full px-3 py-2 bg-white/10 border border-white/20 rounded-md text-white shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 [color-scheme:dark]"
          />
        </div>

        {/* Route Assignment */}
        <div>
          <label htmlFor="conductor-route" className="block text-sm font-medium text-gray-300 mb-1 flex items-center gap-2">
            <MapPin size={14} /> Assigned Route
          </label>
          <select
            id="conductor-route"
            name="route"
            value={formData.route}
            onChange={handleChange}
            className="block w-full px-3 py-2 bg-white/10 border border-white/20 rounded-md text-white shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 [color-scheme:dark]"
          >
            <option value="Meycauayan - Calumpit" className="bg-gray-800">Meycauayan - Calumpit</option>
            <option value="Malolos - Meycauayan" className="bg-gray-800">Malolos - Meycauayan</option>
            <option value="Malolos - Calumpit" className="bg-gray-800">Malolos - Calumpit (Full Route)</option>
          </select>
        </div>

        <div className="flex justify-end space-x-3 pt-4 border-t border-white/10">
          <button 
            type="button" 
            onClick={onClose} 
            className="px-4 py-2 border border-gray-500 rounded-md text-gray-300 hover:bg-gray-700 transition-colors"
          >
            Cancel
          </button>
          <button 
            type="submit" 
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors flex items-center gap-2"
          >
            <UserPlus size={16} />
            Create Account
          </button>
        </div>
      </form>
    </Modal>
  );
}