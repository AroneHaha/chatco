// components/admin/vehicles/edit-personnel-modal.tsx
'use client';

import { useState, useRef, useEffect } from 'react';
import { Modal } from '@/components/admin/ui/modal';
import { UserPlus, MapPin, Upload, Check, User, Save } from 'lucide-react';

interface PersonnelData {
  id: number;
  name: string;
  role: string;
  contact: string;
}

interface EditPersonnelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
  editingData: PersonnelData | null;
}

export function EditPersonnelModal({ isOpen, onClose, onSave, editingData }: EditPersonnelModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState({
    firstName: '',
    middleName: '',
    lastName: '',
    birthday: '',
    contact: '',
    route: 'Malolos - Meycauayan - Calumpit',
    role: 'Driver',
  });

  const [profilePicture, setProfilePicture] = useState<string | null>(null);
  const [useDefaultPicture, setUseDefaultPicture] = useState<boolean>(true);

  // Pre-fill form when editingData changes
  useEffect(() => {
    if (editingData) {
      const nameParts = editingData.name.split(' ');
      setFormData(prev => ({
        ...prev,
        firstName: nameParts[0] || '',
        lastName: nameParts.slice(-1).join(' ') || '',
        middleName: nameParts.length > 2 ? nameParts.slice(1, -1).join(' ') : '',
        contact: editingData.contact,
        role: editingData.role,
      }));
      setUseDefaultPicture(true);
      setProfilePicture(null);
    }
  }, [editingData]);

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
        setUseDefaultPicture(false); 
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setProfilePicture(null);
    setUseDefaultPicture(true); 
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const payload = {
      id: editingData?.id,
      name: `${formData.firstName} ${formData.middleName ? formData.middleName + ' ' : ''}${formData.lastName}`.trim(),
      role: formData.role,
      contact: formData.contact,
      profilePicture: useDefaultPicture ? null : profilePicture,
    };

    onSave(payload);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-blue-500/20 rounded-lg">
          <Save className="text-blue-400" size={24} />
        </div>
        <div>
          <h2 className="text-xl font-bold text-white">Edit {editingData?.role || 'Personnel'}</h2>
          <p className="text-sm text-gray-400">Update details for {editingData?.name}.</p>
        </div>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-5">
        
        {/* Profile Picture Section */}
        <div className="flex items-center gap-5">
          <div className="relative w-20 h-20 rounded-full bg-white/10 border-2 border-dashed border-white/20 flex items-center justify-center overflow-hidden flex-shrink-0">
            {useDefaultPicture ? (
              <User className="text-white/30" size={32} />
            ) : profilePicture ? (
              <img src={profilePicture} alt="Preview" className="w-full h-full object-cover" />
            ) : (
              <User className="text-white/30" size={32} />
            )}
          </div>

          <div className="flex-1 space-y-2">
            <input type="file" ref={fileInputRef} accept="image/*" onChange={handleImageChange} className="hidden" />
            
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white/70 hover:bg-white/10 hover:text-white transition-colors active:scale-[0.98]"
            >
              <Upload size={16} />
              Change Photo
            </button>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer group">
                <div 
                  onClick={() => { setUseDefaultPicture(!useDefaultPicture); if(profilePicture) setProfilePicture(null); }}
                  className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                    useDefaultPicture ? 'bg-emerald-500 border-emerald-500' : 'border-white/30 group-hover:border-white/50'
                  }`}
                >
                  {useDefaultPicture && <Check size={12} className="text-white" />}
                </div>
                <span className="text-xs text-white/50 group-hover:text-white/70 transition-colors">
                  Use default picture
                </span>
              </label>

              {!useDefaultPicture && profilePicture && (
                <button type="button" onClick={handleRemoveImage} className="text-xs text-red-400 hover:text-red-300 transition-colors">
                  Remove
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Name Fields */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">First Name <span className="text-red-400">*</span></label>
            <input type="text" name="firstName" value={formData.firstName} onChange={handleChange} required className="block w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-colors" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Last Name <span className="text-red-400">*</span></label>
            <input type="text" name="lastName" value={formData.lastName} onChange={handleChange} required className="block w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-colors" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">Middle Name</label>
          <input type="text" name="middleName" value={formData.middleName} onChange={handleChange} placeholder="Optional" className="block w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-colors" />
        </div>

        {/* Contact Number */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">Contact Number <span className="text-red-400">*</span></label>
          <input type="tel" name="contact" value={formData.contact} onChange={handleChange} required className="block w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-colors" />
        </div>

        {/* Fixed Data */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5 flex items-center gap-2">
              <User size={14} /> Role
            </label>
            <select name="role" value={formData.role} disabled className="block w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-gray-500 cursor-not-allowed [color-scheme:dark]">
              <option value="Driver" className="bg-gray-800">Driver</option>
              <option value="Conductor" className="bg-gray-800">Conductor</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5 flex items-center gap-2">
              <MapPin size={14} /> Assigned Route
            </label>
            <select name="route" value={formData.route} disabled className="block w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-gray-500 cursor-not-allowed [color-scheme:dark]">
              <option value="Malolos - Meycauayan - Calumpit" className="bg-gray-800">Malolos - Meycauayan - Calumpit</option>
            </select>
            <p className="text-[11px] text-gray-600 mt-1">Currently fixed to the single active e-jeep corridor.</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4 border-t border-white/10">
          <button type="button" onClick={onClose} className="w-full sm:w-auto px-6 py-3 border border-white/20 rounded-lg text-gray-300 hover:bg-white/5 transition-colors active:scale-[0.98]">
            Cancel
          </button>
          <button type="submit" className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-emerald-500 text-white font-medium rounded-lg hover:bg-emerald-600 transition-colors active:scale-[0.98]">
            <Save size={16} />
            Save Changes
          </button>
        </div>
      </form>
    </Modal>
  );
}