// components/admin/vehicles/edit-personnel-modal.tsx
'use client';

import { useState, useRef, useEffect } from 'react';
import { Modal } from '@/components/admin/ui/modal';
import { Upload, User, Save, IdCard, X, Users, Loader2 } from 'lucide-react';
import { AdminDatePicker } from '@/components/admin/ui/admin-date-picker';
import type { Personnel } from '@/app/(admin)/vehicles/data/vehicles-data';
import {
  CONTACT_NUMBER_PATTERN as CONTACT_PATTERN,
  CONTACT_NUMBER_ERROR as CONTACT_ERROR,
  formatContactNumberInput as formatContactNumber,
} from '@/lib/utils/format';

// Mirrors the backend's LTO format check (AdminController::updateDriver).
const LICENSE_NUMBER_PATTERN = /^[A-Z][0-9]{2}-[0-9]{2}-[0-9]{6}$/;
const RELATIONSHIP_OPTIONS = ['Spouse', 'Parent', 'Sibling', 'Relative', 'Guardian', 'Friend', 'Other'];

function formatLicenseNumber(value: string): string {
  const normalized = value.toUpperCase().replace(/[^A-Z0-9]/g, '');
  const letter = normalized.match(/[A-Z]/)?.[0] ?? '';
  const digits = normalized.replace(/[^0-9]/g, '').slice(0, 10);
  return [letter + digits.slice(0, 2), digits.slice(2, 4), digits.slice(4, 10)]
    .filter(Boolean)
    .join('-');
}

interface EditPersonnelModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Called after a successful PUT — parent refetches the list. */
  onSaved: () => void;
  editingData: Personnel | null;
}

/**
 * Role-aware edit modal for the Fleet → Personnel tab.
 *
 * Drivers:
 *   - Fetches the raw driver record from GET /api/admin/drivers/{id}
 *   - Fields: first_name, middle_name, last_name, birthday, contact, license_number, profile_picture_url
 *   - PUTs to /api/admin/drivers/{id}
 *
 * Conductors (from /admin/conductors):
 *   - Fetches the raw conductor record from GET /api/admin/conductors/{id} (show endpoint)
 *   - Fields: first_name, middle_name, last_name, birthday, contact, profile_picture_url
 *   - NO license_number field (conductors don't drive)
 *   - PUTs to /api/admin/conductors/{id}
 *
 * The generated_username + generated_password are NOT editable here
 * (regenerate-credentials is a separate flow).
 */
