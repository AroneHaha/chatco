// components/admin/vehicles/add-personnel-modal.tsx
'use client';

import { useState, useRef } from 'react';
import { Modal } from '@/components/admin/ui/modal';
import { UserAvatar } from '@/components/admin/ui/user-avatar';
import { AdminDatePicker } from '@/components/admin/ui/admin-date-picker';
import { UserPlus, Upload, IdCard, X, Users, Loader2 } from 'lucide-react';
import {
  CONTACT_NUMBER_PATTERN as CONTACT_PATTERN,
  CONTACT_NUMBER_ERROR as CONTACT_ERROR,
  formatContactNumberInput as formatContactNumber,
} from '@/lib/utils/format';

import { InlineError } from '@/components/admin/ui/inline-error';
// Mirrors the backend's LTO format check (AdminController::storeDriver).
const LICENSE_NUMBER_PATTERN = /^[A-Z][0-9]{2}-[0-9]{2}-[0-9]{6}$/;

// Mirrors AdminController::RELATIONSHIP_OPTIONS on the backend.
const RELATIONSHIP_OPTIONS = ['Spouse', 'Parent', 'Sibling', 'Relative', 'Guardian', 'Friend', 'Other'];

function formatLicenseNumber(value: string): string {
  const normalized = value.toUpperCase().replace(/[^A-Z0-9]/g, '');
  const letter = normalized.match(/[A-Z]/)?.[0] ?? '';
  const digits = normalized.replace(/[^0-9]/g, '').slice(0, 10);
  return [letter + digits.slice(0, 2), digits.slice(2, 4), digits.slice(4, 10)]
    .filter(Boolean)
    .join('-');
}

// Capitalizes the first letter of each word (start of string or after a
// space) as the admin types, e.g. "mark arone" -> "Mark Arone".
function formatPersonName(value: string): string {
  return value.replace(/(^|\s)([a-z])/g, (_match, boundary, letter) => boundary + letter.toUpperCase());
}

interface AddPersonnelModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Called after a successful POST — parent refetches the list. */
  onSave: () => void;
}

