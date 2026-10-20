// components/admin/users/add-registration-modal.tsx
'use client';

import { useRef, useState } from 'react';
import { Modal } from '@/components/admin/ui/modal';
import { AdminDatePicker } from '@/components/admin/ui/admin-date-picker';
import { Upload, Loader2, AlertCircle, UserPlus, Check } from 'lucide-react';
import { formatContactNumberInput } from '@/lib/utils/format';
import { StepContentWrapper } from '@/components/Stepper';
import { useDiscountProof } from '@/components/commuter/discount-proof-fields';
import { EDUCATION_LABELS, ENROLLMENT_TERMS, HIGH_SCHOOL_GRADES, type EducationLevel } from '@/lib/shared/services/student-renewal.service';

/** School details for a Student, matching what student renewal asks for. */
export interface OnsiteStudentDetails {
  schoolName: string;
  educationLevel: EducationLevel;
  gradeLevel: string;
  schoolYear: string;
  enrollmentTerm: string;
}

type StepKey = 'details' | 'school' | 'account';

const STEP_LABELS: Record<StepKey, string> = {
  details: 'Commuter details',
  school: 'School details',
  account: 'Account & review',
};

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
    /** Set only when the commuter type is Student. */
    studentDetails: OnsiteStudentDetails | null;
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
  // Field state for the school details, shared with student renewal.
  const proof = useDiscountProof();
  const isStudent = formData.commuterType === 'Student';
  const currentYear = new Date().getFullYear();
  // School details is a step only for a Student; everyone else has two.
  const steps: StepKey[] = isStudent ? ['details', 'school', 'account'] : ['details', 'account'];
  const [stepKey, setStepKey] = useState<StepKey>('details');
  const [direction, setDirection] = useState(0);
  const stepIndex = Math.max(0, steps.indexOf(stepKey));
  const isLastStep = stepIndex === steps.length - 1;
  const goToStep = (key: StepKey) => {
    setDirection(steps.indexOf(key) > stepIndex ? 1 : -1);
    setStepKey(key);
  };

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
    if (!formData.birthday) {
      setSubmitError('Select a date of birth to continue.');
      if (stepKey !== 'details') goToStep('details');
      return;
    }
    // Only the current step's fields are rendered, so reaching here means the
    // browser's required-field check passed for its native inputs.
    if (!isLastStep) {
      setSubmitError(null);
      goToStep(steps[stepIndex + 1]);
      return;
    }
    if (uploadError || !formData.idImageFile) {
      setUploadError(uploadError ?? 'Upload a valid ID image to continue.');
      return;
    }
    if (isStudent && (proof.incomplete || !proof.educationLevel)) {
      setSubmitError('Complete the school details for a Student.');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);
    try {
      await onSave({
        ...formData,
        studentDetails: isStudent && proof.educationLevel
          ? {
              schoolName: proof.schoolName.trim(),
              educationLevel: proof.educationLevel,
              gradeLevel: proof.educationLevel === 'HIGH_SCHOOL' ? proof.gradeLevel : '',
              schoolYear: proof.schoolYear.trim(),
              enrollmentTerm: proof.term.trim(),
            }
          : null,
      });
      proof.setSchoolName('');
      proof.setEducationLevel('');
      proof.setGradeLevel('');
      proof.setSchoolYear('');
      proof.setTerm('');
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
      setDirection(0);
      setStepKey('details');
    } catch (err) {
      // Keep the modal open so the admin can read the error + retry/abort.
      setSubmitError(err instanceof Error ? err.message : 'Failed to create registration.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputClasses = 'mt-1.5 block h-11 w-full rounded-md border border-[#1E2D45] admin-light:border-[#E2E8F0] bg-[#0E1628] admin-light:bg-[#F8FAFC] px-3 text-sm text-white admin-light:text-slate-900 placeholder:text-slate-500 focus:outline-none focus:border-[#62A0EA]/50 admin-light:focus:border-[#1A5FB4]/50 focus:ring-1 focus:ring-[#62A0EA]/30 admin-light:focus:ring-[#1A5FB4]/30 transition-colors disabled:opacity-60';
  const labelClasses = 'block text-xs font-medium text-slate-300 admin-light:text-slate-700';
  const textActionClasses = `text-xs font-medium text-[#62A0EA] admin-light:text-[#1A5FB4] ${isSubmitting ? 'pointer-events-none opacity-60' : 'cursor-pointer hover:text-[#8CB9F0] admin-light:hover:text-[#164A8F]'}`;
  const emailTarget = formData.email.trim();
  const fullName = [formData.firstName, formData.middleName, formData.lastName].map(part => part.trim()).filter(Boolean).join(' ');
  // Parsed as a local date so the review never shifts a day across time zones.
  const birthdayLabel = formData.birthday
    ? new Date(`${formData.birthday}T00:00:00`).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })
    : '';
  const schoolSummary = [
    proof.educationLevel ? EDUCATION_LABELS[proof.educationLevel] : '',
    proof.educationLevel === 'HIGH_SCHOOL' && proof.gradeLevel ? `Grade ${proof.gradeLevel}` : '',
    proof.term.trim(),
    proof.schoolYear.trim() ? `S.Y. ${proof.schoolYear.trim()}` : '',
  ].filter(Boolean).join(', ');

  return (
    <Modal adminThemed isOpen={isOpen} onClose={isSubmitting ? () => {} : onClose} maxWidth="max-w-5xl">
      <div>
        <div className="mb-6 border-b border-[#2A3A55] admin-light:border-[#E2E8F0] pb-5 pr-8">
          <div className="mb-2 flex items-center gap-2.5">
            <UserPlus size={21} className="shrink-0 text-[#62A0EA] admin-light:text-[#1A5FB4]" aria-hidden="true" />
            <h2 className="text-lg sm:text-xl font-bold text-white admin-light:text-slate-900">Onsite Commuter Registration</h2>
          </div>
          <p className="text-sm leading-relaxed text-slate-400 admin-light:text-slate-500">Creates an active commuter account. A default password is emailed to the commuter, who must change it the first time they sign in.</p>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Inline error banner — shown when the POST /api/admin/registrations fails */}
          {submitError && (
            <div role="alert" className="mb-6 p-3 bg-red-500/10 border border-red-500/30 rounded-md flex items-start gap-2">
              <AlertCircle size={16} className="text-red-400 admin-light:text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-400 admin-light:text-red-600">{submitError}</p>
            </div>
          )}

          {/* ID beside the form: staff copy the name and birthdate off the ID
              while typing, so it stays in view. Stacks with the ID first. */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] md:gap-8">
          <section aria-labelledby="onsite-id-heading" className="space-y-3 md:sticky md:top-0 md:self-start">
            <div>
              <h3 id="onsite-id-heading" className="text-sm font-semibold text-white admin-light:text-slate-900">Valid ID</h3>
              <p id="onsite-id-help" className="mt-1 text-xs leading-relaxed text-slate-400 admin-light:text-slate-500">A clear photo with the name and details readable. JPG, PNG, or WebP, up to 5 MB.</p>
            </div>
            <input ref={fileInputRef} id="reg-id-upload" type="file" className="sr-only" accept="image/jpeg,image/png,image/webp" onChange={handleImageChange} disabled={isSubmitting} aria-label="Upload valid ID" aria-describedby={uploadError ? 'onsite-id-help onsite-id-error' : 'onsite-id-help'} aria-invalid={Boolean(uploadError)} />
            {formData.idImageFile ? (
              <div className="space-y-2">
                <div className="flex aspect-4/3 items-center justify-center overflow-hidden rounded-lg border border-[#2A3A55] admin-light:border-[#E2E8F0] bg-[#0E1628] admin-light:bg-[#F8FAFC]">
                  {formData.idImagePreview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={formData.idImagePreview} alt="Uploaded valid ID preview" className="h-full w-full object-contain" />
                  ) : (
                    <Loader2 size={20} className="animate-spin text-slate-500" aria-label="Loading preview" />
                  )}
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="truncate text-xs text-slate-400 admin-light:text-slate-500" title={formData.idImageFile.name}>{formData.idImageFile.name}</span>
                  <div className="flex shrink-0 items-center gap-4">
                    <label htmlFor="reg-id-upload" className={textActionClasses}>Replace</label>
                    <button type="button" onClick={handleRemoveImage} disabled={isSubmitting} className="text-xs font-medium text-slate-400 admin-light:text-slate-500 hover:text-white admin-light:hover:text-slate-900 disabled:opacity-60">Remove</button>
                  </div>
                </div>
              </div>
            ) : (
              <label
                htmlFor="reg-id-upload"
                className={`flex aspect-4/3 w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed bg-[#0E1628] admin-light:bg-[#F8FAFC] px-4 text-center transition-colors ${uploadError ? 'border-red-400/50' : 'border-[#2A3A55] admin-light:border-[#E2E8F0] hover:border-[#62A0EA]/50 admin-light:hover:border-[#1A5FB4]/50'} ${isSubmitting ? 'pointer-events-none opacity-60' : 'cursor-pointer'}`}
              >
                <Upload size={22} className="text-slate-400 admin-light:text-slate-500" aria-hidden="true" />
                <span className="text-sm font-medium text-[#62A0EA] admin-light:text-[#1A5FB4]">Choose ID image</span>
                <span className="text-xs text-slate-500">Required to create the account</span>
              </label>
            )}
            {uploadError && <p id="onsite-id-error" role="alert" className="text-xs text-red-400 admin-light:text-red-600">{uploadError}</p>}
          </section>

          <div className="min-w-0">
          <ol className="mb-6 flex items-center gap-2" aria-label="Registration steps">
            {steps.map((key, i) => {
              const state = i < stepIndex ? 'done' : i === stepIndex ? 'current' : 'next';
              return (
                <li key={key} className="flex min-w-0 flex-1 items-center gap-2 last:flex-none" aria-current={state === 'current' ? 'step' : undefined}>
                  <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border text-xs font-semibold tabular-nums ${
                    state === 'next'
                      ? 'border-[#2A3A55] admin-light:border-[#E2E8F0] text-slate-500'
                      : state === 'done'
                        ? 'border-[#62A0EA]/40 admin-light:border-[#1A5FB4]/40 bg-[#62A0EA]/10 admin-light:bg-[#1A5FB4]/10 text-[#62A0EA] admin-light:text-[#1A5FB4]'
                        : 'border-[#62A0EA] admin-light:border-[#1A5FB4] text-[#62A0EA] admin-light:text-[#1A5FB4]'
                  }`}>
                    {state === 'done' ? <Check size={13} strokeWidth={2.4} aria-hidden="true" /> : i + 1}
                  </span>
                  <span className={`truncate text-xs font-medium ${state === 'next' ? 'text-slate-500' : 'text-white admin-light:text-slate-900'}`}>
                    {STEP_LABELS[key]}
                    {state === 'done' && <span className="sr-only"> (done)</span>}
                  </span>
                  {i < steps.length - 1 && <span aria-hidden="true" className="h-px min-w-4 flex-1 bg-[#2A3A55] admin-light:bg-[#E2E8F0]" />}
                </li>
              );
            })}
          </ol>

          <StepContentWrapper currentStep={stepIndex + 1} direction={direction}>
          {/* Padding keeps focus rings inside the clipping wrapper. */}
          <div className="px-1 pb-1">
          {stepKey === 'details' && (
          <section aria-labelledby="onsite-personal-heading" className="space-y-4">
            <div>
              <h3 id="onsite-personal-heading" className="text-sm font-semibold text-white admin-light:text-slate-900">Commuter details</h3>
              <p className="mt-1 text-xs text-slate-400 admin-light:text-slate-500">Use the name shown on the valid ID. All fields are required unless marked optional.</p>
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
                <AdminDatePicker
                  id="onsite-birthday"
                  value={formData.birthday}
                  onChange={(birthday) => {
                    setFormData((previous) => ({ ...previous, birthday }));
                    if (birthday) setSubmitError(null);
                  }}
                  ariaLabel="Date of birth"
                  clearLabel="Clear date of birth"
                  disabled={isSubmitting}
                  popover
                  yearNavigation
                  className="w-full"
                  triggerClassName="mt-1.5 h-11 w-full text-sm"
                />
              </div>
              <div>
                <label htmlFor="onsite-commuter-type" className={labelClasses}>Commuter type</label>
                <select id="onsite-commuter-type" name="commuterType" value={formData.commuterType} onChange={handleChange} disabled={isSubmitting} className={`${inputClasses} scheme-dark admin-light:scheme-light`}>
                  <option value="Regular" className="bg-gray-800 admin-light:bg-white">Regular</option>
                  <option value="Student" className="bg-gray-800 admin-light:bg-white">Student</option>
                  <option value="Senior Citizen" className="bg-gray-800 admin-light:bg-white">Senior Citizen</option>
                  <option value="PWD" className="bg-gray-800 admin-light:bg-white">PWD</option>
                </select>
              </div>
            </div>
          </section>
          )}

          {stepKey === 'school' && (
            <section aria-labelledby="onsite-school-heading" className="space-y-4">
              <div>
                <h3 id="onsite-school-heading" className="text-sm font-semibold text-white admin-light:text-slate-900">School details</h3>
                <p className="mt-1 text-xs text-slate-400 admin-light:text-slate-500">The same details the commuter gives when renewing their student status each year.</p>
              </div>
              <div>
                <label htmlFor="onsite-school" className={labelClasses}>School</label>
                <input id="onsite-school" type="text" required maxLength={150} autoComplete="off" value={proof.schoolName} onChange={e => proof.setSchoolName(e.target.value)} disabled={isSubmitting} placeholder="Name of the school or university" className={inputClasses} />
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
                <fieldset disabled={isSubmitting} className="min-w-0 disabled:opacity-60">
                  <legend className={labelClasses}>Education level</legend>
                  <div className="mt-1.5 grid grid-cols-2 gap-2">
                    {(Object.keys(EDUCATION_LABELS) as EducationLevel[]).map(level => (
                      <label key={level} className={`flex h-11 items-center justify-center rounded-md border px-3 text-sm font-medium transition-colors has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-[#62A0EA] ${isSubmitting ? '' : 'cursor-pointer'} ${proof.educationLevel === level ? 'border-[#62A0EA]/60 bg-[#62A0EA]/10 text-white admin-light:border-[#1A5FB4]/60 admin-light:bg-[#1A5FB4]/10 admin-light:text-[#1A5FB4]' : 'border-[#1E2D45] admin-light:border-[#E2E8F0] bg-[#0E1628] admin-light:bg-[#F8FAFC] text-slate-300 admin-light:text-slate-600 hover:text-white admin-light:hover:text-slate-900'}`}>
                        <input type="radio" name="onsite_education_level" value={level} required checked={proof.educationLevel === level} onChange={() => { proof.setEducationLevel(level); if (level === 'COLLEGE') proof.setGradeLevel(''); }} className="sr-only" />
                        {EDUCATION_LABELS[level]}
                      </label>
                    ))}
                  </div>
                </fieldset>
                {proof.educationLevel === 'HIGH_SCHOOL' && (
                  <div>
                    <label htmlFor="onsite-grade" className={labelClasses}>Grade level</label>
                    <select id="onsite-grade" required value={proof.gradeLevel} onChange={e => proof.setGradeLevel(e.target.value)} disabled={isSubmitting} className={`${inputClasses} scheme-dark admin-light:scheme-light`}>
                      <option value="" disabled className="bg-gray-800 admin-light:bg-white">Select grade</option>
                      {HIGH_SCHOOL_GRADES.map(grade => <option key={grade} value={grade} className="bg-gray-800 admin-light:bg-white">Grade {grade}</option>)}
                    </select>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
                <div>
                  <label htmlFor="onsite-school-year" className={labelClasses}>School year</label>
                  <input id="onsite-school-year" type="text" required maxLength={20} value={proof.schoolYear} onChange={e => proof.setSchoolYear(e.target.value)} disabled={isSubmitting} placeholder={`For example, ${currentYear}–${currentYear + 1}`} className={inputClasses} />
                </div>
                <div>
                  <label htmlFor="onsite-term" className={labelClasses}>
                    Enrollment term{proof.educationLevel === 'HIGH_SCHOOL' && <span className="font-normal text-slate-500"> (optional)</span>}
                  </label>
                  {/* Optional for high school, so the empty choice stays selectable there. */}
                  <select id="onsite-term" required={proof.educationLevel === 'COLLEGE'} value={proof.term} onChange={e => proof.setTerm(e.target.value)} disabled={isSubmitting} className={`${inputClasses} scheme-dark admin-light:scheme-light`}>
                    <option value="" disabled={proof.educationLevel !== 'HIGH_SCHOOL'} className="bg-gray-800 admin-light:bg-white">{proof.educationLevel === 'HIGH_SCHOOL' ? 'No term' : 'Select term'}</option>
                    {ENROLLMENT_TERMS.map(item => <option key={item} value={item} className="bg-gray-800 admin-light:bg-white">{item}</option>)}
                  </select>
                </div>
              </div>
            </section>
          )}

          {stepKey === 'account' && (
          <div className="space-y-6">
          <section aria-labelledby="onsite-account-heading" className="space-y-4">
            <h3 id="onsite-account-heading" className="text-sm font-semibold text-white admin-light:text-slate-900">Account &amp; contact</h3>
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
                <p id="onsite-password-help" className="mt-2 text-xs leading-relaxed text-slate-400 admin-light:text-slate-500">Confirm the spelling with the commuter. Their default password is sent to this address.</p>
              </div>
            </div>
          </section>

          {/* Review what the earlier steps collected before anything is created. */}
          <section aria-labelledby="onsite-review-heading" className="border-t border-[#2A3A55] admin-light:border-[#E2E8F0] pt-5">
            <h3 id="onsite-review-heading" className="text-sm font-semibold text-white admin-light:text-slate-900">Review</h3>
            <dl className="mt-3 divide-y divide-[#2A3A55] admin-light:divide-[#E2E8F0] text-sm">
              <ReviewRow label="Commuter" onEdit={() => goToStep('details')} disabled={isSubmitting}>
                <span className="block text-white admin-light:text-slate-900">{fullName}</span>
                <span className="block text-slate-400 admin-light:text-slate-500">{formData.commuterType}, born {birthdayLabel}</span>
              </ReviewRow>
              <ReviewRow label="Valid ID" disabled={isSubmitting}>
                {formData.idImageFile ? (
                  <span className="block truncate text-white admin-light:text-slate-900" title={formData.idImageFile.name}>{formData.idImageFile.name}</span>
                ) : (
                  <span className="block text-red-400 admin-light:text-red-600">Not uploaded yet. Choose the ID image on the left.</span>
                )}
              </ReviewRow>
              {isStudent && (
                <ReviewRow label="School" onEdit={() => goToStep('school')} disabled={isSubmitting}>
                  <span className="block text-white admin-light:text-slate-900">{proof.schoolName.trim()}</span>
                  <span className="block text-slate-400 admin-light:text-slate-500">{schoolSummary}</span>
                </ReviewRow>
              )}
            </dl>
          </section>
          </div>
          )}
          </div>
          </StepContentWrapper>
          </div>
          </div>

          <div className="mt-6 flex flex-col gap-3 border-t border-[#2A3A55] admin-light:border-[#E2E8F0] pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="min-w-0 text-xs leading-relaxed text-slate-400 admin-light:text-slate-500">
              {isLastStep ? (
                <>
                  Default password goes to{' '}
                  {emailTarget ? (
                    <span className="break-all font-medium text-slate-200 admin-light:text-slate-800">{emailTarget}</span>
                  ) : (
                    'the email address above'
                  )}
                  .
                </>
              ) : (
                `Step ${stepIndex + 1} of ${steps.length}`
              )}
            </p>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:shrink-0">
              <button
                type="button"
                onClick={stepIndex === 0 ? onClose : () => goToStep(steps[stepIndex - 1])}
                disabled={isSubmitting}
                className="h-11 w-full sm:w-auto px-4 border border-[#2A3A55] admin-light:border-[#E2E8F0] rounded-md text-slate-300 admin-light:text-slate-700 hover:bg-[#1A2540] admin-light:hover:bg-[#EEF2F7] text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {stepIndex === 0 ? 'Cancel' : 'Back'}
              </button>
              <button type="submit" disabled={isSubmitting} className="h-11 w-full sm:w-auto flex items-center justify-center gap-2 px-4 bg-[#62A0EA] admin-light:bg-[#1A5FB4] text-white rounded-md hover:bg-[#4A8BD4] admin-light:hover:bg-[#164A8F] text-sm font-semibold transition-colors disabled:opacity-60 disabled:cursor-not-allowed">
                {isSubmitting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Creating account…
                  </>
                ) : (
                  isLastStep ? 'Create account' : 'Next'
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </Modal>
  );
}

function ReviewRow({ label, onEdit, disabled, children }: { label: string; onEdit?: () => void; disabled: boolean; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-4 py-3">
      <dt className="w-20 shrink-0 text-xs font-medium text-slate-400 admin-light:text-slate-500">{label}</dt>
      <dd className="min-w-0 flex-1 wrap-break-word">{children}</dd>
      {onEdit && (
        <button type="button" onClick={onEdit} disabled={disabled} className="shrink-0 text-xs font-medium text-[#62A0EA] admin-light:text-[#1A5FB4] hover:text-[#8CB9F0] admin-light:hover:text-[#164A8F] disabled:opacity-60">
          Edit<span className="sr-only"> {label.toLowerCase()}</span>
        </button>
      )}
    </div>
  );
}
