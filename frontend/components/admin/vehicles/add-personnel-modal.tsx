// components/admin/vehicles/add-personnel-modal.tsx
'use client';

import { useState, useRef } from 'react';
import { Modal } from '@/components/admin/ui/modal';
import { UserPlus, Upload, Check, User, Phone, IdCard } from 'lucide-react';

function formatLicenseNumber(value: string): string {
  const normalized = value.toUpperCase().replace(/[^A-Z0-9]/g, '');
  const letter = normalized.match(/[A-Z]/)?.[0] ?? '';
  const digits = normalized.replace(/[^0-9]/g, '').slice(0, 10);
  return [letter + digits.slice(0, 2), digits.slice(2, 4), digits.slice(4, 10)]
    .filter(Boolean)
    .join('-');
}

interface AddPersonnelModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Called after a successful POST — parent refetches the list. */
  onSave: () => void;
}

export function AddPersonnelModal({ isOpen, onClose, onSave }: AddPersonnelModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    firstName: '',
    middleName: '',
    lastName: '',
    birthday: '',
    contact: '',
    licenseNumber: '',
  });

  const [profilePicture, setProfilePicture] = useState<string | null>(null);
  const [useDefaultPicture, setUseDefaultPicture] = useState<boolean>(true);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'licenseNumber' ? formatLicenseNumber(value) : value,
    }));
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setIsSubmitting(true);
    setError(null);
    setFieldErrors({});

    try {
      // Build the request body matching Laravel's storeDriver() validation.
      // profile_picture_url is only sent if the user uploaded a custom image.
      const requestBody: Record<string, unknown> = {
        first_name: formData.firstName,
        last_name: formData.lastName,
        birthday: formData.birthday,
        contact: formData.contact,
        license_number: formData.licenseNumber,
      };

      if (formData.middleName.trim()) {
        requestBody.middle_name = formData.middleName.trim();
      }

      if (!useDefaultPicture && profilePicture) {
        requestBody.profile_picture_url = profilePicture;
      }

      const res = await fetch('/api/admin/drivers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      const data = await res.json();

      if (!res.ok) {
        // Laravel 422: { message, errors: { field: ["msg", ...] } }
        // Map backend field names back to frontend form field names for display.
        if (res.status === 422 && data.errors) {
          // Backend uses snake_case; map to camelCase for our form state.
          const mapped: Record<string, string[]> = {};
          if (data.errors.first_name) mapped.firstName = data.errors.first_name;
          if (data.errors.middle_name) mapped.middleName = data.errors.middle_name;
          if (data.errors.last_name) mapped.lastName = data.errors.last_name;
          if (data.errors.birthday) mapped.birthday = data.errors.birthday;
          if (data.errors.contact) mapped.contact = data.errors.contact;
          if (data.errors.license_number) mapped.licenseNumber = data.errors.license_number;
          if (data.errors.profile_picture_url) mapped.profilePicture = data.errors.profile_picture_url;
          setFieldErrors(mapped);
          const firstError = (Object.values(data.errors)[0] as string[] | undefined)?.[0] ?? 'Validation failed.';
          throw new Error(firstError);
        }
        throw new Error(data.message ?? 'Failed to create driver');
      }

      // Success — reset form, trigger parent refetch, close modal.
      setFormData({
        firstName: '',
        middleName: '',
        lastName: '',
        birthday: '',
        contact: '',
        licenseNumber: '',
      });
      setProfilePicture(null);
      setUseDefaultPicture(true);
      onSave();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create driver');
    } finally {
      setIsSubmitting(false);
    }
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
        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-md">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

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
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-[#0E1628] border border-[#1E2D45] rounded-md text-sm text-slate-300 hover:bg-[#1A2540] hover:text-white transition-colors active:scale-[0.98] disabled:opacity-50"
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
            <label htmlFor="firstName" className="block text-xs font-medium text-slate-300 mb-1.5">
              First Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              id="firstName"
              name="firstName"
              value={formData.firstName}
              onChange={handleChange}
              required
              disabled={isSubmitting}
              placeholder="Juan"
              className={`${inputClasses} ${fieldErrors.firstName ? 'border-red-500/50' : ''}`}
            />
            {fieldErrors.firstName && (
              <p className="text-xs text-red-400 mt-1">{fieldErrors.firstName[0]}</p>
            )}
          </div>
          <div>
            <label htmlFor="lastName" className="block text-xs font-medium text-slate-300 mb-1.5">
              Last Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              id="lastName"
              name="lastName"
              value={formData.lastName}
              onChange={handleChange}
              required
              disabled={isSubmitting}
              placeholder="Dela Cruz"
              className={`${inputClasses} ${fieldErrors.lastName ? 'border-red-500/50' : ''}`}
            />
            {fieldErrors.lastName && (
              <p className="text-xs text-red-400 mt-1">{fieldErrors.lastName[0]}</p>
            )}
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
            disabled={isSubmitting}
            placeholder="Optional"
            className={`${inputClasses} ${fieldErrors.middleName ? 'border-red-500/50' : ''}`}
          />
          {fieldErrors.middleName && (
            <p className="text-xs text-red-400 mt-1">{fieldErrors.middleName[0]}</p>
          )}
        </div>

        {/* License Number */}
        <div>
          <label htmlFor="licenseNumber" className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center gap-2">
            <IdCard size={14} /> License Number <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            id="licenseNumber"
            name="licenseNumber"
            value={formData.licenseNumber}
            onChange={handleChange}
            required
            disabled={isSubmitting}
            placeholder="e.g. N01-23-045678"
            maxLength={13}
            pattern="[A-Z][0-9]{2}-[0-9]{2}-[0-9]{6}"
            title="Use the LTO format N01-23-045678"
            className={`${inputClasses} ${fieldErrors.licenseNumber ? 'border-red-500/50' : ''}`}
          />
          {fieldErrors.licenseNumber && (
            <p className="text-xs text-red-400 mt-1">{fieldErrors.licenseNumber[0]}</p>
          )}
        </div>

        {/* Birthday */}
        <div>
          <label htmlFor="birthday" className="block text-xs font-medium text-slate-300 mb-1.5">
            Birthday <span className="text-red-400">*</span>
          </label>
          <input
            type="date"
            id="birthday"
            name="birthday"
            value={formData.birthday}
            onChange={handleChange}
            required
            disabled={isSubmitting}
            className={`${inputClasses} [color-scheme:dark] ${fieldErrors.birthday ? 'border-red-500/50' : ''}`}
          />
          {fieldErrors.birthday && (
            <p className="text-xs text-red-400 mt-1">{fieldErrors.birthday[0]}</p>
          )}
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
            disabled={isSubmitting}
            placeholder="e.g. 0917 123 4567"
            className={`${inputClasses} ${fieldErrors.contact ? 'border-red-500/50' : ''}`}
          />
          {fieldErrors.contact && (
            <p className="text-xs text-red-400 mt-1">{fieldErrors.contact[0]}</p>
          )}
        </div>

        {/* Footer Buttons */}
        <div className="flex justify-end gap-2 pt-4 border-t border-[#1E2D45]">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-5 py-2.5 border border-[#1E2D45] rounded-md text-slate-300 hover:bg-[#131C2E] transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#62A0EA] text-white font-medium rounded-md hover:bg-[#4A8BD4] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <UserPlus size={16} />
            {isSubmitting ? 'Saving...' : 'Save Driver'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
