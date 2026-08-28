// components/admin/vehicles/create-conductor-account-modal.tsx
'use client';

import { useState, useRef } from 'react';
import { Modal } from '@/components/admin/ui/modal';
import { UserPlus, MapPin, Upload, Check, User, Calendar, Phone } from 'lucide-react';

// Mirrors the backend's PH mobile format check (AdminController::storeConductor).
const CONTACT_PATTERN = /^09[0-9]{9}$/;
const CONTACT_ERROR = 'Enter an 11-digit mobile number starting with 09 (e.g. 09171234567).';

function formatContactNumber(value: string): string {
  return value.replace(/[^0-9]/g, '').slice(0, 11);
}

// Capitalizes the first letter of each word (start of string or after a
// space) as the admin types, e.g. "mark arone" -> "Mark Arone".
function formatPersonName(value: string): string {
  return value.replace(/(^|\s)([a-z])/g, (_match, boundary, letter) => boundary + letter.toUpperCase());
}

interface CreatedConductorAccount {
  id: string;
  first_name: string;
  last_name: string;
  generated_username: string;
  generated_password: string;
}

interface CreateConductorAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Called after successful creation with the generated credentials. */
  onCreated: (account: CreatedConductorAccount) => void;
}

export function CreateConductorAccountModal({ isOpen, onClose, onCreated }: CreateConductorAccountModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    first_name: '',
    middle_name: '',
    last_name: '',
    birthday: '',
    contact: '',
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
      [name]: name === 'contact'
        ? formatContactNumber(value)
        : name === 'first_name' || name === 'last_name'
          ? formatPersonName(value)
          : value,
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

    setError(null);
    setFieldErrors({});

    if (!CONTACT_PATTERN.test(formData.contact)) {
      setFieldErrors({ contact: [CONTACT_ERROR] });
      return;
    }

    setIsSubmitting(true);

    try {
      const requestBody: Record<string, unknown> = {
        first_name: formData.first_name,
        last_name: formData.last_name,
        birthday: formData.birthday,
        contact: formData.contact,
      };

      if (formData.middle_name.trim()) {
        requestBody.middle_name = formData.middle_name.trim();
      }

      if (!useDefaultPicture && profilePicture) {
        requestBody.profile_picture_url = profilePicture;
      }

      const res = await fetch('/api/admin/conductors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      const data = await res.json();

      if (!res.ok) {
        // Laravel 422: { message, errors: { field: ["msg", ...] } }
        if (res.status === 422 && data.errors) {
          // Map backend snake_case to frontend field names for display.
          const mapped: Record<string, string[]> = {};
          if (data.errors.first_name) mapped.first_name = data.errors.first_name;
          if (data.errors.middle_name) mapped.middle_name = data.errors.middle_name;
          if (data.errors.last_name) mapped.last_name = data.errors.last_name;
          if (data.errors.birthday) mapped.birthday = data.errors.birthday;
          if (data.errors.contact) mapped.contact = data.errors.contact;
          if (data.errors.profile_picture_url) mapped.profilePicture = data.errors.profile_picture_url;
          setFieldErrors(mapped);
          const firstError = (Object.values(data.errors)[0] as string[] | undefined)?.[0] ?? 'Validation failed.';
          throw new Error(firstError);
        }
        throw new Error(data.message ?? 'Failed to create conductor account');
      }

      // Success — pass the generated credentials to the parent (shows success modal).
      onCreated(data.data);
      // Reset form.
      setFormData({ first_name: '', middle_name: '', last_name: '', birthday: '', contact: '' });
      setProfilePicture(null);
      setUseDefaultPicture(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create conductor account');
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputClasses = "block w-full px-4 py-2.5 bg-[#0E1628] border border-[#1E2D45] rounded-md text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-[#62A0EA] transition-colors";

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="max-w-lg">
      <div className="flex items-center gap-3 mb-5">
        <div className="p-2 bg-[#62A0EA]/20 rounded-lg">
          <UserPlus className="text-[#62A0EA]" size={24} />
        </div>
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-white">Create Conductor Account</h2>
          <p className="text-xs sm:text-sm text-slate-400">Setup an account for the commuter scanning app.</p>
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
          <div className="relative w-20 h-20 rounded-full bg-[#0E1628] border-2 border-dashed border-[#1E2D45] flex items-center justify-center overflow-hidden flex-shrink-0">
            {useDefaultPicture ? (
              <User className="text-slate-600" size={32} />
            ) : profilePicture ? (
              <img src={profilePicture} alt="Preview" className="w-full h-full object-cover" />
            ) : (
              <User className="text-slate-600" size={32} />
            )}
          </div>

          <div className="flex-1 space-y-2">
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              onChange={handleImageChange}
              className="hidden"
              disabled={isSubmitting}
            />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-[#0E1628] border border-[#1E2D45] rounded-md text-sm text-slate-300 hover:bg-[#1A2540] hover:text-white transition-colors disabled:opacity-50"
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
            <label htmlFor="cond-first_name" className="block text-xs font-medium text-slate-300 mb-1.5">
              First Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              id="cond-first_name"
              name="first_name"
              value={formData.first_name}
              onChange={handleChange}
              required
              disabled={isSubmitting}
              placeholder="Juan"
              className={`${inputClasses} ${fieldErrors.first_name ? 'border-red-500/50' : ''}`}
            />
            {fieldErrors.first_name && (
              <p className="text-xs text-red-400 mt-1">{fieldErrors.first_name[0]}</p>
            )}
          </div>
          <div>
            <label htmlFor="cond-last_name" className="block text-xs font-medium text-slate-300 mb-1.5">
              Last Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              id="cond-last_name"
              name="last_name"
              value={formData.last_name}
              onChange={handleChange}
              required
              disabled={isSubmitting}
              placeholder="Dela Cruz"
              className={`${inputClasses} ${fieldErrors.last_name ? 'border-red-500/50' : ''}`}
            />
            {fieldErrors.last_name && (
              <p className="text-xs text-red-400 mt-1">{fieldErrors.last_name[0]}</p>
            )}
          </div>
        </div>

        <div>
          <label htmlFor="cond-middle_name" className="block text-xs font-medium text-slate-300 mb-1.5">Middle Name</label>
          <input
            type="text"
            id="cond-middle_name"
            name="middle_name"
            value={formData.middle_name}
            onChange={handleChange}
            disabled={isSubmitting}
            placeholder="Optional"
            className={`${inputClasses} ${fieldErrors.middle_name ? 'border-red-500/50' : ''}`}
          />
          {fieldErrors.middle_name && (
            <p className="text-xs text-red-400 mt-1">{fieldErrors.middle_name[0]}</p>
          )}
        </div>

        {/* Birthday */}
        <div>
          <label htmlFor="cond-birthday" className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center gap-2">
            <Calendar size={14} /> Birthday <span className="text-red-400">*</span>
          </label>
          <input
            type="date"
            id="cond-birthday"
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
          <label htmlFor="cond-contact" className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center gap-2">
            <Phone size={14} /> Contact Number <span className="text-red-400">*</span>
          </label>
          <input
            type="tel"
            id="cond-contact"
            name="contact"
            value={formData.contact}
            onChange={handleChange}
            required
            disabled={isSubmitting}
            placeholder="e.g. 09171234567"
            maxLength={11}
            pattern="09[0-9]{9}"
            title="Enter an 11-digit mobile number starting with 09"
            className={`${inputClasses} ${fieldErrors.contact ? 'border-red-500/50' : ''}`}
          />
          {fieldErrors.contact && (
            <p className="text-xs text-red-400 mt-1">{fieldErrors.contact[0]}</p>
          )}
        </div>

        {/* Route Assignment — fixed to the single corridor */}
        <div>
          <label htmlFor="cond-route" className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center gap-2">
            <MapPin size={14} /> Assigned Route
          </label>
          <select
            id="cond-route"
            disabled
            className="block w-full px-4 py-2.5 bg-[#0E1628] border border-[#1E2D45] rounded-md text-slate-500 cursor-not-allowed text-sm [color-scheme:dark]"
          >
            <option className="bg-gray-800">Malolos - Meycauayan - Calumpit</option>
          </select>
          <p className="text-xs text-slate-600 mt-1">Fixed to the single active e-jeep corridor.</p>
        </div>

        {/* Action Buttons */}
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
            {isSubmitting ? 'Creating...' : 'Create Account'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
