// components/admin/vehicles/edit-personnel-modal.tsx
'use client';

import { useState, useRef, useEffect } from 'react';
import { Modal } from '@/components/admin/ui/modal';
import { Upload, Check, User, Save, Phone, IdCard, Calendar } from 'lucide-react';
import type { Personnel } from '@/app/(admin)/vehicles/data/vehicles-data';

// Mirrors the backend's LTO format check (AdminController::updateDriver).
const LICENSE_NUMBER_PATTERN = /^[A-Z][0-9]{2}-[0-9]{2}-[0-9]{6}$/;

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
 *   - Fields: first_name, middle_name, last_name, birthday, profile_picture_url
 *   - NO contact field (conductors don't have one in the schema)
 *   - NO license_number field (conductors don't drive)
 *   - PUTs to /api/admin/conductors/{id}
 *
 * The generated_username + generated_password are NOT editable here
 * (regenerate-credentials is a separate flow).
 */
export function EditPersonnelModal({ isOpen, onClose, onSaved, editingData }: EditPersonnelModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    first_name: '',
    middle_name: '',
    last_name: '',
    birthday: '',
    contact: '',
    license_number: '',
  });

  const [profilePicture, setProfilePicture] = useState<string | null>(null);
  const [useDefaultPicture, setUseDefaultPicture] = useState<boolean>(true);
  const [existingPictureUrl, setExistingPictureUrl] = useState<string | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingMeta, setIsLoadingMeta] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  const isConductor = editingData?.role === 'Conductor';
  const roleLabel = isConductor ? 'Conductor' : 'Driver';

  // When modal opens, fetch the raw record from the API to get all fields
  // (birthday, middle_name, profile_picture_url, and for drivers: license_number,
  // contact) that aren't in the table row's Personnel object.
  //
  // Drivers and conductors both use single-record endpoints so the modal
  // never loads the full personnel dataset.
  useEffect(() => {
    if (!isOpen || !editingData) return;

    setIsLoadingMeta(true);
    setError(null);

    const fetchData = async () => {
      try {
        let raw: Record<string, unknown> | null = null;

        const detailEndpoint = isConductor
          ? `/api/admin/conductors/${editingData.id}`
          : `/api/admin/drivers/${editingData.id}`;

        const res = await fetch(detailEndpoint, {
          headers: { Accept: 'application/json' },
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body?.message ?? `Failed to load ${roleLabel.toLowerCase()} (HTTP ${res.status}).`);
        }
        const json = await res.json();
        raw = json.data ?? null;

        if (raw) {
          setFormData({
            first_name: String(raw.first_name ?? ''),
            middle_name: String(raw.middle_name ?? ''),
            last_name: String(raw.last_name ?? ''),
            birthday: raw.birthday ? String(raw.birthday).split('T')[0] : '',
            contact: String(raw.contact ?? ''),
            // Conductors don't have a license_number — leave blank for them.
            license_number: String(raw.license_number ?? ''),
          });
          setExistingPictureUrl((raw.profile_picture_url as string | null) ?? null);
          setUseDefaultPicture(!raw.profile_picture_url);
          setProfilePicture(null);
        } else {
          setError(`Could not find this ${roleLabel.toLowerCase()} in the database. Please refresh the page and try again.`);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : `Failed to load ${roleLabel.toLowerCase()} data. Please try again.`);
      } finally {
        setIsLoadingMeta(false);
      }
    };

    void fetchData();
  }, [isOpen, editingData, isConductor, roleLabel]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'license_number' ? formatLicenseNumber(value) : value,
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
    setExistingPictureUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!editingData) return;

    if (!editingData.id || editingData.id === 'undefined') {
      setError(`${roleLabel} ID is missing. Close this modal and try again.`);
      return;
    }

    setError(null);
    setFieldErrors({});

    if (!isConductor && !LICENSE_NUMBER_PATTERN.test(formData.license_number)) {
      setFieldErrors({ license_number: ['Use the Philippine LTO format N01-23-045678 (one letter, four digits, then six digits).'] });
      return;
    }

    setIsSubmitting(true);

    try {
      const requestBody: Record<string, unknown> = {
        first_name: formData.first_name,
        last_name: formData.last_name,
        birthday: formData.birthday,
      };

      if (formData.middle_name.trim()) {
        requestBody.middle_name = formData.middle_name.trim();
      }

      // Drivers have contact + license_number; conductors do NOT.
      if (!isConductor) {
        requestBody.contact = formData.contact;
        requestBody.license_number = formData.license_number;
      }

      // Send profile picture only if a new one was uploaded.
      // If the user selected "use default", send null to clear existing.
      if (!useDefaultPicture && profilePicture) {
        requestBody.profile_picture_url = profilePicture;
      } else if (useDefaultPicture) {
        requestBody.profile_picture_url = null;
      }

      const endpoint = isConductor
        ? `/api/admin/conductors/${editingData.id}`
        : `/api/admin/drivers/${editingData.id}`;

      const res = await fetch(endpoint, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 422 && data.errors) {
          // Map backend snake_case to frontend field names for display.
          const mapped: Record<string, string[]> = {};
          for (const field of ['first_name', 'middle_name', 'last_name', 'birthday', 'contact', 'license_number']) {
            if (data.errors[field]) mapped[field] = data.errors[field];
          }
          setFieldErrors(mapped);
          const firstError = (Object.values(data.errors)[0] as string[] | undefined)?.[0] ?? 'Validation failed.';
          throw new Error(firstError);
        }
        throw new Error(data.message ?? `Failed to update ${roleLabel.toLowerCase()}`);
      }

      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to update ${roleLabel.toLowerCase()}`);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!editingData) return null;

  const inputClasses = "block w-full px-4 py-2.5 bg-[#0E1628] border border-[#1E2D45] rounded-md text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-[#62A0EA] transition-colors";

  // Determine which image to show in the preview.
  const previewSrc = !useDefaultPicture && profilePicture ? profilePicture : existingPictureUrl;

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="max-w-lg">
      <div className="flex items-center gap-3 mb-5">
        <div className="p-2 bg-[#62A0EA]/20 rounded-lg">
          <Save className="text-[#62A0EA]" size={24} />
        </div>
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-white">Edit {roleLabel}</h2>
          <p className="text-xs sm:text-sm text-slate-400">Update {roleLabel.toLowerCase()} details. ID: <span className="font-mono">{editingData.id.slice(0, 8)}…</span></p>
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
            {previewSrc ? (
              <img src={previewSrc} alt="Preview" className="w-full h-full object-cover" />
            ) : (
              <User className="text-slate-600" size={32} />
            )}
          </div>

          <div className="flex-1 space-y-2">
            <input type="file" ref={fileInputRef} accept="image/*" onChange={handleImageChange} className="hidden" disabled={isSubmitting || isLoadingMeta} />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isSubmitting || isLoadingMeta}
              className="w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-[#0E1628] border border-[#1E2D45] rounded-md text-sm text-slate-300 hover:bg-[#1A2540] hover:text-white transition-colors active:scale-[0.98] disabled:opacity-50"
            >
              <Upload size={16} />
              Change Photo
            </button>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer group">
                <div
                  onClick={() => { setUseDefaultPicture(!useDefaultPicture); if(profilePicture) setProfilePicture(null); if(existingPictureUrl) setExistingPictureUrl(null); }}
                  className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${useDefaultPicture ? 'bg-[#62A0EA] border-[#62A0EA]' : 'border-[#1E2D45] group-hover:border-[#2A3A55]'}`}
                >
                  {useDefaultPicture && <Check size={12} className="text-white" />}
                </div>
                <span className="text-xs text-slate-500 group-hover:text-slate-300 transition-colors">
                  Use default picture
                </span>
              </label>

              {!useDefaultPicture && (profilePicture || existingPictureUrl) && (
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
            <label htmlFor="edit-first_name" className="block text-xs font-medium text-slate-300 mb-1.5">
              First Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              id="edit-first_name"
              name="first_name"
              value={formData.first_name}
              onChange={handleChange}
              required
              disabled={isSubmitting || isLoadingMeta}
              className={`${inputClasses} ${fieldErrors.first_name ? 'border-red-500/50' : ''}`}
            />
            {fieldErrors.first_name && <p className="text-xs text-red-400 mt-1">{fieldErrors.first_name[0]}</p>}
          </div>
          <div>
            <label htmlFor="edit-last_name" className="block text-xs font-medium text-slate-300 mb-1.5">
              Last Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              id="edit-last_name"
              name="last_name"
              value={formData.last_name}
              onChange={handleChange}
              required
              disabled={isSubmitting || isLoadingMeta}
              className={`${inputClasses} ${fieldErrors.last_name ? 'border-red-500/50' : ''}`}
            />
            {fieldErrors.last_name && <p className="text-xs text-red-400 mt-1">{fieldErrors.last_name[0]}</p>}
          </div>
        </div>

        <div>
          <label htmlFor="edit-middle_name" className="block text-xs font-medium text-slate-300 mb-1.5">Middle Name</label>
          <input
            type="text"
            id="edit-middle_name"
            name="middle_name"
            value={formData.middle_name}
            onChange={handleChange}
            disabled={isSubmitting || isLoadingMeta}
            placeholder="Optional"
            className={`${inputClasses} ${fieldErrors.middle_name ? 'border-red-500/50' : ''}`}
          />
          {fieldErrors.middle_name && <p className="text-xs text-red-400 mt-1">{fieldErrors.middle_name[0]}</p>}
        </div>

        {/* License Number — drivers only (conductors don't drive) */}
        {!isConductor && (
          <div>
            <label htmlFor="edit-license_number" className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center gap-2">
              <IdCard size={14} /> Driver&apos;s License Number <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              id="edit-license_number"
              name="license_number"
              value={formData.license_number}
              onChange={handleChange}
              required
              disabled={isSubmitting || isLoadingMeta}
              placeholder="e.g. N01-23-045678"
              maxLength={13}
              pattern="[A-Z][0-9]{2}-[0-9]{2}-[0-9]{6}"
              title="Use the LTO format N01-23-045678"
              className={`${inputClasses} ${fieldErrors.license_number ? 'border-red-500/50' : ''}`}
            />
            {fieldErrors.license_number && <p className="text-xs text-red-400 mt-1">{fieldErrors.license_number[0]}</p>}
          </div>
        )}

        {/* Birthday */}
        <div>
          <label htmlFor="edit-birthday" className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center gap-2">
            <Calendar size={14} /> Birth Date <span className="text-red-400">*</span>
          </label>
          <input
            type="date"
            id="edit-birthday"
            name="birthday"
            value={formData.birthday}
            onChange={handleChange}
            required
            disabled={isSubmitting || isLoadingMeta}
            className={`${inputClasses} [color-scheme:dark] ${fieldErrors.birthday ? 'border-red-500/50' : ''}`}
          />
          {fieldErrors.birthday && <p className="text-xs text-red-400 mt-1">{fieldErrors.birthday[0]}</p>}
        </div>

        {/* Contact Number — drivers only (conductors have no contact field in the schema) */}
        {!isConductor && (
          <div>
            <label htmlFor="edit-contact" className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center gap-2">
              <Phone size={14} /> Contact Number <span className="text-red-400">*</span>
            </label>
            <input
              type="tel"
              id="edit-contact"
              name="contact"
              value={formData.contact}
              onChange={handleChange}
              required
              disabled={isSubmitting || isLoadingMeta}
              placeholder="e.g. 0917 123 4567"
              className={`${inputClasses} ${fieldErrors.contact ? 'border-red-500/50' : ''}`}
            />
            {fieldErrors.contact && <p className="text-xs text-red-400 mt-1">{fieldErrors.contact[0]}</p>}
          </div>
        )}

        {/* Role is display-only. Route assignment belongs to vehicles. */}
        <div>
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center gap-2">
              <User size={14} /> Role
            </label>
            <select disabled className="block w-full px-4 py-2.5 bg-[#0E1628] border border-[#1E2D45] rounded-md text-slate-500 cursor-not-allowed text-sm [color-scheme:dark]">
              <option className="bg-gray-800">{roleLabel}</option>
            </select>
          </div>
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
            disabled={isSubmitting || isLoadingMeta}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#62A0EA] text-white font-medium rounded-md hover:bg-[#4A8BD4] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save size={16} />
            {isSubmitting ? 'Saving...' : isLoadingMeta ? 'Loading...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