export function EditPersonnelModal({ isOpen, onClose, onSaved, editingData }: EditPersonnelModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const licenseFrontInputRef = useRef<HTMLInputElement>(null);
  const licenseBackInputRef = useRef<HTMLInputElement>(null);

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
    license_number: '',
  });

  const [profilePicture, setProfilePicture] = useState<string | null>(null);
  const [profilePictureFile, setProfilePictureFile] = useState<File | null>(null);
  const [useDefaultPicture, setUseDefaultPicture] = useState<boolean>(true);
  const [existingPictureUrl, setExistingPictureUrl] = useState<string | null>(null);
  const [licenseFrontFile, setLicenseFrontFile] = useState<File | null>(null);
  const [licenseBackFile, setLicenseBackFile] = useState<File | null>(null);
  const [licenseFrontPreview, setLicenseFrontPreview] = useState<string | null>(null);
  const [licenseBackPreview, setLicenseBackPreview] = useState<string | null>(null);
  const [removeLicenseFront, setRemoveLicenseFront] = useState(false);
  const [removeLicenseBack, setRemoveLicenseBack] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingMeta, setIsLoadingMeta] = useState(false);
  const [loadedRecordKey, setLoadedRecordKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  const isConductor = editingData?.role === 'Conductor';
  const roleLabel = isConductor ? 'Conductor' : 'Driver';
  const recordKey = editingData ? `${editingData.role}:${editingData.id}` : null;
  const isRecordReady = recordKey !== null && loadedRecordKey === recordKey;

  // When modal opens, fetch the raw record from the API to get all fields
  // (birthday, middle_name, contact, profile_picture_url, and for drivers:
  // license_number) that aren't in the table row's Personnel object.
  //
  // Drivers and conductors both use single-record endpoints so the modal
  // never loads the full personnel dataset.
  useEffect(() => {
    if (!isOpen || !editingData) return;

    setIsLoadingMeta(true);
    setLoadedRecordKey(null);
    setError(null);
    setFieldErrors({});
    const controller = new AbortController();

    const fetchData = async () => {
      try {
        let raw: Record<string, unknown> | null = null;

        const detailEndpoint = isConductor
          ? `/api/admin/conductors/${editingData.id}`
          : `/api/admin/drivers/${editingData.id}`;

        const res = await fetch(detailEndpoint, {
          headers: { Accept: 'application/json' },
          signal: controller.signal,
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body?.message ?? `Failed to load ${roleLabel.toLowerCase()} (HTTP ${res.status}).`);
        }
        const json = await res.json();
        if (controller.signal.aborted) return;
        raw = json.data ?? null;

        if (raw) {
          setFormData({
            first_name: String(raw.first_name ?? ''),
            middle_name: String(raw.middle_name ?? ''),
            last_name: String(raw.last_name ?? ''),
            birthday: raw.birthday ? String(raw.birthday).split('T')[0] : '',
            contact: String(raw.contact ?? ''),
            address: String(raw.address ?? ''),
            emergency_contact_name: String(raw.emergency_contact_name ?? ''),
            emergency_contact_number: String(raw.emergency_contact_number ?? ''),
            emergency_contact_relationship: String(raw.emergency_contact_relationship ?? ''),
            // Conductors don't have a license_number — leave blank for them.
            license_number: String(raw.license_number ?? ''),
          });
          setExistingPictureUrl((raw.profile_picture_url as string | null) ?? null);
          setUseDefaultPicture(!raw.profile_picture_url);
          setProfilePicture(null);
          setProfilePictureFile(null);
          setLicenseFrontFile(null);
          setLicenseBackFile(null);
          setLicenseFrontPreview(raw.license_front_image_url
            ? `/api/admin/drivers/${editingData.id}/license-images/front`
            : null);
          setLicenseBackPreview(raw.license_back_image_url
            ? `/api/admin/drivers/${editingData.id}/license-images/back`
            : null);
          setRemoveLicenseFront(false);
          setRemoveLicenseBack(false);
          setLoadedRecordKey(recordKey);
        } else {
          setError(`Could not find this ${roleLabel.toLowerCase()} in the database. Please refresh the page and try again.`);
        }
      } catch (err) {
        if (controller.signal.aborted) return;
        setError(err instanceof Error ? err.message : `Failed to load ${roleLabel.toLowerCase()} data. Please try again.`);
      } finally {
        if (!controller.signal.aborted) setIsLoadingMeta(false);
      }
    };

    void fetchData();
    return () => controller.abort();
  }, [isOpen, editingData, isConductor, roleLabel, recordKey]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'license_number' ? formatLicenseNumber(value) : name === 'contact' || name === 'emergency_contact_number' ? formatContactNumber(value) : value,
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
    setExistingPictureUrl(null);
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
        setRemoveLicenseFront(false);
      } else {
        setLicenseBackFile(file);
        setLicenseBackPreview(reader.result as string);
        setRemoveLicenseBack(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const removeLicenseImage = (side: 'front' | 'back') => {
    if (side === 'front') {
      setLicenseFrontFile(null);
      setLicenseFrontPreview(null);
      setRemoveLicenseFront(true);
      if (licenseFrontInputRef.current) licenseFrontInputRef.current.value = '';
    } else {
      setLicenseBackFile(null);
      setLicenseBackPreview(null);
      setRemoveLicenseBack(true);
      if (licenseBackInputRef.current) licenseBackInputRef.current.value = '';
    }
  };

  const syncLicenseImages = async (driverId: string) => {
    if (licenseFrontFile || licenseBackFile) {
      const body = new FormData();
      if (licenseFrontFile) body.append('front', licenseFrontFile);
      if (licenseBackFile) body.append('back', licenseBackFile);
      const uploadRes = await fetch(`/api/admin/drivers/${driverId}/license-images`, {
        method: 'POST',
        body,
      });
      const uploadData = await uploadRes.json();
      if (!uploadRes.ok) throw new Error(uploadData.message ?? 'Failed to upload license image(s)');
    }

    for (const [side, shouldRemove] of [['front', removeLicenseFront], ['back', removeLicenseBack]] as const) {
      if (!shouldRemove) continue;
      const removeRes = await fetch(`/api/admin/drivers/${driverId}/license-images/${side}`, { method: 'DELETE' });
      const removeData = await removeRes.json();
      if (!removeRes.ok) throw new Error(removeData.message ?? `Failed to remove license ${side} image`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!editingData || !isRecordReady || isLoadingMeta || isSubmitting) return;

    if (!editingData.id || editingData.id === 'undefined') {
      setError(`${roleLabel} ID is missing. Close this modal and try again.`);
      return;
    }

    setError(null);
    setFieldErrors({});

    if (!formData.birthday) {
      setFieldErrors({ birthday: ['Birthday is required.'] });
      return;
    }

    if (!isConductor && !CONTACT_PATTERN.test(formData.emergency_contact_number)) {
      setFieldErrors({ emergency_contact_number: [CONTACT_ERROR] });
      return;
    }

    if (!CONTACT_PATTERN.test(formData.contact)) {
      setFieldErrors({ contact: [CONTACT_ERROR] });
      return;
    }

    if (!isConductor && !LICENSE_NUMBER_PATTERN.test(formData.license_number)) {
      setFieldErrors({ license_number: ['Use the Philippine LTO format N01-23-045678 (one letter, four digits, then six digits).'] });
      return;
    }

    setIsSubmitting(true);

    try {
      const requestBody = new FormData();
      requestBody.append('first_name', formData.first_name);
      requestBody.append('last_name', formData.last_name);
      requestBody.append('birthday', formData.birthday);
      requestBody.append('contact', formData.contact);
      if (!isConductor) {
        requestBody.append('address', formData.address);
        requestBody.append('emergency_contact_name', formData.emergency_contact_name);
        requestBody.append('emergency_contact_number', formData.emergency_contact_number);
        requestBody.append('emergency_contact_relationship', formData.emergency_contact_relationship);
      }
      if (formData.middle_name.trim()) requestBody.append('middle_name', formData.middle_name.trim());
      if (!isConductor) requestBody.append('license_number', formData.license_number);
      if (!useDefaultPicture && profilePictureFile) {
        requestBody.append('profile_picture', profilePictureFile);
      } else if (useDefaultPicture) {
        // An empty nullable field tells Laravel to clear the existing image.
        requestBody.append('profile_picture_url', '');
      }

      const endpoint = isConductor
        ? `/api/admin/conductors/${editingData.id}`
        : `/api/admin/drivers/${editingData.id}`;

      const res = await fetch(endpoint, {
        method: 'PUT',
        body: requestBody,
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 422 && data.errors) {
          // Map backend snake_case to frontend field names for display.
          const mapped: Record<string, string[]> = {};
          for (const field of ['first_name', 'middle_name', 'last_name', 'birthday', 'contact', 'license_number', 'address', 'emergency_contact_name', 'emergency_contact_number', 'emergency_contact_relationship']) {
            if (data.errors[field]) mapped[field] = data.errors[field];
          }
          if (data.errors.profile_picture) mapped.profilePicture = data.errors.profile_picture;
          if (data.errors.profile_picture_url) mapped.profilePicture = data.errors.profile_picture_url;
          setFieldErrors(mapped);
          const firstError = (Object.values(data.errors)[0] as string[] | undefined)?.[0] ?? 'Validation failed.';
          throw new Error(firstError);
        }
        throw new Error(data.message ?? `Failed to update ${roleLabel.toLowerCase()}`);
      }

      if (!isConductor) await syncLicenseImages(editingData.id);

      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to update ${roleLabel.toLowerCase()}`);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!editingData) return null;

  const inputClasses = "block min-h-11 w-full rounded-lg border border-[#2A3A55] bg-[#0E1628]/60 px-3 py-2.5 text-sm text-white placeholder:text-slate-500 transition-colors focus:outline-none focus:ring-2 focus:ring-[#62A0EA]/50 disabled:opacity-50 admin-light:border-[#CBD5E1] admin-light:bg-slate-50 admin-light:text-slate-900 admin-light:placeholder:text-slate-400 admin-light:focus:ring-[#1A5FB4]/30";

  const previewSrc = profilePicture || existingPictureUrl;

  return (
    <Modal adminThemed isOpen={isOpen} onClose={onClose} maxWidth="max-w-3xl" rounded="rounded-2xl">
      <header className="mb-4 flex items-center gap-3 border-b border-[#2A3A55] pb-4 pr-8 admin-light:border-[#E2E8F0]">
        <div aria-hidden="true" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#62A0EA]/20 bg-[#62A0EA]/10 text-[#99C1F1] admin-light:border-[#1A5FB4]/15 admin-light:bg-[#1A5FB4]/5 admin-light:text-[#1A5FB4]">
          <Save size={23} strokeWidth={1.5} />
        </div>
        <div>
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#99C1F1] admin-light:text-[#1A5FB4]">Fleet Management</p>
          <h2 className="text-xl font-semibold tracking-tight text-white admin-light:text-slate-900">Edit {roleLabel}</h2>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div role="alert" className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
            <p className="text-sm text-red-400 admin-light:text-red-600">{error}</p>
          </div>
        )}

        {isLoadingMeta || (!isRecordReady && !error) ? (
          <div role="status" className="flex min-h-64 items-center justify-center gap-3 text-sm text-slate-400 admin-light:text-slate-500">
            <Loader2 size={20} aria-hidden="true" className="animate-spin" />
            Loading {roleLabel.toLowerCase()} details?
          </div>
        ) : isRecordReady ? (
        <fieldset disabled={isSubmitting} className="min-w-0 space-y-4 border-0 p-0">
        {/* Profile Picture Section */}
        <div className="flex flex-wrap items-center gap-3 rounded-xl bg-[#0E1628]/60 p-3 admin-light:bg-slate-50">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-[#2A3A55] bg-[#1A2540] admin-light:border-[#E2E8F0] admin-light:bg-white">
            {useDefaultPicture ? (
              <User className="text-slate-600 admin-light:text-slate-400" size={32} />
            ) : previewSrc ? (
              // Local file preview; it is not a remote image for Next.js optimization.
              // eslint-disable-next-line @next/next/no-img-element
              <img src={previewSrc} alt={roleLabel + " profile preview"} className="w-full h-full object-cover" />
            ) : (
              <User className="text-slate-600 admin-light:text-slate-400" size={32} />
            )}
          </div>

          <div className="min-w-0 flex-1 space-y-2">
            <p className="text-sm font-medium text-white admin-light:text-slate-900">Profile photo <span className="ml-1 text-xs font-normal text-slate-400 admin-light:text-slate-500">Optional</span></p>
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              onChange={handleImageChange}
              className="hidden"
              disabled={isSubmitting || isLoadingMeta || !isRecordReady}
            />

            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <label className="flex items-center gap-2 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={useDefaultPicture}
                  disabled={isSubmitting || isLoadingMeta || !isRecordReady}
                  onChange={() => { setUseDefaultPicture(!useDefaultPicture); if(profilePicture) setProfilePicture(null); if(existingPictureUrl) setExistingPictureUrl(null); }}
                  className="h-4 w-4 accent-[#62A0EA] admin-light:accent-[#1A5FB4]"
                />
                <span className="text-xs text-slate-400 admin-light:text-slate-500">
                  Use default picture
                </span>
              </label>

              {!useDefaultPicture && previewSrc && (
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
            disabled={isSubmitting || isLoadingMeta || !isRecordReady}
            className="flex min-h-11 items-center justify-center gap-2 rounded-lg border border-[#2A3A55] px-3 py-2.5 text-xs font-medium text-slate-200 transition-colors hover:bg-[#1A2540] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#62A0EA] disabled:opacity-50 admin-light:border-slate-300 admin-light:text-slate-700 admin-light:hover:bg-white"
          >
            <Upload size={15} aria-hidden="true" />
            Change photo
          </button>
          {fieldErrors.profilePicture && <p className="w-full text-xs text-red-400 admin-light:text-red-600">{fieldErrors.profilePicture[0]}</p>}
        </div>

        {/* Name Fields */}
        <section aria-labelledby="edit-personnel-personal-heading">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 id="edit-personnel-personal-heading" className="text-sm font-semibold text-white admin-light:text-slate-900">Personal information</h3>
          <p className="text-xs text-slate-400 admin-light:text-slate-500"><span className="text-red-400 admin-light:text-red-600">*</span> Required fields</p>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
          <div>
            <label htmlFor="edit-personnel-first_name" className="block text-xs font-medium text-slate-300 admin-light:text-slate-700 mb-1.5">
              First Name <span className="text-red-400 admin-light:text-red-600">*</span>
            </label>
            <input
              type="text"
              id="edit-personnel-first_name"
              name="first_name"
              value={formData.first_name}
              onChange={handleChange}
              required
              disabled={isSubmitting || isLoadingMeta || !isRecordReady}
              placeholder="Juan"
              className={`${inputClasses} ${fieldErrors.first_name ? 'border-red-500/50' : ''}`}
            />
            {fieldErrors.first_name && (
              <p className="text-xs text-red-400 admin-light:text-red-600 mt-1">{fieldErrors.first_name[0]}</p>
            )}
          </div>
          <div>
            <label htmlFor="edit-personnel-last_name" className="block text-xs font-medium text-slate-300 admin-light:text-slate-700 mb-1.5">
              Last Name <span className="text-red-400 admin-light:text-red-600">*</span>
            </label>
            <input
              type="text"
              id="edit-personnel-last_name"
              name="last_name"
              value={formData.last_name}
              onChange={handleChange}
              required
              disabled={isSubmitting || isLoadingMeta || !isRecordReady}
              placeholder="Dela Cruz"
              className={`${inputClasses} ${fieldErrors.last_name ? 'border-red-500/50' : ''}`}
            />
            {fieldErrors.last_name && (
              <p className="text-xs text-red-400 admin-light:text-red-600 mt-1">{fieldErrors.last_name[0]}</p>
            )}
          </div>
        <div>
          <label htmlFor="edit-personnel-middle_name" className="block text-xs font-medium text-slate-300 admin-light:text-slate-700 mb-1.5">Middle Name</label>
          <input
            type="text"
            id="edit-personnel-middle_name"
            name="middle_name"
            value={formData.middle_name}
            onChange={handleChange}
            disabled={isSubmitting || isLoadingMeta || !isRecordReady}
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
          <label htmlFor="edit-personnel-contact" className="block text-xs font-medium text-slate-300 admin-light:text-slate-700 mb-1.5 flex items-center gap-2">
            Contact Number <span className="text-red-400 admin-light:text-red-600">*</span>
          </label>
          <input
            type="tel"
            id="edit-personnel-contact"
            name="contact"
            value={formData.contact}
            onChange={handleChange}
            required
            disabled={isSubmitting || isLoadingMeta || !isRecordReady}
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
        {!isConductor && (
        <div>
          <label htmlFor="edit-personnel-address" className="block text-xs font-medium text-slate-300 admin-light:text-slate-700 mb-1.5 flex items-center gap-2">
            Address <span className="text-red-400 admin-light:text-red-600">*</span>
          </label>
          <input
            type="text"
            id="edit-personnel-address"
            name="address"
            value={formData.address}
            onChange={handleChange}
            required
            disabled={isSubmitting || isLoadingMeta || !isRecordReady}
            placeholder="123 Rizal St., Malolos, Bulacan"
            className={`${inputClasses} ${fieldErrors.address ? 'border-red-500/50' : ''}`}
          />
          {fieldErrors.address && (
            <p className="text-xs text-red-400 admin-light:text-red-600 mt-1">{fieldErrors.address[0]}</p>
          )}
        </div>
        )}
        </div>
        </section>

        {!isConductor && (
        <section aria-labelledby="edit-personnel-emergency-heading" className="border-t border-[#2A3A55] pt-4 admin-light:border-[#E2E8F0]">
          <h3 id="edit-personnel-emergency-heading" className="mb-3 flex items-center gap-2 text-sm font-semibold text-white admin-light:text-slate-900">
            <Users size={16} aria-hidden="true" className="text-slate-400 admin-light:text-slate-500" />
            Emergency contact
          </h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
            <div>
              <label htmlFor="edit-personnel-emergency-name" className="block text-xs font-medium text-slate-300 admin-light:text-slate-700 mb-1.5">
                Contact Name <span className="text-red-400 admin-light:text-red-600">*</span>
              </label>
              <input
                type="text"
                id="edit-personnel-emergency-name"
                name="emergency_contact_name"
                value={formData.emergency_contact_name}
                onChange={handleChange}
                required
                disabled={isSubmitting || isLoadingMeta || !isRecordReady}
                placeholder="Ana Dela Cruz"
                className={`${inputClasses} ${fieldErrors.emergency_contact_name ? 'border-red-500/50' : ''}`}
              />
              {fieldErrors.emergency_contact_name && (
                <p className="text-xs text-red-400 admin-light:text-red-600 mt-1">{fieldErrors.emergency_contact_name[0]}</p>
              )}
            </div>
            <div>
              <label htmlFor="edit-personnel-emergency-number" className="block text-xs font-medium text-slate-300 admin-light:text-slate-700 mb-1.5">
                Contact Number <span className="text-red-400 admin-light:text-red-600">*</span>
              </label>
              <input
                type="tel"
                id="edit-personnel-emergency-number"
                name="emergency_contact_number"
                value={formData.emergency_contact_number}
                onChange={handleChange}
                required
                disabled={isSubmitting || isLoadingMeta || !isRecordReady}
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
            <label htmlFor="edit-personnel-emergency-relationship" className="block text-xs font-medium text-slate-300 admin-light:text-slate-700 mb-1.5">
              Relationship <span className="text-red-400 admin-light:text-red-600">*</span>
            </label>
            <select
              id="edit-personnel-emergency-relationship"
              name="emergency_contact_relationship"
              value={formData.emergency_contact_relationship}
              onChange={handleChange}
              required
              disabled={isSubmitting || isLoadingMeta || !isRecordReady}
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
        )}

        {!isConductor && (
        <section aria-labelledby="edit-personnel-license-heading" className="border-t border-[#2A3A55] pt-4 admin-light:border-[#E2E8F0]">
          <h3 id="edit-personnel-license-heading" className="mb-3 flex items-center gap-2 text-sm font-semibold text-white admin-light:text-slate-900">
            <IdCard size={16} aria-hidden="true" className="text-slate-400 admin-light:text-slate-500" />
            Driver&apos;s license
          </h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
            <div>
              <label htmlFor="license_number" className="mb-1.5 block text-xs font-medium text-slate-300 admin-light:text-slate-700">
                License number <span className="text-red-400 admin-light:text-red-600">*</span>
              </label>
              <input
                type="text"
                id="license_number"
                name="license_number"
                value={formData.license_number}
                onChange={handleChange}
                required
                disabled={isSubmitting || isLoadingMeta || !isRecordReady}
                placeholder="e.g. N01-23-045678"
                maxLength={13}
                pattern="[A-Z][0-9]{2}-[0-9]{2}-[0-9]{6}"
                title="Use the LTO format N01-23-045678"
                className={inputClasses + (fieldErrors.license_number ? ' border-red-500/50' : '')}
              />
              {fieldErrors.license_number && (
                <p className="mt-1 text-xs text-red-400 admin-light:text-red-600">{fieldErrors.license_number[0]}</p>
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
                  disabled={isSubmitting || isLoadingMeta || !isRecordReady}
                  className="flex min-h-11 w-full items-center gap-2 rounded-lg border border-dashed border-[#2A3A55] bg-[#0E1628]/60 px-3 py-2 text-xs text-slate-300 transition-colors hover:bg-[#131C2E] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#62A0EA] disabled:opacity-50 admin-light:border-slate-300 admin-light:bg-slate-50 admin-light:text-slate-700 admin-light:hover:bg-white"
                >
                  {preview ? (
                    // Local file preview; it is not a remote image for Next.js optimization.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={preview} alt={label + ' license preview'} className="h-7 w-10 shrink-0 rounded object-contain" />
                  ) : <Upload size={16} aria-hidden="true" className="shrink-0 text-[#99C1F1] admin-light:text-[#1A5FB4]" />}
                  {preview ? 'Change ' + label.toLowerCase() : 'Upload ' + label.toLowerCase()}
                </button>
                {preview && (
                  <button type="button" onClick={() => removeLicenseImage(side)} disabled={isSubmitting || isLoadingMeta} className="mt-2 flex items-center gap-1 text-xs text-red-400 transition-colors hover:text-red-300 disabled:opacity-50 admin-light:text-red-600 admin-light:hover:text-red-700">
                    <X size={12} aria-hidden="true" /> Remove {label.toLowerCase()}
                  </button>
                )}
              </div>
            ))}
          </div>
        </section>
        )}

        </fieldset>
        ) : null}

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
            disabled={isSubmitting || isLoadingMeta || !isRecordReady}
            className="flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#62A0EA] px-4 py-2.5 text-sm font-semibold text-[#0B1120] transition-colors hover:bg-[#85B6F0] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#62A0EA] disabled:cursor-not-allowed disabled:opacity-50 admin-light:bg-[#1A5FB4] admin-light:text-white admin-light:hover:bg-[#164A8F]"
          >
            {isSubmitting ? <Loader2 size={16} aria-hidden="true" className="animate-spin" /> : <Save size={16} aria-hidden="true" />}
            {isSubmitting ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
