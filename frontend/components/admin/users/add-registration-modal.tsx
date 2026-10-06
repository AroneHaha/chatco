// components/admin/users/add-registration-modal.tsx
'use client';

import { useRef, useState } from 'react';
import { Modal } from '@/components/admin/ui/modal';
import { Upload, X, Loader2, AlertCircle, UserPlus } from 'lucide-react';
import { formatContactNumberInput } from '@/lib/utils/format';

interface AddRegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Called when the admin submits the form. Can be async — the modal stays
   *  open (with a spinner on the submit button) until the Promise resolves.
   *  If it rejects, the error message is shown inline inside the modal. */
  onSave: (data: {
    firstName: string;
    middleName: string;
    lastName: string;
    birthday: string;
    username: string;
    email: string;
    phoneNumber: string;
    commuterType: string;
    idImageFile: File | null;
    idImagePreview: string | null;
  }) => Promise<void> | void;
}

export function AddRegistrationModal({ isOpen, onClose, onSave }: AddRegistrationModalProps) {
  const [formData, setFormData] = useState({
    firstName: '',
    middleName: '',
    lastName: '',
    birthday: '',
    username: '',
    email: '',
    phoneNumber: '',
    commuterType: 'Regular',
    idImageFile: null as File | null,
    idImagePreview: null as string | null,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageReaderRef = useRef<FileReader | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;

    if (name === 'username') {
      setFormData(prev => ({ ...prev, [name]: value.replace(/\s/g, '') }));
    }
    else if (name === 'phoneNumber') {
      setFormData(prev => ({ ...prev, [name]: formatContactNumberInput(value) }));
    }
    else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setUploadError('Choose a JPG, PNG, or WebP image.');
      e.target.value = '';
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setUploadError('The ID image must be 5 MB or smaller.');
      e.target.value = '';
      return;
    }

    setUploadError(null);
    imageReaderRef.current?.abort();
    setFormData(prev => ({ ...prev, idImageFile: file, idImagePreview: null }));
    const reader = new FileReader();
    imageReaderRef.current = reader;
    reader.onload = () => {
      if (imageReaderRef.current === reader) {
        setFormData(prev => ({ ...prev, idImagePreview: reader.result as string }));
      }
    };
    reader.onerror = () => setUploadError('The image could not be read. Please choose it again.');
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    imageReaderRef.current?.abort();
    imageReaderRef.current = null;
    if (fileInputRef.current) fileInputRef.current.value = '';
    setUploadError(null);
    setFormData(prev => ({ ...prev, idImageFile: null, idImagePreview: null }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    if (uploadError || !formData.idImageFile) {
      setUploadError(uploadError ?? 'Upload a valid ID image to continue.');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);
    try {
      await onSave(formData);
      // onSave resolved — reset the form + close. The parent will refetch.
      setFormData({
        firstName: '',
        middleName: '',
        lastName: '',
        birthday: '',
        username: '',
        email: '',
        phoneNumber: '',
        commuterType: 'Regular',
        idImageFile: null,
        idImagePreview: null,
      });
      handleRemoveImage();
    } catch (err) {
      // Keep the modal open so the admin can read the error + retry/abort.
      setSubmitError(err instanceof Error ? err.message : 'Failed to create registration.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputClasses = 'mt-1.5 block h-11 w-full rounded-md border border-[#1E2D45] bg-[#0E1628] px-3 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-[#62A0EA]/50 focus:ring-1 focus:ring-[#62A0EA]/30 transition-colors disabled:opacity-60';
  const labelClasses = 'block text-xs font-medium text-slate-300';

  return (
    <Modal isOpen={isOpen} onClose={isSubmitting ? () => {} : onClose} maxWidth="max-w-2xl">
      <div>
        <div className="mb-6 border-b border-[#2A3A55] pb-5 pr-8">
          <div className="mb-2 flex items-center gap-2.5">
            <UserPlus size={21} className="shrink-0 text-[#62A0EA]" aria-hidden="true" />
            <h2 className="text-lg sm:text-xl font-bold text-white">Onsite Commuter Registration</h2>
          </div>
          <p className="text-sm leading-relaxed text-slate-400">Register a commuter for verification. Their account will remain pending until approved.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Inline error banner — shown when the POST /api/admin/registrations fails */}
          {submitError && (
            <div role="alert" className="p-3 bg-red-500/10 border border-red-500/30 rounded-md flex items-start gap-2">
              <AlertCircle size={16} className="text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-400">{submitError}</p>
            </div>
          )}

          <section aria-labelledby="onsite-personal-heading" className="space-y-4">
            <div>
              <h3 id="onsite-personal-heading" className="text-sm font-semibold text-white">Commuter details</h3>
              <p className="mt-1 text-xs text-slate-400">Use the name shown on the valid ID. All fields are required unless marked optional.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
              <div>
                <label htmlFor="onsite-first-name" className={labelClasses}>First name</label>
                <input id="onsite-first-name" type="text" name="firstName" autoComplete="given-name" maxLength={100} value={formData.firstName} onChange={handleChange} required disabled={isSubmitting} className={inputClasses} />
              </div>
              <div>
                <label htmlFor="onsite-middle-name" className={labelClasses}>Middle name <span className="font-normal text-slate-500">(optional)</span></label>
                <input id="onsite-middle-name" type="text" name="middleName" autoComplete="additional-name" value={formData.middleName} onChange={handleChange} maxLength={100} disabled={isSubmitting} className={inputClasses} />
              </div>
              <div>
                <label htmlFor="onsite-last-name" className={labelClasses}>Last name</label>
                <input id="onsite-last-name" type="text" name="lastName" autoComplete="family-name" maxLength={100} value={formData.lastName} onChange={handleChange} required disabled={isSubmitting} className={inputClasses} />
              </div>
            </div>

            {/* Birthday & Commuter Type Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label htmlFor="onsite-birthday" className={labelClasses}>Date of birth</label>
                <input id="onsite-birthday" type="date" name="birthday" autoComplete="bday" value={formData.birthday} onChange={handleChange} required disabled={isSubmitting} className={`${inputClasses} scheme-dark`} />
              </div>
              <div>
                <label htmlFor="onsite-commuter-type" className={labelClasses}>Commuter type</label>
                <select id="onsite-commuter-type" name="commuterType" value={formData.commuterType} onChange={handleChange} disabled={isSubmitting} className={`${inputClasses} scheme-dark`}>
                  <option value="Regular" className="bg-gray-800">Regular</option>
                  <option value="Student" className="bg-gray-800">Student</option>
                  <option value="Senior Citizen" className="bg-gray-800">Senior Citizen</option>
                  <option value="PWD" className="bg-gray-800">PWD</option>
                </select>
              </div>
            </div>
          </section>

          <section aria-labelledby="onsite-account-heading" className="space-y-4 border-t border-[#2A3A55] pt-5">
            <h3 id="onsite-account-heading" className="text-sm font-semibold text-white">Account &amp; contact</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label htmlFor="onsite-username" className={labelClasses}>Username</label>
                <input id="onsite-username" type="text" name="username" autoComplete="off" autoCapitalize="none" spellCheck={false} maxLength={50} value={formData.username} onChange={handleChange} required disabled={isSubmitting} placeholder="e.g. juan.delacruz" className={inputClasses} />
              </div>
              <div>
                <label htmlFor="onsite-phone" className={labelClasses}>Mobile number</label>
                <input
                  id="onsite-phone"
                  type="tel"
                  autoComplete="tel-national"
                  name="phoneNumber"
                  value={formData.phoneNumber}
                  onChange={handleChange}
                  required
                  disabled={isSubmitting}
                  placeholder="09171234567"
                  maxLength={11}
                  pattern="09[0-9]{9}"
                  title="Enter an 11-digit mobile number starting with 09 (e.g. 09171234567)"
                  className={inputClasses}
                />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="onsite-email" className={labelClasses}>Email address</label>
                <input id="onsite-email" type="email" name="email" autoComplete="email" autoCapitalize="none" maxLength={255} value={formData.email} onChange={handleChange} required disabled={isSubmitting} placeholder="commuter@example.com" aria-describedby="onsite-password-help" className={inputClasses} />
                <p id="onsite-password-help" className="mt-2 text-xs leading-relaxed text-slate-400">After approval, the commuter can use <span className="text-slate-200">Forgot password</span> with this email to set their password.</p>
              </div>
            </div>
          </section>

          <section aria-labelledby="onsite-id-heading" className="space-y-3 border-t border-[#2A3A55] pt-5">
            <div>
              <h3 id="onsite-id-heading" className="text-sm font-semibold text-white">Valid ID</h3>
              <p id="onsite-id-help" className="mt-1 text-xs leading-relaxed text-slate-400">Upload a clear photo with the commuter&apos;s name and details visible. JPG, PNG, or WebP, up to 5 MB.</p>
            </div>
            <input ref={fileInputRef} id="reg-id-upload" type="file" className="sr-only" accept="image/jpeg,image/png,image/webp" onChange={handleImageChange} disabled={isSubmitting} aria-label="Upload valid ID" aria-describedby={uploadError ? 'onsite-id-help onsite-id-error' : 'onsite-id-help'} aria-invalid={Boolean(uploadError)} />
            <div className={`flex justify-center rounded-lg border border-dashed bg-[#0E1628] p-4 transition-colors ${uploadError ? 'border-red-400/50' : 'border-[#2A3A55] hover:border-[#62A0EA]/50'}`}>
              {formData.idImagePreview ? (
                <div className="w-full">
                  <div className="relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={formData.idImagePreview} alt="Uploaded valid ID preview" className="h-36 w-full object-contain rounded-md" />
                    <button type="button" aria-label="Remove ID image" onClick={handleRemoveImage} disabled={isSubmitting} className="absolute top-0 right-0 p-1.5 border border-[#2A3A55] bg-[#131C2E] text-slate-300 rounded-md hover:text-white disabled:opacity-50">
                      <X size={14} />
                    </button>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <span className="truncate text-xs text-slate-400" title={formData.idImageFile?.name}>{formData.idImageFile?.name}</span>
                    <label htmlFor="reg-id-upload" className={`shrink-0 text-xs font-medium text-[#62A0EA] ${isSubmitting ? 'pointer-events-none opacity-60' : 'cursor-pointer hover:text-[#8CB9F0]'}`}>Replace image</label>
                  </div>
                </div>
              ) : (
                <label htmlFor="reg-id-upload" className={`flex w-full items-center justify-center gap-3 py-3 text-sm font-medium text-[#62A0EA] ${isSubmitting ? 'pointer-events-none opacity-60' : 'cursor-pointer'}`}>
                  <Upload size={20} aria-hidden="true" />
                  <span>Choose ID image</span>
                </label>
              )}
            </div>
            {uploadError && <p id="onsite-id-error" role="alert" className="text-xs text-red-400">{uploadError}</p>}
          </section>

          {/* Buttons */}
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 border-t border-[#2A3A55] pt-4">
            <button type="button" onClick={onClose} disabled={isSubmitting} className="h-11 w-full sm:w-auto px-4 border border-[#2A3A55] rounded-md text-slate-300 hover:bg-[#1A2540] text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting} className="h-11 w-full sm:w-auto flex items-center justify-center gap-2 px-4 bg-[#62A0EA] text-white rounded-md hover:bg-[#4A8BD4] text-sm font-semibold transition-colors disabled:opacity-60 disabled:cursor-not-allowed">
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Submitting…
                </>
              ) : (
                'Submit Request'
              )}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