export function AddPersonnelModal({ isOpen, onClose, onSave }: AddPersonnelModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const licenseFrontInputRef = useRef<HTMLInputElement>(null);
  const licenseBackInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    firstName: '',
    middleName: '',
    lastName: '',
    birthday: '',
    contact: '',
    address: '',
    emergencyContactName: '',
    emergencyContactNumber: '',
    emergencyContactRelationship: '',
    licenseNumber: '',
  });

  const [profilePicture, setProfilePicture] = useState<string | null>(null);
  const [profilePictureFile, setProfilePictureFile] = useState<File | null>(null);
  const [useDefaultPicture, setUseDefaultPicture] = useState<boolean>(true);
  const [licenseFrontFile, setLicenseFrontFile] = useState<File | null>(null);
  const [licenseBackFile, setLicenseBackFile] = useState<File | null>(null);
  const [licenseFrontPreview, setLicenseFrontPreview] = useState<string | null>(null);
  const [licenseBackPreview, setLicenseBackPreview] = useState<string | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'licenseNumber'
        ? formatLicenseNumber(value)
        : name === 'contact' || name === 'emergencyContactNumber'
          ? formatContactNumber(value)
          : name === 'firstName' || name === 'lastName' || name === 'emergencyContactName'
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

  const handleLicenseImageChange = (side: 'front' | 'back', file: File | undefined) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      if (side === 'front') {
        setLicenseFrontFile(file);
        setLicenseFrontPreview(reader.result as string);
      } else {
        setLicenseBackFile(file);
        setLicenseBackPreview(reader.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  const uploadLicenseImages = async (driverId: string) => {
    if (!licenseFrontFile && !licenseBackFile) return;

    const body = new FormData();
    if (licenseFrontFile) body.append('front', licenseFrontFile);
    if (licenseBackFile) body.append('back', licenseBackFile);

    const res = await fetch(`/api/admin/drivers/${driverId}/license-images`, {
      method: 'POST',
      body,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message ?? 'Failed to upload license image(s)');
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

    if (!CONTACT_PATTERN.test(formData.emergencyContactNumber)) {
      setFieldErrors({ emergencyContactNumber: [CONTACT_ERROR] });
      return;
    }

    if (!LICENSE_NUMBER_PATTERN.test(formData.licenseNumber)) {
      setFieldErrors({ licenseNumber: ['Use the Philippine LTO format N01-23-045678 (one letter, four digits, then six digits).'] });
      return;
    }

    setIsSubmitting(true);

    try {
      const requestBody = new FormData();
      requestBody.append('first_name', formData.firstName);
      requestBody.append('last_name', formData.lastName);
      requestBody.append('birthday', formData.birthday);
      requestBody.append('contact', formData.contact);
      requestBody.append('address', formData.address);
      requestBody.append('emergency_contact_name', formData.emergencyContactName);
      requestBody.append('emergency_contact_number', formData.emergencyContactNumber);
      requestBody.append('emergency_contact_relationship', formData.emergencyContactRelationship);
      requestBody.append('license_number', formData.licenseNumber);
      if (formData.middleName.trim()) requestBody.append('middle_name', formData.middleName.trim());
      if (!useDefaultPicture && profilePictureFile) requestBody.append('profile_picture', profilePictureFile);

      const res = await fetch('/api/admin/drivers', {
        method: 'POST',
        body: requestBody,
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
          if (data.errors.address) mapped.address = data.errors.address;
          if (data.errors.emergency_contact_name) mapped.emergencyContactName = data.errors.emergency_contact_name;
          if (data.errors.emergency_contact_number) mapped.emergencyContactNumber = data.errors.emergency_contact_number;
          if (data.errors.emergency_contact_relationship) mapped.emergencyContactRelationship = data.errors.emergency_contact_relationship;
          if (data.errors.license_number) mapped.licenseNumber = data.errors.license_number;
          if (data.errors.profile_picture) mapped.profilePicture = data.errors.profile_picture;
          if (data.errors.profile_picture_url) mapped.profilePicture = data.errors.profile_picture_url;
          setFieldErrors(mapped);
          const firstError = (Object.values(data.errors)[0] as string[] | undefined)?.[0] ?? 'Validation failed.';
          throw new Error(firstError);
        }
        throw new Error(data.message ?? 'Failed to create driver');
      }

      // Driver record is already created at this point. If the license
      // image upload below fails, the driver must not be treated as if
      // nothing happened: re-submitting the whole form would resend the
      // same license_number, which is now taken by the driver we just
      // created, and strand the admin behind a confusing "already taken"
      // error. Instead: refresh the parent list in the background (so the
      // new driver shows up once this modal closes), clear the license
      // fields so the form can't be blindly resubmitted, and surface a
      // message pointing at the Edit form, which supports adding license
      // images afterwards.
      const driverId = data.data?.id;
      if (driverId) {
        try {
          await uploadLicenseImages(String(driverId));
        } catch (uploadErr) {
          onSave();
          setLicenseFrontFile(null);
          setLicenseBackFile(null);
          setLicenseFrontPreview(null);
          setLicenseBackPreview(null);
          const reason = uploadErr instanceof Error ? uploadErr.message : 'Failed to upload license image(s).';
          setError(`Driver created, but license image upload failed: ${reason} Add the image(s) from the driver's Edit form.`);
          return;
        }
      }

      // Success — reset form, trigger parent refetch, close modal.
      setFormData({
        firstName: '',
        middleName: '',
        lastName: '',
        birthday: '',
        contact: '',
        address: '',
        emergencyContactName: '',
        emergencyContactNumber: '',
        emergencyContactRelationship: '',
        licenseNumber: '',
      });
      setProfilePicture(null);
      setProfilePictureFile(null);
      setUseDefaultPicture(true);
      setLicenseFrontFile(null);
      setLicenseBackFile(null);
      setLicenseFrontPreview(null);
      setLicenseBackPreview(null);
      onSave();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create driver');
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputClasses = "block min-h-11 w-full rounded-lg border border-[#2A3A55] bg-[#0E1628] px-3 py-2.5 text-sm text-white placeholder:text-slate-500 transition-colors focus:outline-none focus:ring-2 focus:ring-[#62A0EA]/50 disabled:opacity-50 admin-light:border-[#CBD5E1] admin-light:bg-slate-50 admin-light:text-slate-900 admin-light:placeholder:text-slate-400 admin-light:focus:ring-[#1A5FB4]/30";

  return (
    <Modal adminThemed isOpen={isOpen} onClose={onClose} maxWidth="max-w-3xl" rounded="rounded-2xl">
      <header className="mb-4 flex items-center gap-3 border-b border-[#2A3A55] pb-4 pr-8 admin-light:border-[#E2E8F0]">
        <UserPlus aria-hidden="true" size={28} strokeWidth={1.5} className="shrink-0 text-[#62A0EA] admin-light:text-[#1A5FB4]" />
        <div>
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#99C1F1] admin-light:text-[#1A5FB4]">Fleet Management</p>
          <h2 className="text-xl font-semibold tracking-tight text-white admin-light:text-slate-900">Add New Driver</h2>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <InlineError>{error}</InlineError>
        )}

        {/* Profile Picture Section */}
        <div className="flex flex-wrap items-center gap-3 rounded-xl bg-[#0E1628] p-3 admin-light:bg-slate-50">
          <UserAvatar src={useDefaultPicture ? null : profilePicture} alt="Driver profile preview" className="h-14 w-14" iconClassName="h-6 w-6" sizes="56px" />

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
        <section aria-labelledby="driver-personal-heading">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 id="driver-personal-heading" className="text-sm font-semibold text-white admin-light:text-slate-900">Personal information</h3>
          <p className="text-xs text-slate-400 admin-light:text-slate-500"><span className="text-red-400 admin-light:text-red-600">*</span> Required fields</p>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
          <div>
            <label htmlFor="driver-firstName" className="block text-xs font-medium text-slate-300 admin-light:text-slate-700 mb-1.5">
              First Name <span className="text-red-400 admin-light:text-red-600">*</span>
            </label>
            <input
              type="text"
              id="driver-firstName"
              name="firstName"
              value={formData.firstName}
              onChange={handleChange}
              required
              disabled={isSubmitting}
              placeholder="Juan"
              className={`${inputClasses} ${fieldErrors.firstName ? 'border-red-500/50' : ''}`}
            />
            {fieldErrors.firstName && (
              <p className="text-xs text-red-400 admin-light:text-red-600 mt-1">{fieldErrors.firstName[0]}</p>
            )}
          </div>
          <div>
            <label htmlFor="driver-lastName" className="block text-xs font-medium text-slate-300 admin-light:text-slate-700 mb-1.5">
              Last Name <span className="text-red-400 admin-light:text-red-600">*</span>
            </label>
            <input
              type="text"
              id="driver-lastName"
              name="lastName"
              value={formData.lastName}
              onChange={handleChange}
              required
              disabled={isSubmitting}
              placeholder="Dela Cruz"
              className={`${inputClasses} ${fieldErrors.lastName ? 'border-red-500/50' : ''}`}
            />
            {fieldErrors.lastName && (
              <p className="text-xs text-red-400 admin-light:text-red-600 mt-1">{fieldErrors.lastName[0]}</p>
            )}
          </div>
        <div>
          <label htmlFor="driver-middleName" className="block text-xs font-medium text-slate-300 admin-light:text-slate-700 mb-1.5">Middle Name</label>
          <input
            type="text"
            id="driver-middleName"
            name="middleName"
            value={formData.middleName}
            onChange={handleChange}
            disabled={isSubmitting}
            placeholder="Optional"
            className={`${inputClasses} ${fieldErrors.middleName ? 'border-red-500/50' : ''}`}
          />
          {fieldErrors.middleName && (
            <p className="text-xs text-red-400 admin-light:text-red-600 mt-1">{fieldErrors.middleName[0]}</p>
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
          <label htmlFor="driver-contact" className="block text-xs font-medium text-slate-300 admin-light:text-slate-700 mb-1.5 flex items-center gap-2">
            Contact Number <span className="text-red-400 admin-light:text-red-600">*</span>
          </label>
          <input
            type="tel"
            id="driver-contact"
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
          <label htmlFor="driver-address" className="block text-xs font-medium text-slate-300 admin-light:text-slate-700 mb-1.5 flex items-center gap-2">
            Address <span className="text-red-400 admin-light:text-red-600">*</span>
          </label>
          <input
            type="text"
            id="driver-address"
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

        <section aria-labelledby="driver-emergency-heading" className="border-t border-[#2A3A55] pt-4 admin-light:border-[#E2E8F0]">
          <h3 id="driver-emergency-heading" className="mb-3 flex items-center gap-2 text-sm font-semibold text-white admin-light:text-slate-900">
            <Users size={16} aria-hidden="true" className="text-slate-400 admin-light:text-slate-500" />
            Emergency contact
          </h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
            <div>
              <label htmlFor="driver-emergency-name" className="block text-xs font-medium text-slate-300 admin-light:text-slate-700 mb-1.5">
                Contact Name <span className="text-red-400 admin-light:text-red-600">*</span>
              </label>
              <input
                type="text"
                id="driver-emergency-name"
                name="emergencyContactName"
                value={formData.emergencyContactName}
                onChange={handleChange}
                required
                disabled={isSubmitting}
                placeholder="Ana Dela Cruz"
                className={`${inputClasses} ${fieldErrors.emergencyContactName ? 'border-red-500/50' : ''}`}
              />
              {fieldErrors.emergencyContactName && (
                <p className="text-xs text-red-400 admin-light:text-red-600 mt-1">{fieldErrors.emergencyContactName[0]}</p>
              )}
            </div>
            <div>
              <label htmlFor="driver-emergency-number" className="block text-xs font-medium text-slate-300 admin-light:text-slate-700 mb-1.5">
                Contact Number <span className="text-red-400 admin-light:text-red-600">*</span>
              </label>
              <input
                type="tel"
                id="driver-emergency-number"
                name="emergencyContactNumber"
                value={formData.emergencyContactNumber}
                onChange={handleChange}
                required
                disabled={isSubmitting}
                placeholder="e.g. 09171234567"
                maxLength={11}
                pattern="09[0-9]{9}"
                title="Enter an 11-digit mobile number starting with 09"
                className={`${inputClasses} ${fieldErrors.emergencyContactNumber ? 'border-red-500/50' : ''}`}
              />
              {fieldErrors.emergencyContactNumber && (
                <p className="text-xs text-red-400 admin-light:text-red-600 mt-1">{fieldErrors.emergencyContactNumber[0]}</p>
              )}
            </div>
          <div>
            <label htmlFor="driver-emergency-relationship" className="block text-xs font-medium text-slate-300 admin-light:text-slate-700 mb-1.5">
              Relationship <span className="text-red-400 admin-light:text-red-600">*</span>
            </label>
            <select
              id="driver-emergency-relationship"
              name="emergencyContactRelationship"
              value={formData.emergencyContactRelationship}
              onChange={handleChange}
              required
              disabled={isSubmitting}
              className={`${inputClasses} [color-scheme:dark] admin-light:[color-scheme:light] ${fieldErrors.emergencyContactRelationship ? 'border-red-500/50' : ''}`}
            >
              <option value="" disabled className="bg-gray-800 admin-light:bg-white">Select Relationship</option>
              {RELATIONSHIP_OPTIONS.map(opt => (
                <option key={opt} value={opt} className="bg-gray-800 admin-light:bg-white">{opt}</option>
              ))}
            </select>
            {fieldErrors.emergencyContactRelationship && (
              <p className="text-xs text-red-400 admin-light:text-red-600 mt-1">{fieldErrors.emergencyContactRelationship[0]}</p>
            )}
          </div>
        </div>
        </section>

        <section aria-labelledby="driver-license-heading" className="border-t border-[#2A3A55] pt-4 admin-light:border-[#E2E8F0]">
          <h3 id="driver-license-heading" className="mb-3 flex items-center gap-2 text-sm font-semibold text-white admin-light:text-slate-900">
            <IdCard size={16} aria-hidden="true" className="text-slate-400 admin-light:text-slate-500" />
            Driver&apos;s license
          </h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
            <div>
              <label htmlFor="licenseNumber" className="mb-1.5 block text-xs font-medium text-slate-300 admin-light:text-slate-700">
                License number <span className="text-red-400 admin-light:text-red-600">*</span>
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
                className={inputClasses + (fieldErrors.licenseNumber ? ' border-red-500/50' : '')}
              />
              {fieldErrors.licenseNumber && (
                <p className="mt-1 text-xs text-red-400 admin-light:text-red-600">{fieldErrors.licenseNumber[0]}</p>
              )}
            </div>
            {([
              ['front', 'Front', licenseFrontInputRef, licenseFrontPreview],
              ['back', 'Back', licenseBackInputRef, licenseBackPreview],
            ] as const).map(([side, label, inputRef, preview]) => (
              <div key={side} className="min-w-0">
                <p className="mb-1.5 text-xs font-medium text-slate-300 admin-light:text-slate-700">{label} photo <span className="font-normal text-slate-400 admin-light:text-slate-500">Optional</span></p>
                <input
                  ref={inputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(e) => handleLicenseImageChange(side, e.target.files?.[0])}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  disabled={isSubmitting}
                  className="flex min-h-11 w-full items-center gap-2 rounded-lg border border-dashed border-[#2A3A55] bg-[#0E1628] px-3 py-2 text-xs text-slate-300 transition-colors hover:bg-[#131C2E] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#62A0EA] disabled:opacity-50 admin-light:border-slate-300 admin-light:bg-slate-50 admin-light:text-slate-700 admin-light:hover:bg-white"
                >
                  {preview ? (
                    // Local file preview; it is not a remote image for Next.js optimization.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={preview} alt={label + ' license preview'} className="h-7 w-10 shrink-0 rounded object-contain" />
                  ) : <Upload size={16} aria-hidden="true" className="shrink-0 text-[#99C1F1] admin-light:text-[#1A5FB4]" />}
                  {preview ? 'Change ' + label.toLowerCase() : 'Upload ' + label.toLowerCase()}
                </button>
              </div>
            ))}
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
            {isSubmitting ? 'Saving...' : 'Save Driver'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
