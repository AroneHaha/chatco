// components/admin/vehicles/create-conductor-account-modal.tsx
'use client';

import { useState, useRef } from 'react';
import { Modal } from '@/components/admin/ui/modal';
import { UserAvatar } from '@/components/admin/ui/user-avatar';
import { AdminDatePicker } from '@/components/admin/ui/admin-date-picker';
import { UserPlus, Upload, X, Users, Loader2 } from 'lucide-react';
import {
  CONTACT_NUMBER_PATTERN as CONTACT_PATTERN,
  CONTACT_NUMBER_ERROR as CONTACT_ERROR,
  formatContactNumberInput as formatContactNumber,
} from '@/lib/utils/format';

// Mirrors AdminController::RELATIONSHIP_OPTIONS on the backend.
const RELATIONSHIP_OPTIONS = ['Spouse', 'Parent', 'Sibling', 'Relative', 'Guardian', 'Friend', 'Other'];

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
    address: '',
    emergency_contact_name: '',
    emergency_contact_number: '',
    emergency_contact_relationship: '',
  });

  const [profilePicture, setProfilePicture] = useState<string | null>(null);
  const [profilePictureFile, setProfilePictureFile] = useState<File | null>(null);
  const [useDefaultPicture, setUseDefaultPicture] = useState<boolean>(true);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'contact' || name === 'emergency_contact_number'
        ? formatContactNumber(value)
        : name === 'first_name' || name === 'last_name' || name === 'emergency_contact_name'
          ? formatPersonName(value)
          : value,
    }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setProfilePictureFile(file);
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
    setProfilePictureFile(null);
    setUseDefaultPicture(true);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setError(null);
    setFieldErrors({});

    if (!formData.birthday) {
      setFieldErrors({ birthday: ['Birthday is required.'] });
      return;
    }

    if (!CONTACT_PATTERN.test(formData.contact)) {
      setFieldErrors({ contact: [CONTACT_ERROR] });
      return;
    }

    if (!CONTACT_PATTERN.test(formData.emergency_contact_number)) {
      setFieldErrors({ emergency_contact_number: [CONTACT_ERROR] });
      return;
    }

    setIsSubmitting(true);

    try {
      const requestBody = new FormData();
      requestBody.append('first_name', formData.first_name);
      requestBody.append('last_name', formData.last_name);
      requestBody.append('birthday', formData.birthday);
      requestBody.append('contact', formData.contact);
      requestBody.append('address', formData.address);
      requestBody.append('emergency_contact_name', formData.emergency_contact_name);
      requestBody.append('emergency_contact_number', formData.emergency_contact_number);
      requestBody.append('emergency_contact_relationship', formData.emergency_contact_relationship);
      if (formData.middle_name.trim()) requestBody.append('middle_name', formData.middle_name.trim());
      if (!useDefaultPicture && profilePictureFile) requestBody.append('profile_picture', profilePictureFile);

      const res = await fetch('/api/admin/conductors', {
        method: 'POST',
        body: requestBody,
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
          if (data.errors.address) mapped.address = data.errors.address;
          if (data.errors.emergency_contact_name) mapped.emergency_contact_name = data.errors.emergency_contact_name;
          if (data.errors.emergency_contact_number) mapped.emergency_contact_number = data.errors.emergency_contact_number;
          if (data.errors.emergency_contact_relationship) mapped.emergency_contact_relationship = data.errors.emergency_contact_relationship;
          if (data.errors.profile_picture) mapped.profilePicture = data.errors.profile_picture;
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
      setFormData({
        first_name: '',
        middle_name: '',
        last_name: '',
        birthday: '',
        contact: '',
        address: '',
        emergency_contact_name: '',
        emergency_contact_number: '',
        emergency_contact_relationship: '',
      });
      setProfilePicture(null);
      setProfilePictureFile(null);
      setUseDefaultPicture(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create conductor account');
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputClasses = "block min-h-11 w-full rounded-lg border border-[#2A3A55] bg-[#0E1628]/60 px-3 py-2.5 text-sm text-white placeholder:text-slate-500 transition-colors focus:outline-none focus:ring-2 focus:ring-[#62A0EA]/50 disabled:opacity-50 admin-light:border-[#CBD5E1] admin-light:bg-slate-50 admin-light:text-slate-900 admin-light:placeholder:text-slate-400 admin-light:focus:ring-[#1A5FB4]/30";

  return (
    <Modal adminThemed isOpen={isOpen} onClose={onClose} maxWidth="max-w-3xl" rounded="rounded-2xl">
      <header className="mb-4 flex items-center gap-3 border-b border-[#2A3A55] pb-4 pr-8 admin-light:border-[#E2E8F0]">
        <div aria-hidden="true" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#62A0EA]/20 bg-[#62A0EA]/10 text-[#99C1F1] admin-light:border-[#1A5FB4]/15 admin-light:bg-[#1A5FB4]/5 admin-light:text-[#1A5FB4]">
          <UserPlus size={23} strokeWidth={1.5} />
        </div>
        <div>
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#99C1F1] admin-light:text-[#1A5FB4]">Fleet Management</p>
          <h2 className="text-xl font-semibold tracking-tight text-white admin-light:text-slate-900">Create Conductor Account</h2>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div role="alert" className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
            <p className="text-sm text-red-400 admin-light:text-red-600">{error}</p>
          </div>
        )}

        {/* Profile Picture Section */}
        <div className="flex flex-wrap items-center gap-3 rounded-xl bg-[#0E1628]/60 p-3 admin-light:bg-slate-50">
          <UserAvatar src={useDefaultPicture ? null : profilePicture} alt="Conductor profile preview" className="h-14 w-14" iconClassName="h-6 w-6" sizes="56px" />

          <div className="min-w-0 flex-1 space-y-2">
            <p className="text-sm font-medium text-white admin-light:text-slate-900">Profile photo <span className="ml-1 text-xs font-normal text-slate-400 admin-light:text-slate-500">Optional</span></p>
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              onChange={handleImageChange}
              className="hidden"
              disabled={isSubmitting}
            />

            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <label className="flex items-center gap-2 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={useDefaultPicture}
                  disabled={isSubmitting}
                  onChange={() => { setUseDefaultPicture(!useDefaultPicture); if(profilePicture) setProfilePicture(null); }}
                  className="h-4 w-4 accent-[#62A0EA] admin-light:accent-[#1A5FB4]"
                />
                <span className="text-xs text-slate-400 admin-light:text-slate-500">
                  Use default picture
                </span>
              </label>

              {!useDefaultPicture && profilePicture && (
                <button
                  type="button"
                  onClick={handleRemoveImage}
                  className="flex items-center gap-1 text-xs text-red-400 admin-light:text-red-600 hover:text-red-300 admin-light:hover:text-red-700 transition-colors"
                >
                  <X size={12} />
                  Remove
                </button>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isSubmitting}
            className="flex min-h-11 items-center justify-center gap-2 rounded-lg border border-[#2A3A55] px-3 py-2.5 text-xs font-medium text-slate-200 transition-colors hover:bg-[#1A2540] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#62A0EA] disabled:opacity-50 admin-light:border-slate-300 admin-light:text-slate-700 admin-light:hover:bg-white"
          >
            <Upload size={15} aria-hidden="true" />
            Upload photo
          </button>
          {fieldErrors.profilePicture && <p className="w-full text-xs text-red-400 admin-light:text-red-600">{fieldErrors.profilePicture[0]}</p>}
        </div>

        {/* Name Fields */}
        <section aria-labelledby="conductor-personal-heading">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 id="conductor-personal-heading" className="text-sm font-semibold text-white admin-light:text-slate-900">Personal information</h3>
          <p className="text-xs text-slate-400 admin-light:text-slate-500"><span className="text-red-400 admin-light:text-red-600">*</span> Required fields</p>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
          <div>
            <label htmlFor="cond-first_name" className="block text-xs font-medium text-slate-300 admin-light:text-slate-700 mb-1.5">
              First Name <span className="text-red-400 admin-light:text-red-600">*</span>
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
              <p className="text-xs text-red-400 admin-light:text-red-600 mt-1">{fieldErrors.first_name[0]}</p>
            )}
          </div>
          <div>
            <label htmlFor="cond-last_name" className="block text-xs font-medium text-slate-300 admin-light:text-slate-700 mb-1.5">
              Last Name <span className="text-red-400 admin-light:text-red-600">*</span>
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
              <p className="text-xs text-red-400 admin-light:text-red-600 mt-1">{fieldErrors.last_name[0]}</p>
            )}
          </div>
        <div>
          <label htmlFor="cond-middle_name" className="block text-xs font-medium text-slate-300 admin-light:text-slate-700 mb-1.5">Middle Name</label>
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
            <p className="text-xs text-red-400 admin-light:text-red-600 mt-1">{fieldErrors.middle_name[0]}</p>
          )}
        </div>

        {/* Birthday */}
        <div>
          <label className="block text-xs font-medium text-slate-300 admin-light:text-slate-700 mb-1.5 flex items-center gap-2">
            Birthday <span className="text-red-400 admin-light:text-red-600">*</span>
          </label>
          <AdminDatePicker
            popover
            yearNavigation
            value={formData.birthday}
            onChange={(value) => setFormData(prev => ({ ...prev, birthday: value }))}
            ariaLabel="Birthday"
            className="w-full"
            triggerClassName="min-h-11 w-full rounded-lg py-2.5"
          />
          {fieldErrors.birthday && (
            <p className="text-xs text-red-400 admin-light:text-red-600 mt-1">{fieldErrors.birthday[0]}</p>
          )}
        </div>

        {/* Contact Number */}
        <div>
          <label htmlFor="cond-contact" className="block text-xs font-medium text-slate-300 admin-light:text-slate-700 mb-1.5 flex items-center gap-2">
            Contact Number <span className="text-red-400 admin-light:text-red-600">*</span>
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
            <p className="text-xs text-red-400 admin-light:text-red-600 mt-1">{fieldErrors.contact[0]}</p>
          )}
        </div>

        {/* Address */}
        <div>
          <label htmlFor="cond-address" className="block text-xs font-medium text-slate-300 admin-light:text-slate-700 mb-1.5 flex items-center gap-2">
            Address <span className="text-red-400 admin-light:text-red-600">*</span>
          </label>
          <input
            type="text"
            id="cond-address"
            name="address"
            value={formData.address}
            onChange={handleChange}
            required
            disabled={isSubmitting}
            placeholder="123 Rizal St., Malolos, Bulacan"
            className={`${inputClasses} ${fieldErrors.address ? 'border-red-500/50' : ''}`}
          />
          {fieldErrors.address && (
            <p className="text-xs text-red-400 admin-light:text-red-600 mt-1">{fieldErrors.address[0]}</p>
          )}
        </div>
        </div>
        </section>

        <section aria-labelledby="conductor-emergency-heading" className="border-t border-[#2A3A55] pt-4 admin-light:border-[#E2E8F0]">
          <h3 id="conductor-emergency-heading" className="mb-3 flex items-center gap-2 text-sm font-semibold text-white admin-light:text-slate-900">
            <Users size={16} aria-hidden="true" className="text-slate-400 admin-light:text-slate-500" />
            Emergency contact
          </h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
            <div>
              <label htmlFor="cond-emergency-name" className="block text-xs font-medium text-slate-300 admin-light:text-slate-700 mb-1.5">
                Contact Name <span className="text-red-400 admin-light:text-red-600">*</span>
              </label>
              <input
                type="text"
                id="cond-emergency-name"
                name="emergency_contact_name"
                value={formData.emergency_contact_name}
                onChange={handleChange}
                required
                disabled={isSubmitting}
                placeholder="Jose Santos"
                className={`${inputClasses} ${fieldErrors.emergency_contact_name ? 'border-red-500/50' : ''}`}
              />
              {fieldErrors.emergency_contact_name && (
                <p className="text-xs text-red-400 admin-light:text-red-600 mt-1">{fieldErrors.emergency_contact_name[0]}</p>
              )}
            </div>
            <div>
              <label htmlFor="cond-emergency-number" className="block text-xs font-medium text-slate-300 admin-light:text-slate-700 mb-1.5">
                Contact Number <span className="text-red-400 admin-light:text-red-600">*</span>
              </label>
              <input
                type="tel"
                id="cond-emergency-number"
                name="emergency_contact_number"
                value={formData.emergency_contact_number}
                onChange={handleChange}
                required
                disabled={isSubmitting}
                placeholder="e.g. 09171234567"
                maxLength={11}
                pattern="09[0-9]{9}"
                title="Enter an 11-digit mobile number starting with 09"
                className={`${inputClasses} ${fieldErrors.emergency_contact_number ? 'border-red-500/50' : ''}`}
              />
              {fieldErrors.emergency_contact_number && (
                <p className="text-xs text-red-400 admin-light:text-red-600 mt-1">{fieldErrors.emergency_contact_number[0]}</p>
              )}
            </div>
          <div>
            <label htmlFor="cond-emergency-relationship" className="block text-xs font-medium text-slate-300 admin-light:text-slate-700 mb-1.5">
              Relationship <span className="text-red-400 admin-light:text-red-600">*</span>
            </label>
            <select
              id="cond-emergency-relationship"
              name="emergency_contact_relationship"
              value={formData.emergency_contact_relationship}
              onChange={handleChange}
              required
              disabled={isSubmitting}
              className={`${inputClasses} [color-scheme:dark] admin-light:[color-scheme:light] ${fieldErrors.emergency_contact_relationship ? 'border-red-500/50' : ''}`}
            >
              <option value="" disabled className="bg-gray-800 admin-light:bg-white">Select Relationship</option>
              {RELATIONSHIP_OPTIONS.map(opt => (
                <option key={opt} value={opt} className="bg-gray-800 admin-light:bg-white">{opt}</option>
              ))}
            </select>
            {fieldErrors.emergency_contact_relationship && (
              <p className="text-xs text-red-400 admin-light:text-red-600 mt-1">{fieldErrors.emergency_contact_relationship[0]}</p>
            )}
          </div>
        </div>
        </section>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 border-t border-[#2A3A55] pt-4 admin-light:border-[#E2E8F0]">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="min-h-11 rounded-lg border border-[#2A3A55] px-4 py-2.5 text-sm font-medium text-slate-300 transition-colors hover:bg-[#131C2E] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#62A0EA] disabled:opacity-50 admin-light:border-slate-300 admin-light:text-slate-700 admin-light:hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#62A0EA] px-4 py-2.5 text-sm font-semibold text-[#0B1120] transition-colors hover:bg-[#85B6F0] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#62A0EA] disabled:cursor-not-allowed disabled:opacity-50 admin-light:bg-[#1A5FB4] admin-light:text-white admin-light:hover:bg-[#164A8F]"
          >
            {isSubmitting ? <Loader2 size={16} aria-hidden="true" className="animate-spin" /> : <UserPlus size={16} aria-hidden="true" />}
            {isSubmitting ? 'Creating...' : 'Create Account'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
